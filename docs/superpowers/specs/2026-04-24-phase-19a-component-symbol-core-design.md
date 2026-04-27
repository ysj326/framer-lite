# Phase 19a — 컴포넌트 심볼 시스템 (핵심 모델) 설계

> 브레인스토밍 결과 문서. 구현 플랜은 동명의 plan 문서에서 별도로 관리한다.

## 목적

framer-lite에 Figma/Framer 스타일 컴포넌트 심볼 시스템을 도입한다. Phase 19 전체를 한 번에 구현하기에는 규모가 커, 다음과 같이 단계 분할한다.

| 단계 | 주제 | Figma/Framer 대응 | MVP? |
|---|---|---|---|
| **19a** | 핵심 모델 + Frame → Master 변환 | Figma "Create component" 기초 | ✅ |
| 19b | Propagation + 명시적 property 노출 | Figma Component Properties / Framer Variables | ✅ |
| 19c | 다중 선택 → 심볼화 | Figma 변환 플로우 | ✅ |
| 19d | Assets 패널 + 우클릭 컨텍스트 메뉴 | Figma Assets 탭 | ✅ |
| 19e | Variants | Framer/Figma Variants | ⏳ 선택 |
| 19f | Nesting | Figma Nested components | ⏳ 선택 |

본 문서는 **19a** 범위만 다룬다.

## 핵심 결정 (의사결정 트레이스)

| 질문 | 결정 | 이유 |
|---|---|---|
| 심볼 모델 | **C — Propagation + 명시적 property 노출** (최종 목표) | Figma Component Properties / Framer Variables의 실제 동작과 동형. 19b에서 완성. |
| 19a 대상 범위 | **Frame만 심볼화 가능** | 현재 데이터 모델에서 Frame이 유일한 컨테이너. 단일 노드·다중 선택은 19c에서. |
| Master 저장 위치 | `Project.masters: Record<string, Master>` **최상위 필드 신설** | 페이지 노드와 "재사용 정의" 구조적 분리, Figma document schema와 동형, 직렬화·마이그레이션 단순. |
| Instance 표현 | AppNode 유니온에 **새 NodeType `'instance'` 추가** | Phase 18 rotation 추가와 동일한 태그드 유니온 확장 패턴. `type === 'instance'` narrowing으로 분기 명확. |
| 변환 UX (진입점) | **PropertiesPanel "Create Component" 버튼 + `Cmd+Alt+K` 단축키** | 우클릭 메뉴는 19a 시점에 미존재 → Phase 19d에서 Assets 패널과 함께 도입. |
| Instance 내부 접근 (19a) | **블랙박스 (A)** — 내부 자식 LayersPanel 표시 X, 캔버스 선택 X | 19a는 override 없음 → 내부 자식이 보이거나 선택돼도 조작 불가 → UX 노이즈만 발생. 19b에서 "override + 내부 접근"을 한 단위로 도입. |
| Instance 리사이즈 (19a) | **가능, 내부 자식 좌표 그대로 (B)** | constraints 시스템 부재. 예측 가능한 동작. 필요 시 후속 Phase에서 도입. |

## 데이터 모델

### `src/types/project.ts` — Project 확장

```ts
interface Project {
  version: 1
  name: string
  page: Page
  nodes: Record<string, AppNode>
  masters: Record<string, Master>   // ← 신규
  updatedAt: number
}
```

### `src/types/master.ts` — 신규 파일

```ts
interface Master {
  id: string                          // nanoid
  name: string                        // "Card", "Hero" 등
  rootId: string                      // master 내부 루트 Frame 노드 id
  nodes: Record<string, AppNode>      // master 고유 namespace
  createdAt: number                   // epoch ms
  updatedAt: number                   // epoch ms
}
```

- `nodes`는 **master 자체 namespace**이다. `page.nodes`와 id 공간이 분리되며, 같은 id가 양쪽에 존재해도 런타임상 섞일 일이 없다 (두 Record는 독립 조회됨).
- `rootId`는 반드시 `nodes[rootId]`에 존재해야 하고, 해당 노드의 `type`은 `'frame'`이다.
- master 내부에서는 추가 instance 참조를 허용하지 않는다 (Nesting은 19f). 변환 로직에서 subtree를 옮길 때 `type === 'instance'` 노드가 포함돼 있으면 런타임 에러를 던진다.

### `src/types/node.ts` — InstanceNode 신규

