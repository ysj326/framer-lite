import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { effectScope, type EffectScope } from 'vue'
import { useShortcuts } from './useShortcuts'
import { useEditorStore } from '@/stores/editor'
import { createTextNode } from './useNodeFactory'

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
})
