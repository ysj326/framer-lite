import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ButtonNode from './ButtonNode.vue'
import { useEditorStore } from '@/stores/editor'
import { createButtonNode } from '@/composables/useNodeFactory'

describe('ButtonNode', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('일반 상태에서 label 렌더', () => {
    const editor = useEditorStore()
    const node = createButtonNode({ label: 'Click me' })
    editor.addNode(node, null)
    const w = mount(ButtonNode, {
      props: { node: editor.nodes[node.id] as never },
    })
    expect(w.text()).toContain('Click me')
    expect(w.find('[contenteditable="true"]').exists()).toBe(false)
  })

  it('더블클릭 → editor.startEdit(id)', async () => {
    const editor = useEditorStore()
    const node = createButtonNode()
    editor.addNode(node, null)
    const w = mount(ButtonNode, {
      props: { node: editor.nodes[node.id] as never },
      attachTo: document.body,
    })
    await w.trigger('dblclick')
    expect(editor.editingId).toBe(node.id)
    w.unmount()
  })

  it('Enter 키 → 수정된 값으로 updateNode(label) + 편집 종료 (single line)', async () => {
    const editor = useEditorStore()
    const node = createButtonNode({ label: '원래' })
    editor.addNode(node, null)
    editor.startEdit(node.id)
    const w = mount(ButtonNode, {
      props: { node: editor.nodes[node.id] as never },
      attachTo: document.body,
    })
    await flushPromises()
    const editable = w.find('[contenteditable="true"]')
    ;(editable.element as HTMLElement).innerText = '새 라벨'
    await editable.trigger('keydown', { key: 'Enter' })
    expect(editor.editingId).toBe(null)
    const updated = editor.nodes[node.id] as ReturnType<typeof createButtonNode>
    expect(updated.data.label).toBe('새 라벨')
    w.unmount()
  })

  it('blur → updateNode + 편집 종료', async () => {
    const editor = useEditorStore()
    const node = createButtonNode({ label: '원래' })
    editor.addNode(node, null)
    editor.startEdit(node.id)
    const w = mount(ButtonNode, {
      props: { node: editor.nodes[node.id] as never },
      attachTo: document.body,
    })
    await flushPromises()
    const editable = w.find('[contenteditable="true"]')
    ;(editable.element as HTMLElement).innerText = 'blurred'
    await editable.trigger('blur')
    expect(editor.editingId).toBe(null)
    const updated = editor.nodes[node.id] as ReturnType<typeof createButtonNode>
    expect(updated.data.label).toBe('blurred')
    w.unmount()
  })

  it('Escape → 편집만 종료, label 유지', async () => {
    const editor = useEditorStore()
    const node = createButtonNode({ label: '원래' })
    editor.addNode(node, null)
    editor.startEdit(node.id)
    const w = mount(ButtonNode, {
      props: { node: editor.nodes[node.id] as never },
      attachTo: document.body,
    })
    await flushPromises()
    const editable = w.find('[contenteditable="true"]')
    ;(editable.element as HTMLElement).innerText = '저장 안 됨'
    await editable.trigger('keydown', { key: 'Escape' })
    expect(editor.editingId).toBe(null)
    const after = editor.nodes[node.id] as ReturnType<typeof createButtonNode>
    expect(after.data.label).toBe('원래')
    w.unmount()
  })
})
