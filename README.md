# Framer Lite

Vue 3 기반의 노드형 비주얼 웹 에디터. Framer 스타일로 자유롭게 요소를 배치하고, 결과를 단일 HTML 파일로 export할 수 있다.

## 사용 흐름

1. **`/`** — 템플릿 갤러리에서 템플릿 선택 (Blank · Landing · Portfolio)
2. **`/editor`** — 캔버스에서 노드 추가 / 드래그 / 리사이즈 / 속성 편집
3. **`/preview`** — Desktop / Mobile viewport 미리보기
4. **Export HTML** — 단일 .html 파일 다운로드

## 시작하기

요구 환경: **Node 20.19+** 또는 **22.12+**

```sh
npm install
npm run dev          # http://localhost:5173/
npm run build        # type-check + production build
npm run test:run     # 1회 테스트 실행
npm run test         # watch 모드
npm run type-check   # vue-tsc
```

## 단축키

| 키 | 동작 |
|---|---|
| `Cmd / Ctrl + Z` | Undo |
| `Shift + Cmd / Ctrl + Z` | Redo |
| `Cmd / Ctrl + D` | 선택 노드 복제 |
| `Delete` / `Backspace` | 선택 노드 삭제 |
| Click 노드 | 선택 |
| Click 빈 영역 | 선택 해제 |

(에디터 우측 상단 `?` 버튼으로도 확인 가능)

## 폴더 구조

```
src/
  router/index.ts            # / · /editor · /preview
  views/                     # TemplatesView · EditorView · PreviewView
  components/
    editor/                  # Toolbar · Canvas · LayersPanel · PropertiesPanel · MoveableWrapper
      nodes/                 # Text/Image/Button/Frame/Shape SFC
      properties/            # Common/Text/Image/Button/Shape 속성 입력
    preview/                 # PreviewCanvas · ViewportFrame
  stores/
    editor.ts                # Pinia: nodes/page/selection + actions
    history.ts               # Undo/Redo (snapshot + coalesce)
  composables/
    useNodeFactory.ts        # 5가지 노드 팩토리
    useNodeInteraction.ts    # 선택/클릭
    useNodeField.ts          # 속성 양방향 바인딩 helper
    useAutoSave.ts           # localStorage 자동 저장 + 복구
    useShortcuts.ts          # 키보드 단축키
  utils/
    nodeTree.ts              # 트리 조작 (immutable)
    nodePresentation.ts      # 노드 → CSS 매핑
    serialize.ts             # toJSON / fromJSON + version migration
    projectFile.ts           # JSON 다운로드 / File 로드
    htmlExport.ts            # HTML 단일 파일 export
    download.ts              # downloadBlob 공통
  templates/*.json           # blank · landing · portfolio
  styles/                    # SCSS — common/structure/pages/plugins
  types/node.ts · project.ts # 데이터 모델
```

## 데이터 모델 (요지)

```ts
type NodeType = 'text' | 'image' | 'button' | 'frame' | 'shape'

interface BaseNode {
  id: string                 // nanoid
  type: NodeType
  name: string
  parentId: string | null    // null = 페이지 루트
  childIds: string[]         // Frame만 의미
  x: number; y: number       // 부모 기준 좌표
  width: number; height: number
  zIndex: number
  visible: boolean
  locked: boolean
  style: NodeStyle           // backgroundColor/color/fontSize/...
}
// 각 타입은 BaseNode를 extends하고 type/data 추가 (discriminated union)

interface Page {
  id: string; name: string
  width: number; height: number
  background: string
  rootIds: string[]          // z-order의 진실(source of truth)
}

interface Project {
  version: 1
  name: string
  page: Page                 // MVP: 단일 페이지
  nodes: Record<string, AppNode>
  updatedAt: number
}
```

저장 방식:
- **자동**: `localStorage`에 1초 debounce 저장, 새로고침 시 자동 복구
- **수동**: Toolbar의 Save JSON / Load JSON 버튼

Undo/Redo:
- snapshot 기반 + 같은 노드의 빠른 연쇄 변경(`update-${id}` 키)을 500ms 윈도우로 합침 → drag 한 번 = undo 한 번 단위

## HTML Export

`Toolbar → Export HTML` 클릭 시 단일 `.html` 파일 다운로드.
- `<style>` 블록 + `.node-{id}` class 방식
- position absolute + 위치/크기/style을 class에 기록
- Frame → 자식 컨테이너로 nested
- Text/Image/Button/Shape 별 마크업 (XSS 안전 escape)
- 외부 의존성 없는 standalone HTML

## MVP 외 / 향후 enhancement

다음은 의도적으로 제외되어 있다:
- 멀티 페이지 / 라우팅
- 협업 / CMS / 퍼블리시
- 애니메이션 / 인터랙션
- 고급 스냅 (가이드 라인, 그리드)
- 그룹 선택 / 멀티 셀렉트
- 오토 레이아웃
- 태블릿 / 모바일 개별 편집 (Mobile은 viewport 축소 미리보기만)
- SEO 세부 설정
- 코드 컴포넌트 / 커스텀 컴포넌트
- 에러 토스트 UI (현재는 console.warn 또는 silent fail)

## 테스트 커버리지

- **자동(vitest)** — 173 tests / 21 files
  - utils: `nodeTree`, `nodePresentation`, `serialize`, `projectFile`, `htmlExport`
  - stores: `editor`(reorder/undo 포함), `history`, `viewport`
  - composables: `useNodeFactory`, `useNodeInteraction`, `useNodeField`, `useAutoSave`, `useShortcuts`, `useCanvasViewport`
  - 컴포넌트: `Canvas`, `Toolbar`, `LayerItem`, `LayersPanel`, `PropertiesPanel`, `TemplatesView`
- **수동 검증 필요** (자동화 비용/한계)
  - `MoveableWrapper` — vanilla DOM 라이브러리 + happy-dom 한계
  - 노드 시각 SFC (Text/Image/Button/Frame/Shape) — 단순 props→DOM 매핑
  - 일부 단순 SFC: `ZoomControl`, `ShortcutsHelp`, `ViewportFrame`, `PreviewCanvas`
  - View 마운트: `EditorView`, `PreviewView` (라우팅+composable 호출만)
  - HTML Export 결과 파일 시각 일치

## 진행 체크리스트

[`docs/CHECKLIST.md`](docs/CHECKLIST.md)와 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) 참고.