```ts
interface InstanceNode extends BaseNode {
  type: 'instance'
  data: {
    masterId: string                      // 반드시 Project.masters에 존재
    overrides: Record<string, never>      // 19a에선 항상 빈 객체 (19b에서 정의 확장)
  }
}

type AppNode = TextNode | ImageNode | ButtonNode | FrameNode | ShapeNode | InstanceNode
```

- Instance는 `childIds = []` 유지한다 (master 트리를 참조만 할 뿐, 자식을 직접 소유하지 않는다).
- Instance는 자기 `x, y, width, height, rotation, zIndex, visible, locked, style`을 그대로 가진다. Instance의 `style`은 19a에서는 사용하지 않지만(내부 노드 스타일은 master가 갖고 있음) 필드는 BaseNode 상속으로 유지된다.

## 변환 플로우 (Frame → Component)

### 진입점

| 경로 | 조건 |
|---|---|
| PropertiesPanel 상단 "Create Component" 버튼 | 선택된 단일 노드의 type이 `'frame'`일 때만 노출 |
| `Cmd+Alt+K` (Mac) / `Ctrl+Alt+K` (Windows) 단축키 | 동일 조건. `useShortcuts` 기존 키와 충돌하지 않는지 구현 시 확인 |

### 동작 순서

1. 선택 Frame의 `frameId`와 subtree(자식 + 자손) 수집
2. 새 `masterId` 발급 (`nanoid`)
3. `masters[masterId]` 생성
   - `name`: 원본 Frame의 `name`. 중복 시 `"Card (1)", "Card (2)" ...` suffix로 자동 고유화
   - `rootId`: 원본 Frame의 id (재사용)
   - `nodes`: 원본 Frame과 모든 자손 노드를 **그대로 옮김** (id는 그대로 유지)
   - `createdAt`, `updatedAt`: `Date.now()`
4. `page.nodes`에서 원본 Frame과 모든 자손 제거
5. 같은 `frameId`를 재사용해 **InstanceNode**를 `page.nodes`에 삽입
   - id 재사용 이유: Undo 후에도 동일 id로 복원돼 UX 일관성 유지. master namespace와는 독립이므로 충돌 없음.
   - `x, y, width, height, rotation, zIndex, visible, locked, parentId` = 원본 Frame 값 승계
   - `style`: `{}` (빈 객체)
   - `data`: `{ masterId, overrides: {} }`
   - `name`: master 이름과 동일
6. 선택 상태 유지 (`frameId` 그대로 선택됨)
7. history `commit` (변환 직전 스냅샷을 past에 push)

### 시각적 불변

변환 전/후 캔버스 화면은 **완전히 동일**해야 한다 (화면 unchanged, 내부 모델만 변경).

## 렌더링

### `src/components/editor/nodes/InstanceNode.vue` — 신규

- props: 일반 Node 렌더와 동일한 인터페이스 + `instance: InstanceNode`
- 동작:
  1. `projectStore`(또는 editorStore)에서 `masters[instance.data.masterId]` 조회
  2. master가 없으면 회색 placeholder + `"Missing master: {masterId}"` 텍스트 표시
  3. master가 있으면 `master.nodes[master.rootId]`부터 재귀적으로 **master 트리 전체를 렌더**
     - 재귀 렌더 시 루트 Frame의 `x, y, width, height, rotation`은 무시하고 **Instance의 값**을 사용 (컨테이너로서의 위치·크기는 Instance가 정함)
     - 자손 노드는 master 내부에 저장된 상대 좌표 그대로 사용 (B 정책 — Instance 리사이즈해도 자식은 그대로)

### LayersPanel

- InstanceNode는 **펼침 불가 leaf 노드**로 표시한다
  - 접힘/펼침 caret 숨김
  - 아이콘: 다이아몬드 ◆ (Figma 컴포넌트 관례)
  - 라벨: Instance의 `name` (= master 이름)
- 선택/이름변경/삭제/visibility 토글은 일반 노드처럼 동작

### MoveableWrapper

- Instance는 일반 노드처럼 drag / resize / rotate 가능 (B 정책)
- 내부 자식은 Moveable 대상 아님 (선택 불가, 19a)

## JSON 직렬화 & 마이그레이션

### 저장 (`src/utils/serialize.ts`)

- `Project` 직렬화 시 `masters` 필드 그대로 포함
- `InstanceNode` 직렬화는 AppNode 유니온 처리에 자동 포함 (타입 분기 불필요)

### 로드

