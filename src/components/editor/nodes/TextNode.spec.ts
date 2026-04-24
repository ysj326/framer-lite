import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import TextNode from './TextNode.vue'
import { useEditorStore } from '@/stores/editor'
import { createTextNode } from '@/composables/useNodeFactory'

describe('TextNode', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('일반 상태에서 content를 div로 렌더', () => {
    const editor = useEditorStore()
    const node = createTextNode({ content: '안녕' })
    editor.addNode(node, null)
    const w = mount(TextNode, {
      props: { node: editor.nodes[node.id] as never },
    })
    expect(w.text()).toContain('안녕')
    expect(w.find('[contenteditable="true"]').exists()).toBe(false)
  })

  it('더블클릭 → editor.startEdit(id) 호출로 editingId 세팅', async () => {
    const editor = useEditorStore()
    const node = createTextNode()
    editor.addNode(node, null)
    const w = mount(TextNode, {
      props: { node: editor.nodes[node.id] as never },
      attachTo: document.body,
    })
    await w.trigger('dblclick')
    expect(editor.editingId).toBe(node.id)
    w.unmount()
  })

  it('편집 진입 시 contenteditable 영역이 렌더되고 content가 DOM에 반영', async () => {
    const editor = useEditorStore()
    const node = createTextNode({ content: '원본' })
    editor.addNode(node, null)
    editor.startEdit(node.id)
    const w = mount(TextNode, {
      props: { node: editor.nodes[node.id] as never },
      attachTo: document.body,
    })
    await flushPromises()
    const editable = w.find('[contenteditable="true"]')
    expect(editable.exists()).toBe(true)
    expect(editable.text()).toContain('원본')
    w.unmount()
  })

  it('편집 중 blur → 수정된 값으로 updateNode + 편집 종료', async () => {
    const editor = useEditorStore()
    const node = createTextNode({ content: '원본' })
    editor.addNode(node, null)
    editor.startEdit(node.id)
    const w = mount(TextNode, {
      props: { node: editor.nodes[node.id] as never },
      attachTo: document.body,
    })
    await flushPromises()
    const editable = w.find('[contenteditable="true"]')
    ;(editable.element as HTMLElement).innerText = '수정됨'
    await editable.trigger('blur')
    expect(editor.editingId).toBe(null)
    // updateNode가 data.content를 갱신
    const updated = editor.nodes[node.id] as ReturnType<typeof createTextNode>
    expect(updated.data.content).toBe('수정됨')
    w.unmount()
  })

  it('Escape → 편집만 종료, updateNode는 호출되지 않음', async () => {
    const editor = useEditorStore()
    const node = createTextNode({ content: '원본' })
    editor.addNode(node, null)
    editor.startEdit(node.id)
    const w = mount(TextNode, {
      props: { node: editor.nodes[node.id] as never },
      attachTo: document.body,
    })
    await flushPromises()
    const editable = w.find('[contenteditable="true"]')
    ;(editable.element as HTMLElement).innerText = '저장 안 됨'
    await editable.trigger('keydown', { key: 'Escape' })
    expect(editor.editingId).toBe(null)
    const after = editor.nodes[node.id] as ReturnType<typeof createTextNode>
    expect(after.data.content).toBe('원본')
    w.unmount()
  })
})
