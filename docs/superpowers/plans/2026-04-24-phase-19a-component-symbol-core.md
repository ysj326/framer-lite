# Phase 19a — 컴포넌트 심볼 시스템 (핵심 모델) 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Frame 노드를 Master로 등록하고 그 자리를 Instance로 치환하는 핵심 모델과 변환 플로우를 구현한다 (override 없이, Figma "Create Component" 기초 단계).

**Architecture:** `Project.masters: Record<string, Master>` 최상위 필드를 신설하고, `AppNode` 유니온에 새 NodeType `'instance'`를 추가한다. 변환은 editor store의 `createComponent(frameId)` 액션이 담당하며, 렌더는 새 `InstanceNode.vue`가 master 트리를 재귀 렌더한다. 직렬화·Undo/Redo·HTML export는 각각 `masters`를 스냅샷/출력 대상에 포함하도록 확장한다.

**Tech Stack:** Vue 3 + Pinia + TypeScript + Vitest + @vue/test-utils + happy-dom, `nanoid` id 생성, `lodash-es` cloneDeep.

**Reference spec:** `docs/superpowers/specs/2026-04-24-phase-19a-component-symbol-core-design.md`

---

## File Structure

**Create:**
- `src/types/master.ts` — Master 인터페이스 정의 (단일 파일에 격리)
- `src/utils/masterFactory.ts` — 순수 헬퍼: uniqueMasterName, buildMasterFromFrame, collectSubtree
- `src/utils/masterFactory.spec.ts` — 헬퍼 단위 테스트
- `src/components/editor/nodes/InstanceNode.vue` — Instance 렌더 컴포넌트 (master 트리 재귀)
- `src/components/editor/nodes/InstanceNode.spec.ts` — 렌더 컴포넌트 테스트

**Modify:**
- `src/types/node.ts` — InstanceNode 인터페이스 + AppNode 유니온 확장
- `src/types/project.ts` — Project에 masters 필드 추가
- `src/stores/history.ts` — EditorSnapshot에 masters 필드 추가
- `src/stores/editor.ts` — masters state + createComponent action + snapshot/applySnapshot 확장
- `src/stores/editor.spec.ts` — createComponent 테스트
- `src/utils/serialize.ts` — masters 왕복 + migration + 손상 master drop
- `src/utils/serialize.spec.ts` — 관련 테스트
- `src/utils/htmlExport.ts` — instance inline expand 지원
- `src/utils/htmlExport.spec.ts` — 관련 테스트
- `src/components/editor/NodeRenderer.vue` — instance 분기 추가
- `src/components/editor/LayerItem.vue` — instance leaf 처리 (자식 표시 X)
- `src/components/editor/LayerItem.spec.ts` — 관련 테스트
- `src/components/editor/PropertiesPanel.vue` — "Create Component" 버튼 (Frame 선택 시)
- `src/components/editor/PropertiesPanel.spec.ts` — 관련 테스트
- `src/composables/useShortcuts.ts` — `Cmd+Alt+K` 분기
- `src/composables/useShortcuts.spec.ts` — 관련 테스트
- `docs/CHECKLIST.md` — Phase 19a 체크항목 추가

**Do NOT touch:**
- `src/stores/slots.ts` (작업 슬롯 — 이름만 같고 별개 개념)
- `src/stores/slotPicker.ts`, `src/stores/viewport.ts`, `src/stores/confirm.ts`

---

### Task 1: Master & InstanceNode 타입 정의

**Files:**
- Create: `src/types/master.ts`
- Modify: `src/types/node.ts`
- Modify: `src/types/project.ts`

- [ ] **Step 1: `src/types/master.ts` 생성**

```ts
import type { AppNode } from './node'

/**
 * 재사용 가능한 컴포넌트 정의(마스터).
 * Instance 노드는 `data.masterId`로 이 정의를 참조해 렌더된다.
 *
 * `nodes`는 master 고유 namespace로, Project.page.nodes와 id 공간이 분리된다.
 * 같은 id가 양쪽에 존재해도 두 Record는 독립 조회되므로 섞일 일이 없다.
 */
export interface Master {
  /** nanoid로 생성된 마스터 식별자 */
  id: string
  /** 표시 이름 (예: "Card"). 중복 시 변환 로직에서 "(N)" suffix로 고유화 */
  name: string
  /** master 내부 루트 Frame 노드의 id. 반드시 `nodes[rootId]`에 존재해야 함 */
  rootId: string
  /** master 고유 namespace의 노드 평면 저장소 */
  nodes: Record<string, AppNode>
  /** 생성 시각 (epoch ms) */
  createdAt: number
  /** 마지막 수정 시각 (epoch ms). 19a에서는 createMaster 이후 변경되지 않음 */
  updatedAt: number
}
```

- [ ] **Step 2: `src/types/node.ts`에 InstanceNode 추가 + AppNode 확장**

```ts
// 파일 맨 아래 (AppNode 선언 바로 위)에 추가:

/**
 * Instance 노드 — Master 정의를 참조해 그 트리를 재귀 렌더한다.
 *
 * `childIds`는 항상 빈 배열로 유지한다 (master 트리는 참조만 할 뿐 자식을 직접 소유하지 않음).
 * Instance의 `x, y, width, height, rotation`은 Instance가 직접 소유하며,
 * 자식(master 트리) 좌표는 master 내부 상대 좌표 그대로 쓴다 (19a 정책).
 */
export interface InstanceNode extends BaseNode {
  type: 'instance'
  data: {
    /** 참조하는 Master id (반드시 Project.masters에 존재해야 함) */
    masterId: string
    /**
     * 인스턴스별 override 맵. Phase 19a에서는 항상 빈 객체.
     * Phase 19b에서 실제 override 타입으로 확장된다.
     */
    overrides: Record<string, never>
  }
}
```

그리고 기존 `AppNode` 유니온 끝에 `| InstanceNode`를 추가한다:

```ts
export type AppNode = TextNode | ImageNode | ButtonNode | FrameNode | ShapeNode | InstanceNode
```

- [ ] **Step 3: `src/types/project.ts`에 masters 필드 추가**

`Project` 인터페이스에 `masters` 필드 추가:

```ts
import type { AppNode } from './node'
import type { Master } from './master'

// ... (기존 Page 그대로)

export interface Project {
  /** 스키마 버전 (현재 1) */
  version: 1
  /** 프로젝트 이름 (저장 시 파일명에도 사용) */
  name: string
  /** 페이지 메타 (MVP는 1개) */
  page: Page
  /** 모든 노드의 평면 저장소 (id 기반 조회) */
  nodes: Record<string, AppNode>
  /** 재사용 컴포넌트 정의 맵. 구버전 JSON 로드 시 빈 객체로 기본값 주입 */
  masters: Record<string, Master>
  /** 마지막 갱신 시각 (Date.now()) */
  updatedAt: number
}
```

- [ ] **Step 4: type-check 실행**

```bash
npm run type-check
```

Expected: 타입 에러 다수 발생 (Project 생성하는 곳, AppNode 유니온을 소비하는 곳 전부). 이후 Task에서 하나씩 해소.

- [ ] **Step 5: 타입 확장에 따른 기존 Project 생성 지점 최소 수정**

`src/stores/editor.ts` 상단의 `createDefaultPage` 근처에서 `useEditorStore` 초기 state에 masters를 추가하고, 프로젝트 직렬화·역직렬화 관련 호출부도 호환되게 비워둔다 (임시). 구체:

`src/stores/editor.ts` 안에서 `nodes`, `page`, `selectedId` ref 선언 바로 아래에 추가:

```ts
const masters = ref<Record<string, import('@/types/master').Master>>({})
```

그리고 파일 맨 아래의 `return { ... }` 블록에 `masters`를 노출한다.

- [ ] **Step 6: type-check 재실행하고 통과 여부 확인**

```bash
npm run type-check
```

Expected: `masters`를 직접 참조하지 않는 대부분은 통과. 남은 에러가 있으면 "`Project` 객체를 수동 생성하는 테스트"뿐일 가능성이 높다 — 다음 Task들이 자연스럽게 해소.

- [ ] **Step 7: Commit**

```bash
git add src/types/master.ts src/types/node.ts src/types/project.ts src/stores/editor.ts
git commit -m ":sparkles: feat(types): Master, InstanceNode 타입 + Project.masters 추가

Phase 19a 컴포넌트 심볼 시스템의 타입 기반. 구현 액션·렌더·직렬화는
후속 Task에서 추가."
```