- `masters` 필드가 없는 구버전 JSON을 읽으면 **`masters: {}` 기본값 주입** (무경고 마이그레이션)
- 각 master에 대해 런타임 검증:
  - 필수 필드 (`id, name, rootId, nodes, createdAt, updatedAt`) 존재 여부
  - `nodes[rootId]` 존재 및 `type === 'frame'`
  - 위반 시 **해당 master만 드롭**, 나머지 프로젝트는 계속 로드
- Instance 노드가 없는 master를 참조해도 로드 자체는 성공 (렌더 시 missing placeholder)

## HTML Export

### `src/utils/htmlExport.ts` — inline expand 방식

- 트리 순회 중 InstanceNode를 만나면:
  1. `masters[masterId]` 조회
  2. master가 없으면 `<!-- missing master: {id} -->` 주석 + 빈 `<div>` fallback
  3. master가 있으면 master의 root Frame을 **Instance 위치에** 인라인 전개하여 출력
     - 루트 Frame의 위치·크기는 Instance의 값 사용
     - 자손은 master 내부 상대 좌표 그대로
- CSS class 재사용 패턴은 유지 (동일 style 블록은 한 번만 정의)
- 재귀 깊이 상한: 32 (19a에선 실제로 발생 불가, 19f Nesting 대비 안전장치)

## Undo/Redo

### `src/stores/history.ts` — Snapshot 확장

```ts
interface EditorSnapshot {
  nodes: Record<string, AppNode>
  page: Page
  masters: Record<string, Master>     // 신규
}
```

- editor store의 `commit` 호출부는 `masters`를 함께 스냅샷에 포함해야 한다.
- "Create Component" 변환은 **단일 undo 단위**로 커밋된다.
- Undo → Frame이 원래대로 복원, `masters`에서 해당 master 제거
- Redo → 다시 Instance로 치환 + master 재등록

## 테스트 전략 (TDD)

TDD Red→Green→Refactor 사이클 유지.

### 유닛 (`vitest`)

- `masters.spec.ts` (신규 store): createMaster / 이름 중복 suffix 생성 / 조회
- `serialize.spec.ts`: masters 포함 왕복 / 구버전 JSON 마이그레이션 / 손상 master 드롭
- `htmlExport.spec.ts`: Instance 있는 프로젝트가 master 트리를 전개하여 HTML로 나옴 / missing master 주석 fallback
- `nodeTree.spec.ts`: InstanceNode는 childIds 빈 배열 / 순회 시 자식 없음 처리

### 컴포넌트 (`@vue/test-utils` + happy-dom)

- `InstanceNode.spec.ts`: master 트리 재귀 렌더 / missing master placeholder
- `LayersPanel.spec.ts`: Instance는 leaf로 표시 (caret 없음, 다이아몬드 아이콘)
- `PropertiesPanel.spec.ts`: Frame 선택 시 "Create Component" 버튼 노출, 다른 타입에선 숨김
- `useShortcuts.spec.ts`: `Cmd+Alt+K` 로 변환 트리거, Frame 아닌 선택에선 no-op

### 통합

- Frame 생성 → Create Component → 캔버스 픽셀 시각 동일 / page.nodes에 Instance 1개, masters에 Master 1개
- Instance drag·resize → instance 좌표/크기만 변경, master 불변
- Instance 삭제 → page에서 사라지지만 master 유지
- 변환 Undo → Frame 원상복구 + master 제거
- JSON save → reload → 동일 상태 복원
- 구버전 JSON (masters 없음) 로드 → 정상 작동, 빈 masters

## 범위 밖 (19a에 포함하지 않음)

- ❌ Override 시스템 (Phase 19b)
- ❌ Master 편집 모드 (Phase 19b)
- ❌ Instance 내부 자식 표시/선택 (Phase 19b)
- ❌ 다중 선택 → 심볼화 (Phase 19c)
- ❌ Assets 패널 + 우클릭 컨텍스트 메뉴 (Phase 19d)
- ❌ Variants (Phase 19e, 선택적)
- ❌ Nesting (Phase 19f, 선택적)

## 참고 문서 (Figma/Framer 공식, 검증 출처)

- [Figma — Apply changes to instances](https://help.figma.com/hc/en-us/articles/360039150733-Apply-changes-to-instances)
- [Figma — Edit instances with component properties](https://help.figma.com/hc/en-us/articles/8883757553943-Edit-instances-with-component-properties)
- [Figma — Create and manage component properties](https://help.figma.com/hc/en-us/articles/8883756012823-Create-and-manage-component-properties)
- [Framer — Components](https://www.framer.com/support/using-framer/design-components/)
- [Framer — Using Variants and Variables](https://www.framer.com/support/using-framer/component-variants/)
