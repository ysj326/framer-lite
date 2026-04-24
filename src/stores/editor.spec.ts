import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEditorStore } from './editor'
import {
  createTextNode,
  createFrameNode,
  createImageNode,
} from '@/composables/useNodeFactory'
import type { FrameNode } from '@/types/node'

describe('editor store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('초기 상태', () => {
    it('빈 노드 맵, 선택 없음, 기본 페이지', () => {
      const store = useEditorStore()
      expect(store.nodes).toEqual({})
      expect(store.page.rootIds).toEqual([])
      expect(store.selectedId).toBeNull()
      expect(store.page.width).toBeGreaterThan(0)
    })
  })

  describe('addNode', () => {
    it('페이지 직속 노드 추가', () => {
      const store = useEditorStore()
      const node = createTextNode()
      store.addNode(node, null)
      expect(store.nodes[node.id]).toBeDefined()
      expect(store.page.rootIds).toEqual([node.id])
    })

    it('Frame 자식으로 추가', () => {
      const store = useEditorStore()
      const frame = createFrameNode()
      store.addNode(frame, null)
      const child = createTextNode()
      store.addNode(child, frame.id)
      expect((store.nodes[frame.id] as FrameNode).childIds).toEqual([child.id])
      expect(store.nodes[child.id]!.parentId).toBe(frame.id)
    })
  })

  describe('updateNode', () => {
    it('지정한 필드만 덮어쓴다', () => {
      const store = useEditorStore()
      const node = createTextNode({ x: 10, y: 20 })
      store.addNode(node, null)
      store.updateNode(node.id, { x: 100 })
      expect(store.nodes[node.id]!.x).toBe(100)
      expect(store.nodes[node.id]!.y).toBe(20)
    })

    it('없는 id는 무시', () => {
      const store = useEditorStore()
      store.updateNode('ghost', { x: 1 })
      expect(store.nodes).toEqual({})
    })
  })

  describe('deleteNode', () => {
    it('노드와 후손을 모두 제거', () => {
      const store = useEditorStore()
      const frame = createFrameNode()
      store.addNode(frame, null)
      const child = createTextNode()
      store.addNode(child, frame.id)
      store.deleteNode(frame.id)
      expect(store.nodes).toEqual({})
      expect(store.page.rootIds).toEqual([])
    })

    it('삭제된 노드가 선택 상태였다면 선택 해제', () => {
      const store = useEditorStore()
      const node = createTextNode()
      store.addNode(node, null)
      store.select(node.id)
      store.deleteNode(node.id)
      expect(store.selectedId).toBeNull()
    })
  })

  describe('duplicateNode', () => {
    it('단일 노드 복제 시 새 id로 복사본 생성', () => {
      const store = useEditorStore()
      const node = createTextNode({ x: 10 })
      store.addNode(node, null)
      const newId = store.duplicateNode(node.id)
      expect(newId).toBeTruthy()
      expect(newId).not.toBe(node.id)
      expect(Object.keys(store.nodes)).toHaveLength(2)
      expect(store.page.rootIds).toEqual([node.id, newId])
      expect(store.nodes[newId!]!.x).toBe(10)
    })

    it('Frame 복제 시 자식까지 깊은 복제', () => {
      const store = useEditorStore()
      const frame = createFrameNode()
      store.addNode(frame, null)
      const c1 = createTextNode()
      const c2 = createTextNode()
      store.addNode(c1, frame.id)
      store.addNode(c2, frame.id)
      store.duplicateNode(frame.id)
      expect(Object.keys(store.nodes)).toHaveLength(6)
      expect(store.page.rootIds).toHaveLength(2)
    })
  })

  describe('select', () => {
    it('id로 선택, null로 해제', () => {
      const store = useEditorStore()
      const node = createTextNode()
      store.addNode(node, null)
      store.select(node.id)
      expect(store.selectedId).toBe(node.id)
      expect(store.selectedNode?.id).toBe(node.id)
      store.select(null)
      expect(store.selectedId).toBeNull()
      expect(store.selectedNode).toBeNull()
    })
  })

  describe('moveNode', () => {
    it('루트 노드를 Frame 자식으로 이동', () => {
      const store = useEditorStore()
      const frame = createFrameNode()
      const text = createTextNode()
      store.addNode(frame, null)
      store.addNode(text, null)
      store.moveNode(text.id, frame.id)
      expect(store.page.rootIds).toEqual([frame.id])
      expect((store.nodes[frame.id] as FrameNode).childIds).toEqual([text.id])
    })
  })

  describe('setZIndex', () => {
    it('zIndex 값을 갱신한다', () => {
      const store = useEditorStore()
      const node = createImageNode()
      store.addNode(node, null)
      store.setZIndex(node.id, 5)
      expect(store.nodes[node.id]!.zIndex).toBe(5)
    })
  })

  describe('rootNodes getter', () => {
    it('rootIds 순서대로 노드 배열을 반환', () => {
      const store = useEditorStore()
      const a = createTextNode()
      const b = createTextNode()
      store.addNode(a, null)
      store.addNode(b, null)
      expect(store.rootNodes.map((n) => n.id)).toEqual([a.id, b.id])
    })
  })

  describe('reorder', () => {
    it('루트 노드를 한 단계 뒤(+1 idx)로 이동', () => {
      const store = useEditorStore()
      const a = createTextNode()
      const b = createTextNode()
      const c = createTextNode()
      store.addNode(a, null)
      store.addNode(b, null)
      store.addNode(c, null)
      store.reorder(a.id, 1)
      expect(store.page.rootIds).toEqual([b.id, a.id, c.id])
    })

    it('루트 노드를 한 단계 앞(-1 idx)으로 이동', () => {
      const store = useEditorStore()
      const a = createTextNode()
      const b = createTextNode()
      store.addNode(a, null)
      store.addNode(b, null)
      store.reorder(b.id, -1)
      expect(store.page.rootIds).toEqual([b.id, a.id])
    })

    it('경계(맨 앞)에서 -1 호출은 변화 없음', () => {
      const store = useEditorStore()
      const a = createTextNode()
      const b = createTextNode()
      store.addNode(a, null)
      store.addNode(b, null)
      store.reorder(a.id, -1)
      expect(store.page.rootIds).toEqual([a.id, b.id])
    })

    it('Frame 자식 내부에서 reorder 동작', () => {
      const store = useEditorStore()
      const frame = createFrameNode()
      store.addNode(frame, null)
      const c1 = createTextNode()
      const c2 = createTextNode()
      store.addNode(c1, frame.id)
      store.addNode(c2, frame.id)
      store.reorder(c1.id, 1)
      const fr = store.nodes[frame.id] as FrameNode
      expect(fr.childIds).toEqual([c2.id, c1.id])
    })

    it('reorder는 history에 commit 된다 (undo로 원복)', () => {
      const store = useEditorStore()
      const a = createTextNode()
      const b = createTextNode()
      store.addNode(a, null)
      store.addNode(b, null)
      store.reorder(a.id, 1)
      store.undo()
      expect(store.page.rootIds).toEqual([a.id, b.id])
    })
  })

  describe('reset', () => {
    it('초기 상태로 되돌린다', () => {
      const store = useEditorStore()
      store.addNode(createTextNode(), null)
      store.select(Object.keys(store.nodes)[0]!)
      store.reset()
      expect(store.nodes).toEqual({})
      expect(store.page.rootIds).toEqual([])
      expect(store.selectedId).toBeNull()
    })
  })

  describe('bringToFront / bringToBack', () => {
    it('bringToFront(root): rootIds 끝으로 이동 (맨 위로)', () => {
      const store = useEditorStore()
      const a = createTextNode()
      const b = createTextNode()
      const c = createTextNode()
      store.addNode(a, null)
      store.addNode(b, null)
      store.addNode(c, null)
      // 초기: [a, b, c]. a를 맨 앞(위)로 올리면 [b, c, a]
      store.bringToFront(a.id)
      expect(store.page.rootIds).toEqual([b.id, c.id, a.id])
    })

    it('bringToBack(root): rootIds 처음으로 이동 (맨 아래)', () => {
      const store = useEditorStore()
      const a = createTextNode()
      const b = createTextNode()
      const c = createTextNode()
      store.addNode(a, null)
      store.addNode(b, null)
      store.addNode(c, null)
      store.bringToBack(c.id)
      expect(store.page.rootIds).toEqual([c.id, a.id, b.id])
    })

    it('bringToFront(frame child): 부모 childIds 끝으로 이동', () => {
      const store = useEditorStore()
      const frame = createFrameNode()
      const c1 = createTextNode()
      const c2 = createTextNode()
      store.addNode(frame, null)
      store.addNode(c1, frame.id)
      store.addNode(c2, frame.id)
      store.bringToFront(c1.id)
      expect((store.nodes[frame.id] as FrameNode).childIds).toEqual([
        c2.id,
        c1.id,
      ])
    })

    it('bringToBack(frame child): 부모 childIds 처음으로 이동', () => {
      const store = useEditorStore()
      const frame = createFrameNode()
      const c1 = createTextNode()
      const c2 = createTextNode()
      store.addNode(frame, null)
      store.addNode(c1, frame.id)
      store.addNode(c2, frame.id)
      store.bringToBack(c2.id)
      expect((store.nodes[frame.id] as FrameNode).childIds).toEqual([
        c2.id,
        c1.id,
      ])
    })

    it('이미 맨 앞/뒤이면 no-op (history commit도 안 함)', () => {
      const store = useEditorStore()
      const a = createTextNode()
      const b = createTextNode()
      store.addNode(a, null)
      store.addNode(b, null)
      const rootBefore = [...store.page.rootIds]
      store.bringToFront(b.id) // 이미 끝 → no-op
      expect(store.page.rootIds).toEqual(rootBefore)
      store.bringToBack(a.id) // 이미 시작 → no-op
      expect(store.page.rootIds).toEqual(rootBefore)
    })

    it('존재하지 않는 id는 no-op', () => {
      const store = useEditorStore()
      expect(() => store.bringToFront('nope')).not.toThrow()
      expect(() => store.bringToBack('nope')).not.toThrow()
    })
  })

  describe('editingId (인플레이스 편집)', () => {
    it('초기값은 null', () => {
      const store = useEditorStore()
      expect(store.editingId).toBe(null)
    })

    it('startEdit(id)은 존재하는 노드일 때만 editingId 세팅', () => {
      const store = useEditorStore()
      const node = createTextNode()
      store.addNode(node, null)
      store.startEdit(node.id)
      expect(store.editingId).toBe(node.id)
    })

    it('startEdit(id) — 존재하지 않는 id면 no-op', () => {
      const store = useEditorStore()
      store.startEdit('nope')
      expect(store.editingId).toBe(null)
    })

    it('startEdit(id) — locked 노드면 진입 금지', () => {
      const store = useEditorStore()
      const node = createTextNode()
      store.addNode(node, null)
      store.updateNode(node.id, { locked: true })
      store.startEdit(node.id)
      expect(store.editingId).toBe(null)
    })

    it('endEdit은 editingId를 null로', () => {
      const store = useEditorStore()
      const node = createTextNode()
      store.addNode(node, null)
      store.startEdit(node.id)
      store.endEdit()
      expect(store.editingId).toBe(null)
    })

    it('select(다른 id) 호출 시 진행중인 편집은 종료', () => {
      const store = useEditorStore()
      const a = createTextNode()
      const b = createTextNode()
      store.addNode(a, null)
      store.addNode(b, null)
      store.startEdit(a.id)
      store.select(b.id)
      expect(store.editingId).toBe(null)
    })

    it('편집 중인 노드를 deleteNode하면 editingId도 해제', () => {
      const store = useEditorStore()
      const node = createTextNode()
      store.addNode(node, null)
      store.startEdit(node.id)
      store.deleteNode(node.id)
      expect(store.editingId).toBe(null)
    })

    it('reset / loadProject 후 editingId=null', () => {
      const store = useEditorStore()
      const node = createTextNode()
      store.addNode(node, null)
      store.startEdit(node.id)
      store.reset()
      expect(store.editingId).toBe(null)
    })
  })

  describe('loadProject', () => {
    it('외부 Project를 통째로 로드한다', () => {
      const store = useEditorStore()
      const node = createTextNode()
      store.loadProject({
        version: 1,
        name: 'Test',
        page: {
          id: 'p1',
          name: 'Page',
          width: 1280,
          height: 800,
          background: '#fff',
          rootIds: [node.id],
        },
        nodes: { [node.id]: node },
        masters: {},
        updatedAt: 0,
      })
      expect(store.page.name).toBe('Page')
      expect(store.nodes[node.id]).toBeDefined()
      expect(store.page.rootIds).toEqual([node.id])
    })
  })

  describe('undo/redo 통합', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 0, 1))
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('addNode 후 undo는 빈 상태로 복원', () => {
      const store = useEditorStore()
      expect(store.canUndo).toBe(false)
      store.addNode(createTextNode(), null)
      expect(store.canUndo).toBe(true)
      store.undo()
      expect(store.nodes).toEqual({})
      expect(store.page.rootIds).toEqual([])
      expect(store.canRedo).toBe(true)
    })

    it('undo 후 redo는 추가된 상태로 복원', () => {
      const store = useEditorStore()
      const node = createTextNode()
      store.addNode(node, null)
      store.undo()
      store.redo()
      expect(store.nodes[node.id]).toBeDefined()
      expect(store.page.rootIds).toEqual([node.id])
    })

    it('updateNode 빠른 연쇄는 1번의 undo로 모두 되돌린다', () => {
      const store = useEditorStore()
      const node = createTextNode({ x: 0 })
      store.addNode(node, null)
      // updateNode 5번 (같은 노드 → 같은 coalesceKey, 시간 윈도우 내)
      store.updateNode(node.id, { x: 10 })
      store.updateNode(node.id, { x: 20 })
      store.updateNode(node.id, { x: 30 })
      store.updateNode(node.id, { x: 40 })
      store.updateNode(node.id, { x: 50 })
      expect(store.nodes[node.id]!.x).toBe(50)
      store.undo()
      // 모든 update가 합쳐져서 첫 update 직전(addNode 직후) 상태로 복원
      expect(store.nodes[node.id]!.x).toBe(0)
    })

    it('updateNode 시간 윈도우 초과 시 별개 history로 누적', () => {
      const store = useEditorStore()
      const node = createTextNode({ x: 0 })
      store.addNode(node, null)
      store.updateNode(node.id, { x: 10 })
      vi.advanceTimersByTime(600)
      store.updateNode(node.id, { x: 20 })
      store.undo()
      expect(store.nodes[node.id]!.x).toBe(10)
      store.undo()
      expect(store.nodes[node.id]!.x).toBe(0)
    })

    it('새 변경 후에는 redo 불가능', () => {
      const store = useEditorStore()
      store.addNode(createTextNode(), null)
      store.undo()
      expect(store.canRedo).toBe(true)
      store.addNode(createTextNode(), null)
      expect(store.canRedo).toBe(false)
    })

    it('reset/loadProject는 history를 비운다', () => {
      const store = useEditorStore()
      store.addNode(createTextNode(), null)
      store.reset()
      expect(store.canUndo).toBe(false)
    })

    it('빈 history에서 undo/redo 호출은 no-op', () => {
      const store = useEditorStore()
      store.undo()
      store.redo()
      expect(store.nodes).toEqual({})
    })
  })
})