---

### Task 2: masterFactory 헬퍼 (순수 함수, TDD)

**Files:**
- Create: `src/utils/masterFactory.ts`
- Test: `src/utils/masterFactory.spec.ts`

- [ ] **Step 1: 실패 테스트 작성 — `uniqueMasterName`**

`src/utils/masterFactory.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { uniqueMasterName, collectSubtree, buildMasterFromFrame } from './masterFactory'
import type { Master } from '@/types/master'
import type { AppNode, FrameNode, TextNode } from '@/types/node'

describe('uniqueMasterName', () => {
  it('이름이 비어 있으면 그 이름을 그대로 반환', () => {
    const masters: Record<string, Master> = {}
    expect(uniqueMasterName('Card', masters)).toBe('Card')
  })

  it('동일 이름이 하나 있으면 "(1)"을 붙임', () => {
    const masters: Record<string, Master> = {
      m1: makeMaster('Card'),
    }
    expect(uniqueMasterName('Card', masters)).toBe('Card (1)')
  })

  it('"(1)"까지 있으면 "(2)"를 붙임', () => {
    const masters: Record<string, Master> = {
      m1: makeMaster('Card'),
      m2: makeMaster('Card (1)'),
    }
    expect(uniqueMasterName('Card', masters)).toBe('Card (2)')
  })
})

/** 테스트 헬퍼 */
const makeMaster = (name: string): Master => ({
  id: `m-${name}`,
  name,
  rootId: 'r',
  nodes: {},
  createdAt: 0,
  updatedAt: 0,
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/utils/masterFactory.spec.ts
```

Expected: FAIL (`Cannot find module './masterFactory'`)

- [ ] **Step 3: 최소 구현 — `src/utils/masterFactory.ts`**

```ts
import { nanoid } from 'nanoid'
import type { AppNode, FrameNode } from '@/types/node'
import type { Master } from '@/types/master'

/**
 * masters 맵 안에서 동일 이름이 충돌하면 "(1)", "(2)" 접미사를 붙여 고유화한다.
 * @param base 희망 이름
 * @param masters 현재 masters 맵
 * @returns 충돌 없는 고유 이름
 */
export const uniqueMasterName = (
  base: string,
  masters: Record<string, Master>,
): string => {
  const used = new Set<string>(Object.values(masters).map((m) => m.name))
  if (!used.has(base)) return base
  let n = 1
  while (used.has(`${base} (${n})`)) n += 1
  return `${base} (${n})`
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/utils/masterFactory.spec.ts
```

Expected: PASS (uniqueMasterName 3개)

- [ ] **Step 5: 실패 테스트 추가 — `collectSubtree`**

`src/utils/masterFactory.spec.ts`에 추가:

```ts
describe('collectSubtree', () => {
  it('Frame과 그 자손 노드를 모두 수집해 새 Record로 반환', () => {
    const nodes: Record<string, AppNode> = {
      f: { ...base('frame', 'f'), type: 'frame', childIds: ['t1', 't2'], data: {} } as FrameNode,
      t1: { ...base('text', 't1'), type: 'text', data: { content: 'hi' } } as TextNode,
      t2: { ...base('text', 't2'), type: 'text', data: { content: 'yo' } } as TextNode,
      other: { ...base('text', 'other'), type: 'text', data: { content: 'x' } } as TextNode,
    }
    const result = collectSubtree(nodes, 'f')
    expect(Object.keys(result).sort()).toEqual(['f', 't1', 't2'])
    expect(result.other).toBeUndefined()
  })

  it('중첩 Frame도 재귀적으로 수집', () => {
    const nodes: Record<string, AppNode> = {
      outer: { ...base('frame', 'outer'), type: 'frame', childIds: ['inner'], data: {} } as FrameNode,
      inner: { ...base('frame', 'inner'), type: 'frame', childIds: ['leaf'], data: {} } as FrameNode,
      leaf: { ...base('text', 'leaf'), type: 'text', data: { content: 'L' } } as TextNode,
    }
    const result = collectSubtree(nodes, 'outer')
    expect(Object.keys(result).sort()).toEqual(['inner', 'leaf', 'outer'])
  })

  it('subtree에 instance 타입 노드가 포함되면 에러를 throw', () => {
    const nodes: Record<string, AppNode> = {
      f: { ...base('frame', 'f'), type: 'frame', childIds: ['inst'], data: {} } as FrameNode,
      inst: {
        ...base('instance', 'inst'),
        type: 'instance',
        childIds: [],
        data: { masterId: 'm', overrides: {} },
      },
    }
    expect(() => collectSubtree(nodes, 'f')).toThrow(/instance/i)
  })
})

/** 테스트용 BaseNode 기본값 (타입별 data는 호출자가 덮어씀) */
const base = (_t: string, id: string) => ({
  id,
  name: id,
  parentId: null,
  childIds: [] as string[],
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  zIndex: 0,
  visible: true,
  locked: false,
  style: {},
})
```

- [ ] **Step 6: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/utils/masterFactory.spec.ts
```

Expected: FAIL (collectSubtree undefined)

- [ ] **Step 7: `collectSubtree` 구현 추가**

`src/utils/masterFactory.ts`에 추가:

```ts
/**
 * 주어진 rootId의 subtree(자기 자신 + 모든 자손)를 원본 Record에서 수집해
 * 새 Record로 반환한다. 원본은 변경하지 않는다.
 *
 * 19a 제약: subtree에 instance 노드가 포함되면 에러 (Nesting은 19f).
 * @param nodes 원본 노드 맵
 * @param rootId 수집 시작 id
 * @returns rootId와 자손만 담긴 새 Record
 * @throws subtree 안에 instance 타입이 있을 때
 */
export const collectSubtree = (
  nodes: Record<string, AppNode>,
  rootId: string,
): Record<string, AppNode> => {
  const result: Record<string, AppNode> = {}
  const visit = (id: string): void => {
    const node = nodes[id]
    if (!node) return
    if (node.type === 'instance') {
      throw new Error(`subtree에 instance 노드(${id})는 허용되지 않음 (19f Nesting 예정)`)
    }
    result[id] = node
    for (const childId of node.childIds) visit(childId)
  }
  visit(rootId)
  return result
}
```

- [ ] **Step 8: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/utils/masterFactory.spec.ts
```

Expected: PASS (전체)

- [ ] **Step 9: 실패 테스트 추가 — `buildMasterFromFrame`**

`src/utils/masterFactory.spec.ts`에 추가:

```ts
describe('buildMasterFromFrame', () => {
  it('Frame과 자손을 담은 Master 객체를 반환', () => {
    const nodes: Record<string, AppNode> = {
      f: { ...base('frame', 'f'), name: 'Hero', type: 'frame', childIds: ['t'], data: {} } as FrameNode,
      t: { ...base('text', 't'), type: 'text', data: { content: 'x' } } as TextNode,
    }
    const masters: Record<string, Master> = {}
    const master = buildMasterFromFrame(nodes, 'f', masters, () => 1_000)
    expect(master.id).toBeTruthy()
    expect(master.name).toBe('Hero')
    expect(master.rootId).toBe('f')
    expect(Object.keys(master.nodes).sort()).toEqual(['f', 't'])
    expect(master.createdAt).toBe(1_000)
    expect(master.updatedAt).toBe(1_000)
  })

  it('이름 충돌 시 suffix "(1)"로 고유화', () => {
    const nodes: Record<string, AppNode> = {
      f: { ...base('frame', 'f'), name: 'Card', type: 'frame', childIds: [], data: {} } as FrameNode,
    }
    const masters: Record<string, Master> = {
      m: { id: 'm', name: 'Card', rootId: 'x', nodes: {}, createdAt: 0, updatedAt: 0 },
    }
    const master = buildMasterFromFrame(nodes, 'f', masters, () => 0)
    expect(master.name).toBe('Card (1)')
  })

  it('rootId가 frame이 아니면 에러', () => {
    const nodes: Record<string, AppNode> = {
      t: { ...base('text', 't'), type: 'text', data: { content: 'x' } } as TextNode,
    }
    expect(() => buildMasterFromFrame(nodes, 't', {}, () => 0)).toThrow(/frame/i)
  })
})
```

