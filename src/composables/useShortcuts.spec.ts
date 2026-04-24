import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { effectScope, type EffectScope } from 'vue'
import { useShortcuts } from './useShortcuts'
import { useEditorStore } from '@/stores/editor'
import { createTextNode, createFrameNode } from './useNodeFactory'

describe('useShortcuts', () => {
  let scope: EffectScope

  beforeEach(() => {
    setActivePinia(createPinia())
    scope = effectScope()
    scope.run(() => {
      useShortcuts()
    })
  })

  afterEach(() => {
    scope.stop()
  })

  it('Delete 키 → 선택 노드 삭제', () => {
    const editor = useEditorStore()
    const node = createTextNode()
    editor.addNode(node, null)
    editor.select(node.id)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }))
    expect(editor.nodes[node.id]).toBeUndefined()
    expect(editor.selectedId).toBeNull()
  })

  it('Backspace 키 → 선택 노드 삭제', () => {
    const editor = useEditorStore()
    const node = createTextNode()
    editor.addNode(node, null)
    editor.select(node.id)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }))
    expect(editor.nodes[node.id]).toBeUndefined()
  })

  it('선택 없을 때 Delete는 no-op', () => {
    const editor = useEditorStore()
    editor.addNode(createTextNode(), null)
    expect(Object.keys(editor.nodes)).toHaveLength(1)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }))
    expect(Object.keys(editor.nodes)).toHaveLength(1)
  })

  it('Cmd+Z → undo', () => {
    const editor = useEditorStore()
    editor.addNode(createTextNode(), null)
    expect(Object.keys(editor.nodes)).toHaveLength(1)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true }))
    expect(Object.keys(editor.nodes)).toHaveLength(0)
  })

  it('Ctrl+Z → undo (비-Mac)', () => {
    const editor = useEditorStore()
    editor.addNode(createTextNode(), null)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    expect(Object.keys(editor.nodes)).toHaveLength(0)
  })

  it('Shift+Cmd+Z → redo', () => {
    const editor = useEditorStore()
    editor.addNode(createTextNode(), null)
    editor.undo()
    expect(Object.keys(editor.nodes)).toHaveLength(0)
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', metaKey: true, shiftKey: true }),
    )
    expect(Object.keys(editor.nodes)).toHaveLength(1)
  })

  it('Cmd+D → 선택 노드 복제 후 새 id 선택', () => {
    const editor = useEditorStore()
    const node = createTextNode()
    editor.addNode(node, null)
    editor.select(node.id)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', metaKey: true }))
    expect(Object.keys(editor.nodes)).toHaveLength(2)
    expect(editor.selectedId).not.toBe(node.id)
  })

  it('input 포커스 중에는 단축키 무시', () => {
    const editor = useEditorStore()
    const node = createTextNode()
    editor.addNode(node, null)
    editor.select(node.id)
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))
    expect(editor.nodes[node.id]).toBeDefined()
    document.body.removeChild(input)
  })

  describe('Arrow 키 nudge', () => {
    it('ArrowRight → x += 1 (기본 1px)', () => {
      const editor = useEditorStore()
      const node = createTextNode({ x: 10, y: 20 })
      editor.addNode(node, null)
      editor.select(node.id)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      expect(editor.nodes[node.id]!.x).toBe(11)
      expect(editor.nodes[node.id]!.y).toBe(20)
    })

    it('ArrowLeft → x -= 1', () => {
      const editor = useEditorStore()
      const node = createTextNode({ x: 10, y: 20 })
      editor.addNode(node, null)
      editor.select(node.id)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
      expect(editor.nodes[node.id]!.x).toBe(9)
    })

    it('ArrowDown → y += 1', () => {
      const editor = useEditorStore()
      const node = createTextNode({ x: 10, y: 20 })
      editor.addNode(node, null)
      editor.select(node.id)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
      expect(editor.nodes[node.id]!.y).toBe(21)
    })

    it('ArrowUp → y -= 1', () => {
      const editor = useEditorStore()
      const node = createTextNode({ x: 10, y: 20 })
      editor.addNode(node, null)
      editor.select(node.id)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
      expect(editor.nodes[node.id]!.y).toBe(19)
    })

    it('Shift+Arrow → step 10px', () => {
      const editor = useEditorStore()
      const node = createTextNode({ x: 100, y: 100 })
      editor.addNode(node, null)
      editor.select(node.id)
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true }),
      )
      expect(editor.nodes[node.id]!.x).toBe(110)
    })

    it('선택 없으면 Arrow는 no-op', () => {
      const editor = useEditorStore()
      const node = createTextNode({ x: 0, y: 0 })
      editor.addNode(node, null)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      expect(editor.nodes[node.id]!.x).toBe(0)
    })
  })

  describe('z-order 단축키', () => {
    it('Cmd+] → reorder +1 (한 단계 위)', () => {
      const editor = useEditorStore()
      const a = createTextNode()
      const b = createTextNode()
      editor.addNode(a, null)
      editor.addNode(b, null)
      editor.select(a.id)
      // 초기 [a, b]. a를 한 단계 위로 → [b, a]
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: ']', metaKey: true }),
      )
      expect(editor.page.rootIds).toEqual([b.id, a.id])
    })

    it('Cmd+[ → reorder -1 (한 단계 아래)', () => {
      const editor = useEditorStore()
      const a = createTextNode()
      const b = createTextNode()
      editor.addNode(a, null)
      editor.addNode(b, null)
      editor.select(b.id)
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: '[', metaKey: true }),
      )
      expect(editor.page.rootIds).toEqual([b.id, a.id])
    })

    it('Cmd+Shift+] → bringToFront (맨 위)', () => {
      const editor = useEditorStore()
      const a = createTextNode()
      const b = createTextNode()
      const c = createTextNode()
      editor.addNode(a, null)
      editor.addNode(b, null)
      editor.addNode(c, null)
      editor.select(a.id)
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: ']', metaKey: true, shiftKey: true }),
      )
      expect(editor.page.rootIds).toEqual([b.id, c.id, a.id])
    })

    it('Cmd+Shift+[ → bringToBack (맨 아래)', () => {
      const editor = useEditorStore()
      const a = createTextNode()
      const b = createTextNode()
      const c = createTextNode()
      editor.addNode(a, null)
      editor.addNode(b, null)
      editor.addNode(c, null)
      editor.select(c.id)
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: '[', metaKey: true, shiftKey: true }),
      )
      expect(editor.page.rootIds).toEqual([c.id, a.id, b.id])
    })

    it('선택 없으면 z-order 단축키 무시', () => {
      const editor = useEditorStore()
      const a = createTextNode()
      const b = createTextNode()
      editor.addNode(a, null)
      editor.addNode(b, null)
      const before = [...editor.page.rootIds]
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: ']', metaKey: true }),
      )
      expect(editor.page.rootIds).toEqual(before)
    })
  })

  it('Cmd+Alt+K: Frame이 선택돼 있으면 createComponent를 호출한다', () => {
    const editor = useEditorStore()
    const frame = createFrameNode()
    editor.addNode(frame, null)
    editor.select(frame.id)
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, altKey: true }),
    )
    expect(editor.nodes[frame.id]!.type).toBe('instance')
  })

  it('Cmd+Alt+K: Frame이 아닌 선택이면 no-op', () => {
    const editor = useEditorStore()
    const text = createTextNode()
    editor.addNode(text, null)
    editor.select(text.id)
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, altKey: true }),
    )
    expect(editor.nodes[text.id]!.type).toBe('text')
  })
})