describe('createComponent (Frame → Master 변환)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('Frame을 선택 후 createComponent 호출하면 같은 자리에 Instance가 생기고 masters에 등록된다', () => {
    const editor = useEditorStore()
    const frame = createFrameNode({ x: 10, y: 20, width: 200, height: 100 })
    editor.addNode(frame, null)
    const child = createTextNode({ x: 5, y: 5, width: 50, height: 20 })
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
    const text = createTextNode({ x: 0, y: 0, width: 50, height: 20 })
    editor.addNode(text, null)
    const before = JSON.stringify({ nodes: editor.nodes, masters: editor.masters })

    const ok = editor.createComponent(text.id)
    expect(ok).toBe(false)
    const after = JSON.stringify({ nodes: editor.nodes, masters: editor.masters })
    expect(after).toBe(before)
  })

  it('변환은 하나의 undo 단위 — undo 후 Frame이 복원된다', () => {
    const editor = useEditorStore()
    const frame = createFrameNode({ x: 0, y: 0, width: 100, height: 100 })
    editor.addNode(frame, null)
    editor.createComponent(frame.id)
    expect(editor.nodes[frame.id].type).toBe('instance')

    editor.undo()
    expect(editor.nodes[frame.id].type).toBe('frame')
    expect(Object.keys(editor.masters)).toHaveLength(0)
  })
})