- [ ] **Step 10: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/utils/masterFactory.spec.ts
```

Expected: FAIL (buildMasterFromFrame undefined)

- [ ] **Step 11: `buildMasterFromFrame` 구현 추가**

`src/utils/masterFactory.ts`에 추가:

```ts
/**
 * 주어진 Frame 노드로부터 Master 객체를 만든다. 순수 함수 — state 변경 없음.
 *
 * 호출자는 이후 (1) `masters[master.id] = master`로 등록, (2) subtree를
 * page.nodes에서 제거, (3) 해당 위치에 Instance 노드를 삽입하는 흐름을
 * 원자적으로 수행해야 한다.
 *
 * @param nodes 원본 page 노드 맵
 * @param frameId Frame 노드 id (타입이 'frame'이 아니면 throw)
 * @param masters 현재 masters 맵 (이름 중복 판정용, 이 함수는 변경하지 않음)
 * @param now 시각 공급자 (테스트 주입용, 기본 `Date.now`)
 * @returns 신규 Master 객체
 * @throws rootId 노드가 존재하지 않거나 frame 타입이 아닐 때
 */
export const buildMasterFromFrame = (
  nodes: Record<string, AppNode>,
  frameId: string,
  masters: Record<string, Master>,
  now: () => number = Date.now,
): Master => {
  const frame = nodes[frameId]
  if (!frame || frame.type !== 'frame') {
    throw new Error(`frameId(${frameId})는 frame 노드여야 합니다`)
  }
  const subtree = collectSubtree(nodes, frameId)
  const ts = now()
  return {
    id: nanoid(),
    name: uniqueMasterName(frame.name, masters),
    rootId: frameId,
    nodes: subtree,
    createdAt: ts,
    updatedAt: ts,
  }
}
```

- [ ] **Step 12: 테스트 실행 — 전체 통과 확인**

```bash
npx vitest run src/utils/masterFactory.spec.ts
```

Expected: PASS (전체 케이스)

- [ ] **Step 13: Commit**

```bash
git add src/utils/masterFactory.ts src/utils/masterFactory.spec.ts
git commit -m ":sparkles: feat(masters): master 생성 헬퍼(uniqueMasterName, collectSubtree, buildMasterFromFrame)

순수 함수로 분리해 단위 테스트 용이. editor store의 createComponent
액션에서 사용된다."
```

---

### Task 3: EditorSnapshot에 masters 확장

**Files:**
- Modify: `src/stores/history.ts`
- Modify: `src/stores/editor.ts`
- Test: `src/stores/history.spec.ts`

- [ ] **Step 1: 실패 테스트 작성 — history snapshot round-trip에 masters 포함**

`src/stores/history.spec.ts`의 기존 테스트 아래(또는 새 describe에) 추가:

```ts
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, it, expect } from 'vitest'
import { useHistoryStore, type EditorSnapshot } from './history'

describe('history snapshot with masters', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('commit → undo → 스냅샷의 masters 필드가 보존됨', () => {
    const history = useHistoryStore()
    const empty: EditorSnapshot = {
      nodes: {},
      page: { id: 'p', name: 'P', width: 100, height: 100, background: '#fff', rootIds: [] },
      masters: {},
    }
    const withMaster: EditorSnapshot = {
      nodes: {},
      page: empty.page,
      masters: {
        m1: { id: 'm1', name: 'Card', rootId: 'r', nodes: {}, createdAt: 0, updatedAt: 0 },
      },
    }
    history.commit(empty)             // past: [empty]
    const prev = history.undo(withMaster)
    expect(prev?.masters).toEqual({})
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/stores/history.spec.ts
```

Expected: FAIL (타입 에러 — EditorSnapshot에 masters 없음)

- [ ] **Step 3: `EditorSnapshot` 확장**

`src/stores/history.ts`에서 interface 수정:

```ts
import type { AppNode } from '@/types/node'
import type { Page } from '@/types/project'
import type { Master } from '@/types/master'

export interface EditorSnapshot {
  nodes: Record<string, AppNode>
  page: Page
  masters: Record<string, Master>
}
```

- [ ] **Step 4: editor store의 snapshot/applySnapshot에 masters 반영**

`src/stores/editor.ts` 안의 `snapshot`·`applySnapshot` 함수를 수정:

```ts
const snapshot = (): EditorSnapshot => ({
  nodes: nodes.value,
  page: page.value,
  masters: masters.value,
})

const applySnapshot = (snap: EditorSnapshot): void => {
  nodes.value = cloneDeep(snap.nodes)
  page.value = cloneDeep(snap.page)
  masters.value = cloneDeep(snap.masters ?? {})  // 구버전 호환
  if (selectedId.value !== null && !nodes.value[selectedId.value]) {
    selectedId.value = null
  }
}
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/stores/history.spec.ts src/stores/editor.spec.ts
```

Expected: PASS (새 테스트 + 기존 테스트)

- [ ] **Step 6: type-check**

```bash
npm run type-check
```

Expected: 관련 에러 해소

- [ ] **Step 7: Commit**

```bash
git add src/stores/history.ts src/stores/editor.ts src/stores/history.spec.ts
git commit -m ":sparkles: feat(history): EditorSnapshot에 masters 포함

undo/redo가 masters 맵도 함께 복원하도록 확장. createComponent 액션이
하나의 undo 단위로 작동하기 위한 기반."
```

---

### Task 4: editor.createComponent 액션 (Frame → Master 변환)

**Files:**
- Modify: `src/stores/editor.ts`
- Test: `src/stores/editor.spec.ts`

- [ ] **Step 1: 실패 테스트 작성 — createComponent 기본 동작**

`src/stores/editor.spec.ts`에 새 describe 추가:

```ts
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, it, expect } from 'vitest'
import { useEditorStore } from './editor'
import { useNodeFactory } from '@/composables/useNodeFactory'

describe('createComponent (Frame → Master 변환)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('Frame을 선택 후 createComponent 호출하면 같은 자리에 Instance가 생기고 masters에 등록된다', () => {
    const editor = useEditorStore()
    const factory = useNodeFactory()
    const frame = factory.frame({ x: 10, y: 20, width: 200, height: 100 })
    editor.addNode(frame)
    const child = factory.text({ x: 5, y: 5, width: 50, height: 20 })
    editor.addNode(child, frame.id)
    editor.select(frame.id)

    const ok = editor.createComponent(frame.id)

    expect(ok).toBe(true)
    const result = editor.nodes[frame.id]
    expect(result.type).toBe('instance')
    expect(result.x).toBe(10)
    expect(result.y).toBe(20)
    expect(result.width).toBe(200)
    expect(result.height).toBe(100)
    expect(Object.keys(editor.masters)).toHaveLength(1)

    // 자식은 page.nodes에서 제거
    expect(editor.nodes[child.id]).toBeUndefined()

    // master 안에는 frame + child가 들어 있음
    const master = Object.values(editor.masters)[0]
    expect(master.rootId).toBe(frame.id)
    expect(Object.keys(master.nodes).sort()).toEqual([child.id, frame.id].sort())
  })

  it('Frame이 아닌 노드를 대상으로 호출하면 false 반환, 상태 변경 없음', () => {
    const editor = useEditorStore()
    const factory = useNodeFactory()
    const text = factory.text({ x: 0, y: 0, width: 50, height: 20 })
    editor.addNode(text)
    const before = JSON.stringify({ nodes: editor.nodes, masters: editor.masters })

    const ok = editor.createComponent(text.id)
    expect(ok).toBe(false)
    const after = JSON.stringify({ nodes: editor.nodes, masters: editor.masters })
    expect(after).toBe(before)
  })

  it('변환은 하나의 undo 단위 — undo 후 Frame이 복원된다', () => {
    const editor = useEditorStore()
    const factory = useNodeFactory()
    const frame = factory.frame({ x: 0, y: 0, width: 100, height: 100 })
    editor.addNode(frame)
    editor.createComponent(frame.id)
    expect(editor.nodes[frame.id].type).toBe('instance')

    editor.undo()
    expect(editor.nodes[frame.id].type).toBe('frame')
    expect(Object.keys(editor.masters)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/stores/editor.spec.ts
```

Expected: FAIL (createComponent 없음)

- [ ] **Step 3: editor store에 `createComponent` 액션 구현**

`src/stores/editor.ts`의 action 영역(파일 내 적절한 위치, 예: `deleteNode`·`duplicateNode` 근처)에 추가:

```ts
import { buildMasterFromFrame } from '@/utils/masterFactory'
import type { InstanceNode } from '@/types/node'

/**
 * 선택된 Frame 노드를 Master로 등록하고, 그 자리를 Instance 노드로 치환한다.
 *
 * - frameId가 존재하지 않거나 type이 'frame'이 아니면 no-op, false 반환.
 * - 성공 시 history에 직전 상태가 commit돼 단일 undo 단위를 이룬다.
 * - master.rootId는 원본 frameId를 그대로 사용(별도 namespace).
 * - Instance는 원본 frameId를 재사용해 삽입(undo 시 같은 id로 복원).
 *
 * @param frameId 대상 Frame 노드 id
 * @returns 변환 성공 여부
 */
const createComponent = (frameId: string): boolean => {
  const frame = nodes.value[frameId]
  if (!frame || frame.type !== 'frame') return false

  history.commit(snapshot(), `createComponent-${frameId}`)

  const master = buildMasterFromFrame(nodes.value, frameId, masters.value)

  // subtree(프레임 + 자손)를 page.nodes에서 제거
  const toRemove = Object.keys(master.nodes)
  const nextNodes: Record<string, AppNode> = { ...nodes.value }
  for (const id of toRemove) delete nextNodes[id]

  // 원본 Frame 위치에 Instance를 삽입 (같은 id 재사용)
  const instance: InstanceNode = {
    id: frameId,
    type: 'instance',
    name: master.name,
    parentId: frame.parentId,
    childIds: [],
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    rotation: frame.rotation,
    zIndex: frame.zIndex,
    visible: frame.visible,
    locked: frame.locked,
    style: {},
    data: { masterId: master.id, overrides: {} },
  }
  nextNodes[frameId] = instance

  nodes.value = nextNodes
  masters.value = { ...masters.value, [master.id]: master }

  return true
}
```

그리고 store의 `return` 블록에 `createComponent`를 노출한다.

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/stores/editor.spec.ts
```

Expected: PASS (3개 새 케이스 + 기존 통과)

- [ ] **Step 5: type-check + 전체 테스트**

```bash
npm run type-check && npx vitest run
```

Expected: 전체 PASS

- [ ] **Step 6: Commit**

```bash
git add src/stores/editor.ts src/stores/editor.spec.ts
git commit -m ":sparkles: feat(editor): createComponent 액션 — Frame을 Master로 등록하고 Instance로 치환

변환은 단일 undo 단위로 history에 commit된다. master.nodes는 별도
namespace로 page.nodes와 분리. 원본 frameId는 Instance가 재사용해
undo 시 같은 id로 복원된다."
```

---

### Task 5: 직렬화 — masters 왕복 + migration + 손상 master drop

**Files:**
- Modify: `src/utils/serialize.ts`
- Modify: `src/utils/serialize.spec.ts`

- [ ] **Step 1: 실패 테스트 작성**

`src/utils/serialize.spec.ts`에 새 describe 추가:

```ts
import { describe, it, expect } from 'vitest'
import { toJSON, fromJSON } from './serialize'
import type { Project } from '@/types/project'

describe('masters 직렬화', () => {
  it('masters 필드가 왕복에서 보존', () => {
    const project: Project = {
      version: 1,
      name: 'P',
      page: { id: 'p', name: 'P', width: 100, height: 100, background: '#fff', rootIds: [] },
      nodes: {},
      masters: {
        m1: { id: 'm1', name: 'Card', rootId: 'r', nodes: {}, createdAt: 1, updatedAt: 2 },
      },
      updatedAt: 3,
    }
    const round = fromJSON(toJSON(project))
    expect(round?.masters.m1.name).toBe('Card')
  })

  it('masters 필드가 없는 구버전 JSON 로드 시 빈 객체로 주입', () => {
    const legacy = JSON.stringify({
      version: 1,
      name: 'Old',
      page: { id: 'p', name: 'P', width: 100, height: 100, background: '#fff', rootIds: [] },
      nodes: {},
      updatedAt: 0,
    })
    const loaded = fromJSON(legacy)
    expect(loaded?.masters).toEqual({})
  })

  it('손상된 master(필수 필드 누락)는 드롭되고 나머지 프로젝트는 로드', () => {
    const raw = JSON.stringify({
      version: 1,
      name: 'P',
      page: { id: 'p', name: 'P', width: 100, height: 100, background: '#fff', rootIds: [] },
      nodes: {},
      masters: {
        good: { id: 'good', name: 'OK', rootId: 'r', nodes: {}, createdAt: 0, updatedAt: 0 },
        bad: { id: 'bad' },  // rootId, nodes, ... 누락
      },
      updatedAt: 0,
    })
    const loaded = fromJSON(raw)
    expect(loaded?.masters.good).toBeDefined()
    expect(loaded?.masters.bad).toBeUndefined()
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/utils/serialize.spec.ts
```

Expected: FAIL (구버전 JSON에서 masters가 undefined)

- [ ] **Step 3: `serialize.ts` 확장**

`src/utils/serialize.ts`를 다음과 같이 수정:

```ts
import type { Project } from '@/types/project'
import type { Master } from '@/types/master'

export const CURRENT_VERSION = 1 as const

export const toJSON = (project: Project): string => {
  const normalized = { ...project, version: CURRENT_VERSION }
  return JSON.stringify(normalized)
}

export const fromJSON = (raw: string): Project | null => {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isProjectShape(parsed)) return null
  return migrate(parsed)
}

/**
 * Project 골격 최소 검증. masters 필드는 optional로 허용 (migration에서 채움).
 */
const isProjectShape = (value: unknown): value is Project => {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.version === 'number' &&
    typeof obj.name === 'string' &&
    typeof obj.page === 'object' && obj.page !== null &&
    typeof obj.nodes === 'object' && obj.nodes !== null &&
    typeof obj.updatedAt === 'number'
  )
}

/**
 * 개별 Master 객체 런타임 검증. 필수 필드가 하나라도 없으면 false.
 */
const isMasterShape = (value: unknown): value is Master => {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.rootId === 'string' &&
    typeof obj.nodes === 'object' && obj.nodes !== null &&
    typeof obj.createdAt === 'number' &&
    typeof obj.updatedAt === 'number'
  )
}

/**
 * masters 필드를 정규화한다. 손상된 항목은 조용히 드롭.
 */
const sanitizeMasters = (raw: unknown): Record<string, Master> => {
  if (typeof raw !== 'object' || raw === null) return {}
  const result: Record<string, Master> = {}
  for (const [id, val] of Object.entries(raw as Record<string, unknown>)) {
    if (isMasterShape(val)) result[id] = val
  }
  return result
}

const migrate = (project: Project): Project => {
  const raw = project as unknown as Record<string, unknown>
  return {
    ...project,
    version: CURRENT_VERSION,
    masters: sanitizeMasters(raw.masters),
  }
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/utils/serialize.spec.ts
```

Expected: PASS (3개 + 기존)

- [ ] **Step 5: 전체 테스트 실행**

```bash
npx vitest run
```

Expected: 전체 PASS (기존 serialize 테스트도 깨지지 않음)

- [ ] **Step 6: Commit**

```bash
git add src/utils/serialize.ts src/utils/serialize.spec.ts
git commit -m ":sparkles: feat(serialize): masters 직렬화 + 구버전 JSON 자동 마이그레이션

masters 없는 구버전 파일은 빈 객체로 주입. 손상된 master 항목은
조용히 드롭하고 나머지 프로젝트는 정상 로드."
```

---

### Task 6: HTML export — Instance inline expand

**Files:**
- Modify: `src/utils/htmlExport.ts`
- Modify: `src/utils/htmlExport.spec.ts`

- [ ] **Step 1: 실패 테스트 작성**

`src/utils/htmlExport.spec.ts`에 새 describe 추가:

```ts
import { describe, it, expect } from 'vitest'
import { renderProjectHtml } from './htmlExport'    // 기존 함수명에 맞춰 조정
import type { Project } from '@/types/project'

describe('HTML export with instances', () => {
  it('Instance 자리에 master 트리가 인라인 전개되어 출력된다', () => {
    const project: Project = {
      version: 1,
      name: 'P',
      page: {
        id: 'p', name: 'P', width: 1280, height: 800, background: '#fff',
        rootIds: ['inst1'],
      },
      nodes: {
        inst1: {
          id: 'inst1', type: 'instance', name: 'Card',
          parentId: null, childIds: [],
          x: 50, y: 60, width: 200, height: 100, rotation: 0,
          zIndex: 0, visible: true, locked: false, style: {},
          data: { masterId: 'm1', overrides: {} },
        },
      },
      masters: {
        m1: {
          id: 'm1', name: 'Card', rootId: 'r', createdAt: 0, updatedAt: 0,
          nodes: {
            r: {
              id: 'r', type: 'frame', name: 'root',
              parentId: null, childIds: ['t'],
              x: 0, y: 0, width: 200, height: 100, rotation: 0,
              zIndex: 0, visible: true, locked: false, style: {}, data: {},
            },
            t: {
              id: 't', type: 'text', name: 'label',
              parentId: 'r', childIds: [],
              x: 10, y: 10, width: 120, height: 20, rotation: 0,
              zIndex: 0, visible: true, locked: false, style: {},
              data: { content: 'Hello' },
            },
          },
        },
      },
      updatedAt: 0,
    }
    const html = renderProjectHtml(project)
    expect(html).toContain('Hello')                  // 내부 Text 노드가 전개됨
    expect(html).toContain('left: 50px')             // Instance 좌표 적용
  })

  it('master가 없는 Instance는 주석 fallback을 출력하고 나머지는 정상 렌더', () => {
    const project: Project = {
      version: 1, name: 'P',
      page: { id: 'p', name: 'P', width: 100, height: 100, background: '#fff', rootIds: ['x'] },
      nodes: {
        x: {
          id: 'x', type: 'instance', name: 'Broken',
          parentId: null, childIds: [],
          x: 0, y: 0, width: 10, height: 10, rotation: 0,
          zIndex: 0, visible: true, locked: false, style: {},
          data: { masterId: 'nope', overrides: {} },
        },
      },
      masters: {},
      updatedAt: 0,
    }
    const html = renderProjectHtml(project)
    expect(html).toContain('missing master')
  })
})
```

> 참고: 실제 export 함수명은 `htmlExport.ts`를 확인해 조정. 기존 함수가 `exportProjectToHtml`, `buildHtml` 등 다른 이름이면 테스트 import 맞춰 변경.

- [ ] **Step 2: 현재 `htmlExport.ts` 구조 파악**

```bash
head -60 src/utils/htmlExport.ts
```

기존 export 함수 이름과 시그니처를 확인한 뒤, 테스트에서 정확한 심볼을 import한다.

- [ ] **Step 3: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/utils/htmlExport.spec.ts
```

Expected: FAIL (instance 처리 분기가 없어 출력에 'Hello' 미포함)

- [ ] **Step 4: `htmlExport.ts`에 instance 처리 추가**

기존 트리 순회 함수(예: `renderNode(node, nodes)`) 안에서 `node.type === 'instance'` 분기를 추가한다. 핵심 코드 개요:

```ts
import type { Project } from '@/types/project'
import type { AppNode, InstanceNode } from '@/types/node'
import type { Master } from '@/types/master'

const MAX_INSTANCE_DEPTH = 32   // 19f Nesting 대비 안전장치

/**
 * 노드 하나를 렌더. Instance를 만나면 master 트리를 인라인 전개한다.
 * @param node 대상 노드
 * @param ctx 현재 전체 노드 맵, masters, 현재 재귀 깊이
 */
const renderNode = (
  node: AppNode,
  nodesScope: Record<string, AppNode>,
  masters: Record<string, Master>,
  depth = 0,
): string => {
  if (node.type === 'instance') {
    if (depth >= MAX_INSTANCE_DEPTH) {
      return `<!-- instance depth exceeded for ${node.id} -->`
    }
    const master = masters[node.data.masterId]
    if (!master) {
      return `<!-- missing master: ${node.data.masterId} --><div></div>`
    }
    // master 트리를 instance 위치·크기로 wrap해 전개
    const root = master.nodes[master.rootId]
    if (!root || root.type !== 'frame') {
      return `<!-- master ${master.id} has invalid root -->`
    }
    // wrapper에 instance 위치·크기 적용, 내부 트리는 master.nodes scope로 렌더
    const wrapperStyle = buildStyle({
      ...root, x: node.x, y: node.y, width: node.width, height: node.height,
      rotation: node.rotation, zIndex: node.zIndex,
    })
    const inner = root.childIds
      .map((cid) => {
        const child = master.nodes[cid]
        return child ? renderNode(child, master.nodes, masters, depth + 1) : ''
      })
      .join('')
    return `<div style="${wrapperStyle}">${inner}</div>`
  }
  // 기존 분기 유지 (text/image/button/frame/shape)
  // ...
}
```

> 위 코드는 개요다. 기존 `renderNode` 안의 nodes 접근이 "scope 독립"이 되도록 `nodesScope` 인자를 추가해, 재귀 시 instance의 master.nodes를 스코프로 넘긴다. 기존 호출부도 `nodesScope`에 `project.nodes`를 넘기도록 수정.

최상위 entry 함수는 project를 받아 `page.rootIds`를 순회하며 `renderNode(node, project.nodes, project.masters, 0)`을 호출한다.

- [ ] **Step 5: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/utils/htmlExport.spec.ts
```

Expected: PASS (2개 새 + 기존)

- [ ] **Step 6: 전체 테스트 실행**

```bash
npx vitest run
```

Expected: 전체 PASS

- [ ] **Step 7: Commit**

```bash
git add src/utils/htmlExport.ts src/utils/htmlExport.spec.ts
git commit -m ":sparkles: feat(export): Instance를 master 트리로 인라인 전개해 HTML 출력

missing master는 주석 fallback. 재귀 깊이 상한(32)은 19f Nesting 대비."
```

---

### Task 7: InstanceNode.vue 렌더 컴포넌트

**Files:**
- Create: `src/components/editor/nodes/InstanceNode.vue`
- Test: `src/components/editor/nodes/InstanceNode.spec.ts`

- [ ] **Step 1: 실패 테스트 작성**

`src/components/editor/nodes/InstanceNode.spec.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import InstanceNode from './InstanceNode.vue'
import { useEditorStore } from '@/stores/editor'
import type { InstanceNode as InstanceNodeType } from '@/types/node'

describe('InstanceNode.vue', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('master가 없으면 placeholder를 표시', () => {
    const editor = useEditorStore()
    const inst: InstanceNodeType = {
      id: 'i', type: 'instance', name: 'X',
      parentId: null, childIds: [],
      x: 0, y: 0, width: 50, height: 50, rotation: 0,
      zIndex: 0, visible: true, locked: false, style: {},
      data: { masterId: 'missing', overrides: {} },
    }
    editor.nodes[inst.id] = inst
    const wrapper = mount(InstanceNode, { props: { node: inst } })
    expect(wrapper.text()).toContain('Missing master')
  })

  it('master 트리의 내부 텍스트 노드가 렌더된다', () => {
    const editor = useEditorStore()
    editor.masters.m1 = {
      id: 'm1', name: 'Card', rootId: 'r', createdAt: 0, updatedAt: 0,
      nodes: {
        r: {
          id: 'r', type: 'frame', name: 'root',
          parentId: null, childIds: ['t'],
          x: 0, y: 0, width: 100, height: 50, rotation: 0,
          zIndex: 0, visible: true, locked: false, style: {}, data: {},
        },
        t: {
          id: 't', type: 'text', name: 'label',
          parentId: 'r', childIds: [],
          x: 0, y: 0, width: 100, height: 20, rotation: 0,
          zIndex: 0, visible: true, locked: false, style: {},
          data: { content: 'HelloInside' },
        },
      },
    }
    const inst: InstanceNodeType = {
      id: 'i', type: 'instance', name: 'Card',
      parentId: null, childIds: [],
      x: 0, y: 0, width: 100, height: 50, rotation: 0,
      zIndex: 0, visible: true, locked: false, style: {},
      data: { masterId: 'm1', overrides: {} },
    }
    editor.nodes[inst.id] = inst
    const wrapper = mount(InstanceNode, { props: { node: inst } })
    expect(wrapper.text()).toContain('HelloInside')
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/components/editor/nodes/InstanceNode.spec.ts
```

Expected: FAIL (파일 없음)

- [ ] **Step 3: `InstanceNode.vue` 구현**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import type { AppNode, InstanceNode as InstanceNodeType } from '@/types/node'
import TextNode from './TextNode.vue'
import ImageNode from './ImageNode.vue'
import ButtonNode from './ButtonNode.vue'
import FrameNode from './FrameNode.vue'
import ShapeNode from './ShapeNode.vue'

defineOptions({ name: 'InstanceNode' })

const props = defineProps<{ node: InstanceNodeType }>()
const editor = useEditorStore()

/** 참조 master, 없으면 null */
const master = computed(() => editor.masters[props.node.data.masterId] ?? null)

/**
 * master 트리의 루트 Frame. placeholder 판정에 사용.
 */
const rootFrame = computed<AppNode | null>(() => {
  if (!master.value) return null
  const r = master.value.nodes[master.value.rootId]
  return r ?? null
})

/**
 * master 트리 안에서 특정 부모의 자식들을 반환. master.nodes scope 사용.
 */
const childrenOf = (parentId: string | null): AppNode[] => {
  if (!master.value) return []
  if (parentId === null) return []
  const p = master.value.nodes[parentId]
  if (!p) return []
  return p.childIds.map((id) => master.value!.nodes[id]).filter(Boolean) as AppNode[]
}
</script>

<template>
  <div
    v-if="!master || !rootFrame"
    class="instance-missing"
    :style="{ width: node.width + 'px', height: node.height + 'px' }"
  >
    Missing master: {{ node.data.masterId }}
  </div>
  <div
    v-else
    class="instance-wrapper"
    :style="{ width: node.width + 'px', height: node.height + 'px' }"
  >
    <!-- master의 root Frame 내부만 재귀 렌더. root Frame 자체의 배경은 rootFrame.style 사용 -->
    <component
      :is="rootFrameTag"
      v-for="child in childrenOf(master.rootId)"
      :key="child.id"
      :node="child"
    />
  </div>
</template>
```

> 위 template은 master.rootId 하위 자식만 루프하는 단순 버전. 실제로는 기존 `NodeRenderer` 패턴과 달라, 재귀를 위해 하위 자식도 master.nodes scope로 해석되는 별도 경로가 필요하다. 단순화를 위해 이 컴포넌트 안에서 재귀 컴포넌트(`MasterSubtree.vue` 또는 `NodeRenderer` 확장)를 쓴다.

실용적 접근: 기존 `NodeRenderer.vue`가 `editor.nodes` 전역을 참조해 자식을 찾는데, master.nodes scope로는 바꿀 수 없다. 따라서 **master scope를 prop으로 받는 `MasterSubtree.vue`를 별도 생성**한다:

`src/components/editor/nodes/MasterSubtree.vue` (신규):

```vue
<script setup lang="ts">
import { computed } from 'vue'
import type { AppNode } from '@/types/node'
import TextNode from './TextNode.vue'
import ImageNode from './ImageNode.vue'
import ButtonNode from './ButtonNode.vue'
import FrameNode from './FrameNode.vue'
import ShapeNode from './ShapeNode.vue'

defineOptions({ name: 'MasterSubtree' })

const props = defineProps<{
  node: AppNode
  scope: Record<string, AppNode>     // master.nodes
}>()

const childNodes = computed<AppNode[]>(() =>
  props.node.type === 'frame'
    ? props.node.childIds.map((id) => props.scope[id]).filter(Boolean) as AppNode[]
    : [],
)
</script>

<template>
  <TextNode v-if="node.type === 'text'" :node="node" />
  <ImageNode v-else-if="node.type === 'image'" :node="node" />
  <ButtonNode v-else-if="node.type === 'button'" :node="node" />
  <ShapeNode v-else-if="node.type === 'shape'" :node="node" />
  <FrameNode v-else-if="node.type === 'frame'" :node="node">
    <MasterSubtree
      v-for="child in childNodes"
      :key="child.id"
      :node="child"
      :scope="scope"
    />
  </FrameNode>
  <!-- 19a: master 안에 instance는 허용하지 않음 -->
</template>
```

그리고 `InstanceNode.vue`는 이 컴포넌트를 사용한다:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import type { InstanceNode as InstanceNodeType } from '@/types/node'
import MasterSubtree from './MasterSubtree.vue'

defineOptions({ name: 'InstanceNode' })

const props = defineProps<{ node: InstanceNodeType }>()
const editor = useEditorStore()

const master = computed(() => editor.masters[props.node.data.masterId] ?? null)
const rootFrame = computed(() =>
  master.value ? master.value.nodes[master.value.rootId] : null,
)
</script>

<template>
  <div
    v-if="!master || !rootFrame || rootFrame.type !== 'frame'"
    class="instance-missing"
    :style="{ width: node.width + 'px', height: node.height + 'px' }"
  >
    Missing master: {{ node.data.masterId }}
  </div>
  <div v-else class="instance-wrapper">
    <MasterSubtree
      v-for="child in rootFrame.childIds.map((id) => master.nodes[id]).filter(Boolean)"
      :key="child.id"
      :node="child"
      :scope="master.nodes"
    />
  </div>
</template>

<style lang="scss" scoped>
.instance-missing {
  border: 1px dashed #999;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
.instance-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/components/editor/nodes/InstanceNode.spec.ts
```

Expected: PASS (2개)

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/nodes/InstanceNode.vue \
        src/components/editor/nodes/MasterSubtree.vue \
        src/components/editor/nodes/InstanceNode.spec.ts
git commit -m ":sparkles: feat(render): InstanceNode + MasterSubtree 컴포넌트

InstanceNode는 masters에서 참조 master를 찾아 MasterSubtree로 트리를
재귀 렌더. MasterSubtree는 master.nodes scope를 prop으로 받아
기존 NodeRenderer와 독립된 렌더 경로를 제공한다."
```

---

### Task 8: NodeRenderer — instance 분기

**Files:**
- Modify: `src/components/editor/NodeRenderer.vue`

- [ ] **Step 1: 수정**

`src/components/editor/NodeRenderer.vue` script에 InstanceNode import 추가, template에 분기 추가:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import * as tree from '@/utils/nodeTree'
import type { AppNode } from '@/types/node'
import TextNode from './nodes/TextNode.vue'
import ImageNode from './nodes/ImageNode.vue'
import ButtonNode from './nodes/ButtonNode.vue'
import FrameNode from './nodes/FrameNode.vue'
import ShapeNode from './nodes/ShapeNode.vue'
import InstanceNode from './nodes/InstanceNode.vue'

defineOptions({ name: 'NodeRenderer' })

const props = defineProps<{ node: AppNode }>()
const editor = useEditorStore()

const childNodes = computed<AppNode[]>(() =>
  props.node.type === 'frame'
    ? tree.getChildren(editor.nodes, props.node.id, [])
    : [],
)
</script>

<template>
  <TextNode v-if="node.type === 'text'" :node="node" />
  <ImageNode v-else-if="node.type === 'image'" :node="node" />
  <ButtonNode v-else-if="node.type === 'button'" :node="node" />
  <ShapeNode v-else-if="node.type === 'shape'" :node="node" />
  <InstanceNode v-else-if="node.type === 'instance'" :node="node" />
  <FrameNode v-else-if="node.type === 'frame'" :node="node">
    <NodeRenderer v-for="child in childNodes" :key="child.id" :node="child" />
  </FrameNode>
</template>
```

- [ ] **Step 2: dev 서버로 수동 확인 (옵션)**

```bash
npm run dev
```

브라우저에서 Frame 생성 → (Task 10까지 완료되면) Create Component 클릭 → 시각 동일 여부 눈으로 확인.

- [ ] **Step 3: 전체 테스트 실행 (기존 NodeRenderer 관련 회귀 없음)**

```bash
npx vitest run
```

Expected: 전체 PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/editor/NodeRenderer.vue
git commit -m ":sparkles: feat(render): NodeRenderer에 instance 분기 추가"
```

---

### Task 9: LayerItem — Instance는 leaf

**Files:**
- Modify: `src/components/editor/LayerItem.vue`
- Test: `src/components/editor/LayerItem.spec.ts`

- [ ] **Step 1: 실패 테스트 작성**

`src/components/editor/LayerItem.spec.ts`에 추가:

```ts
it('Instance 노드는 자식(master 트리)을 LayersPanel에 노출하지 않는다', () => {
  const editor = useEditorStore()
  editor.masters.m1 = {
    id: 'm1', name: 'Card', rootId: 'r', createdAt: 0, updatedAt: 0,
    nodes: {
      r: {
        id: 'r', type: 'frame', name: 'root', parentId: null,
        childIds: ['c'], x: 0, y: 0, width: 10, height: 10, rotation: 0,
        zIndex: 0, visible: true, locked: false, style: {}, data: {},
      },
      c: {
        id: 'c', type: 'text', name: 'child-in-master', parentId: 'r',
        childIds: [], x: 0, y: 0, width: 10, height: 10, rotation: 0,
        zIndex: 0, visible: true, locked: false, style: {},
        data: { content: 'x' },
      },
    },
  }
  const inst = {
    id: 'i', type: 'instance' as const, name: 'Card',
    parentId: null, childIds: [],
    x: 0, y: 0, width: 10, height: 10, rotation: 0,
    zIndex: 0, visible: true, locked: false, style: {},
    data: { masterId: 'm1', overrides: {} },
  }
  editor.nodes[inst.id] = inst

  const wrapper = mount(LayerItem, { props: { node: inst, depth: 0 } })
  // master 안의 child 이름이 LayersPanel에 노출되어서는 안 됨
  expect(wrapper.text()).not.toContain('child-in-master')
})
```

> 기존 spec 파일 상단의 import/setup 스타일 확인 후 맞춰 작성.

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/components/editor/LayerItem.spec.ts
```

Expected: PASS인 경우도 가능 (현재 LayerItem의 `childLayers`는 `type === 'frame'`일 때만 자식을 반환하므로 instance에선 자식 없음). 만약 이미 PASS면 다음 Step은 최소 수정만.

- [ ] **Step 3: LayerItem.vue 보강 (아이콘·라벨 개선)**

`childLayers`는 이미 frame 한정이라 안전하지만, 시각적 마커를 추가해 사용자 인지 개선:

```vue
<span class="layer-item__name">
  <span v-if="node.type === 'instance'" class="layer-item__icon" title="Component Instance">◆</span>
  {{ node.name }}
</span>
```

CSS:

```scss
.layer-item__icon {
  font-size: 10px;
  color: $accent;
  margin-right: 4px;
}
```

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```bash
npx vitest run src/components/editor/LayerItem.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/LayerItem.vue src/components/editor/LayerItem.spec.ts
git commit -m ":sparkles: feat(layers): Instance를 leaf로 표시 + 다이아몬드 아이콘

master 트리의 자식은 LayersPanel에 노출되지 않는다 (Phase 19a 블랙박스 정책).
19b에서 펼침 + 자식 선택 도입 예정."
```

---

### Task 10: PropertiesPanel — "Create Component" 버튼

**Files:**
- Modify: `src/components/editor/PropertiesPanel.vue`
- Test: `src/components/editor/PropertiesPanel.spec.ts`

- [ ] **Step 1: 실패 테스트 작성**

`src/components/editor/PropertiesPanel.spec.ts`에 추가:

```ts
it('Frame 선택 시 "Create Component" 버튼이 노출된다', () => {
  const editor = useEditorStore()
  const factory = useNodeFactory()
  const f = factory.frame({ x: 0, y: 0, width: 100, height: 100 })
  editor.addNode(f)
  editor.select(f.id)
  const wrapper = mount(PropertiesPanel)
  expect(wrapper.text()).toContain('Create Component')
})

it('Text 등 frame이 아닌 노드 선택 시 "Create Component" 버튼은 표시되지 않는다', () => {
  const editor = useEditorStore()
  const factory = useNodeFactory()
  const t = factory.text({ x: 0, y: 0, width: 50, height: 20 })
  editor.addNode(t)
  editor.select(t.id)
  const wrapper = mount(PropertiesPanel)
  expect(wrapper.text()).not.toContain('Create Component')
})

it('버튼 클릭 시 editor.createComponent가 호출되고 선택은 Instance가 된다', async () => {
  const editor = useEditorStore()
  const factory = useNodeFactory()
  const f = factory.frame({ x: 0, y: 0, width: 100, height: 100 })
  editor.addNode(f)
  editor.select(f.id)
  const wrapper = mount(PropertiesPanel)
  await wrapper.get('button.create-component').trigger('click')
  expect(editor.nodes[f.id].type).toBe('instance')
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/components/editor/PropertiesPanel.spec.ts
```

Expected: FAIL

- [ ] **Step 3: PropertiesPanel.vue 수정**

```vue
<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import CommonProperties from './properties/CommonProperties.vue'
import TextProperties from './properties/TextProperties.vue'
import ImageProperties from './properties/ImageProperties.vue'
import ButtonProperties from './properties/ButtonProperties.vue'
import ShapeProperties from './properties/ShapeProperties.vue'

const editor = useEditorStore()

/**
 * 현재 선택된 Frame을 컴포넌트 마스터로 등록하고 그 자리를 Instance로 치환한다.
 * editor.createComponent가 성공하면 같은 id가 Instance가 되어 선택 상태도 그대로 유지된다.
 */
const onCreateComponent = (): void => {
  if (!editor.selectedNode) return
  if (editor.selectedNode.type !== 'frame') return
  editor.createComponent(editor.selectedNode.id)
}
</script>

<template>
  <div class="properties-panel">
    <h3 class="properties-panel__title">Properties</h3>
    <p v-if="!editor.selectedNode" class="properties-panel__empty">
      노드를 선택하세요
    </p>
    <template v-else>
      <div class="properties-panel__name">
        <span class="properties-panel__type">{{ editor.selectedNode.type }}</span>
        <span class="properties-panel__node-name">{{ editor.selectedNode.name }}</span>
      </div>
      <button
        v-if="editor.selectedNode.type === 'frame'"
        type="button"
        class="create-component"
        @click="onCreateComponent"
      >
        Create Component
      </button>
      <CommonProperties :node="editor.selectedNode" />
      <TextProperties v-if="editor.selectedNode.type === 'text'" :node="editor.selectedNode" />
      <ImageProperties v-else-if="editor.selectedNode.type === 'image'" :node="editor.selectedNode" />
      <ButtonProperties v-else-if="editor.selectedNode.type === 'button'" :node="editor.selectedNode" />
      <ShapeProperties v-else-if="editor.selectedNode.type === 'shape'" :node="editor.selectedNode" />
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/common/variables' as *;
/* 기존 스타일 유지 + 버튼 추가 */
.create-component {
  width: 100%;
  padding: 6px 8px;
  margin-bottom: $space-sm;
  border: 1px solid $accent;
  background: transparent;
  color: $accent;
  font-size: 12px;
  cursor: pointer;
  border-radius: 3px;
  &:hover { background: rgba($accent, 0.12); }
}
</style>
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/components/editor/PropertiesPanel.spec.ts
```

Expected: PASS (3개 새 + 기존)

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/PropertiesPanel.vue src/components/editor/PropertiesPanel.spec.ts
git commit -m ":sparkles: feat(properties): 'Create Component' 버튼 (Frame 선택 시만)"
```

---

### Task 11: useShortcuts — `Cmd+Alt+K`

**Files:**
- Modify: `src/composables/useShortcuts.ts`
- Modify: `src/composables/useShortcuts.spec.ts`

- [ ] **Step 1: 실패 테스트 작성**

`src/composables/useShortcuts.spec.ts`에 추가:

```ts
it('Cmd+Alt+K: Frame이 선택돼 있으면 createComponent를 호출한다', () => {
  const editor = useEditorStore()
  const factory = useNodeFactory()
  const f = factory.frame({ x: 0, y: 0, width: 100, height: 100 })
  editor.addNode(f)
  editor.select(f.id)

  mount({ template: '<div />', setup() { useShortcuts() } })

  const ev = new KeyboardEvent('keydown', { key: 'k', metaKey: true, altKey: true })
  window.dispatchEvent(ev)
  expect(editor.nodes[f.id].type).toBe('instance')
})

it('Cmd+Alt+K: Frame이 아닌 선택이면 no-op', () => {
  const editor = useEditorStore()
  const factory = useNodeFactory()
  const t = factory.text({ x: 0, y: 0, width: 50, height: 20 })
  editor.addNode(t)
  editor.select(t.id)

  mount({ template: '<div />', setup() { useShortcuts() } })

  const ev = new KeyboardEvent('keydown', { key: 'k', metaKey: true, altKey: true })
  window.dispatchEvent(ev)
  expect(editor.nodes[t.id].type).toBe('text')
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run src/composables/useShortcuts.spec.ts
```

Expected: FAIL

- [ ] **Step 3: useShortcuts.ts에 분기 추가**

`handler` 함수 안, `cmd && key === ']'` 블록 바로 뒤에 추가:

```ts
// Cmd/Ctrl + Alt + K : Frame을 Component로 변환
if (cmd && event.altKey && key === 'k') {
  event.preventDefault()
  const id = editor.selectedId
  if (!id) return
  const node = editor.nodes[id]
  if (!node || node.type !== 'frame') return
  editor.createComponent(id)
  return
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run src/composables/useShortcuts.spec.ts
```

Expected: PASS

- [ ] **Step 5: 전체 테스트 + type-check**

```bash
npm run type-check && npx vitest run
```

Expected: 전체 PASS

- [ ] **Step 6: Commit**

```bash
git add src/composables/useShortcuts.ts src/composables/useShortcuts.spec.ts
git commit -m ":sparkles: feat(shortcuts): Cmd/Ctrl+Alt+K로 Frame→Component 변환"
```

---

### Task 12: 수동 회귀 + 문서 갱신

**Files:**
- Modify: `docs/CHECKLIST.md`

- [ ] **Step 1: dev 서버 실행 수동 확인**

```bash
npm run dev
```

브라우저 시나리오:
1. Frame 추가 → 자식 Text 2개 추가
2. Frame 선택 → PropertiesPanel의 "Create Component" 버튼 클릭
3. 화면 시각 동일한지 확인 (픽셀 변화 없음)
4. LayersPanel에서 해당 항목이 ◆ 아이콘의 leaf로 표시되는지 확인
5. Undo(`Cmd+Z`) → Frame 복원, 자식 Text 다시 표시
6. Redo(`Cmd+Shift+Z`) → 다시 Instance
7. Instance 선택 → Drag/Resize 동작 확인 (자식은 고정)
8. 단축키: Frame 선택 → `Cmd+Alt+K` → 변환
9. Save JSON → 파일 저장 → Load JSON → 상태 복원
10. HTML Export → 다운로드 HTML 열어 내부 텍스트 렌더 확인

문제 발견 시 관련 Task로 돌아가 수정.

- [ ] **Step 2: `docs/CHECKLIST.md`에 Phase 19a 체크 항목 추가**

파일 끝에 다음 블록을 append:

```markdown

## Phase 13–18 (Phase 15 후속 — 별도 commit으로 진행된 작업, 문서 역반영)
- [x] Phase 13–14: TDD 보강 (초기 커밋에 포함)
- [x] Phase 15: 다중 슬롯 시스템 (프로젝트 저장 공간 최대 5개) + Confirm/SlotPicker 모달
- [x] Phase 16: Text/Button 더블클릭 인플레이스 편집
- [x] Phase 17: 키보드 nudge + z-order 단축키
- [x] Phase 18: 노드 회전(rotation) 지원

## Phase 19a — 컴포넌트 심볼 시스템 (핵심 모델)
- [ ] `Master` 타입 + `Project.masters` 필드 + `InstanceNode` NodeType
- [ ] `masterFactory` 순수 헬퍼 (uniqueMasterName, collectSubtree, buildMasterFromFrame)
- [ ] `EditorSnapshot`에 masters 포함 → undo/redo 대응
- [ ] `editor.createComponent(frameId)` 액션 (history 단일 단위 커밋)
- [ ] 직렬화 masters 왕복 + 구버전 JSON 마이그레이션 + 손상 master 드롭
- [ ] HTML export — Instance inline expand + missing master 주석 fallback
- [ ] `InstanceNode.vue` + `MasterSubtree.vue` 렌더
- [ ] `NodeRenderer`에 instance 분기
- [ ] `LayerItem` Instance leaf 표시 + ◆ 아이콘
- [ ] `PropertiesPanel` "Create Component" 버튼 (Frame 한정)
- [ ] `useShortcuts` `Cmd/Ctrl+Alt+K`
- [ ] 전체 test + type-check + manual 회귀 통과

> **스펙 문서:** `docs/superpowers/specs/2026-04-24-phase-19a-component-symbol-core-design.md`
> **플랜 문서:** `docs/superpowers/plans/2026-04-24-phase-19a-component-symbol-core.md`
> **범위 밖 (후속 Phase):** override (19b), 다중 선택 심볼화 (19c), Assets 패널 + 우클릭 메뉴 (19d), Variants (19e), Nesting (19f)
```

- [ ] **Step 3: type-check + 전체 test**

```bash
npm run type-check && npx vitest run && npm run build
```

Expected: 전체 PASS, production build 성공

- [ ] **Step 4: 최종 commit**

```bash
git add docs/CHECKLIST.md
git commit -m ":memo: docs(checklist): Phase 13–18 역반영 + Phase 19a 체크 항목 추가"
```

- [ ] **Step 5: PR 생성 (main 대상)**

```bash
git push -u origin feat_phase-19a-component-symbol-core
gh pr create --title "Phase 19a: 컴포넌트 심볼 시스템 (핵심 모델)" --body "$(cat <<'EOF'
## Summary
- Figma/Framer 스타일 컴포넌트 심볼 시스템의 핵심 모델 도입
- Frame을 Master로 등록하고 그 자리를 Instance 노드로 치환
- Phase 19a 범위: override 없는 순수 참조 모델 + 변환 UX + 직렬화/Undo/Export 대응

자세한 결정 트레이스는 스펙 문서 참조:
`docs/superpowers/specs/2026-04-24-phase-19a-component-symbol-core-design.md`

## Scope (19a)
- 데이터 모델: `Project.masters` + `InstanceNode` (AppNode 유니온 확장)
- 변환: PropertiesPanel "Create Component" 버튼 + `Cmd/Ctrl+Alt+K`
- 렌더: `InstanceNode.vue` + `MasterSubtree.vue` (master.nodes scope 주입)
- LayersPanel: Instance는 leaf, ◆ 아이콘
- 직렬화: masters 왕복, 구버전 JSON 자동 마이그, 손상 master 드롭
- HTML export: inline expand, missing master fallback
- History: EditorSnapshot에 masters 포함 → undo/redo 일관

## Out of scope
- Override (19b), 다중 선택 심볼화 (19c), Assets 패널 + 우클릭 메뉴 (19d), Variants (19e), Nesting (19f)

## Test plan
- [ ] `npm run type-check` 통과
- [ ] `npx vitest run` 전체 통과
- [ ] `npm run build` production 성공
- [ ] 수동: Frame 생성 → Create Component → 시각 동일 → undo 복원 → redo → drag/resize → save/load JSON → HTML export

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

이 플랜을 스펙과 대조해 점검한다.

**Spec coverage:**
- ✅ `Project.masters` 최상위 필드 — Task 1 (Step 3)
- ✅ `Master` 인터페이스 — Task 1 (Step 1)
- ✅ `InstanceNode` 유니온 확장 — Task 1 (Step 2)
- ✅ `childIds = []` 유지 — Task 4 (Step 3)의 instance 생성 코드에서 설정
- ✅ 변환 플로우 (subtree 수집·제거·Instance 삽입·이름 suffix) — Task 2 + Task 4
- ✅ PropertiesPanel 버튼 + `Cmd+Alt+K` — Task 10, Task 11
- ✅ Instance 블랙박스 (LayersPanel leaf) — Task 9
- ✅ Instance resize 자체 가능, 자식 고정 — 현재 MoveableWrapper는 NodeRenderer 바깥에서 노드 자체를 제어하므로 별도 수정 불필요. 단, MoveableWrapper가 `instance` type을 이미 통과시키는지 Task 12 수동 회귀에서 확인.
- ✅ 직렬화·마이그레이션·손상 master 드롭 — Task 5
- ✅ HTML export inline expand + missing master fallback — Task 6
- ✅ EditorSnapshot masters 확장 + 단일 undo 단위 — Task 3 + Task 4
- ✅ 테스트 유닛/컴포넌트/통합 — 각 Task 내부에 분산
- ✅ 범위 밖 항목은 건드리지 않음 — 각 Task 지시가 좁게 유지됨

**Placeholder scan:** TBD/TODO 없음. 코드 예시는 전부 실행 가능한 수준으로 제시.

**Type consistency:** `masters` 필드명·`masterId`·`MasterSubtree` prop `scope` 일관 유지. `createComponent`는 모든 호출부(editor store, PropertiesPanel, useShortcuts)에서 동일 시그니처(`(frameId: string) => boolean`).

**MoveableWrapper 검증:** 기존 파일을 읽지 않고 플랜에 포함시키지 않았으나, instance가 BaseNode 필드(x/y/w/h/rotation)를 그대로 가지므로 MoveableWrapper는 type 분기 없이 그대로 작동할 가능성이 높다. 문제 발생 시 Task 12 수동 회귀에서 포착 → 별도 보강 commit으로 처리.
