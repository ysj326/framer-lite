import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import Canvas from './Canvas.vue'
import { useEditorStore } from '@/stores/editor'
import {
  createTextNode,
  createFrameNode,
} from '@/composables/useNodeFactory'

describe('Canvas (통합)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('빈 상태에서도 캔버스 컨테이너만 렌더', () => {
    const wrapper = mount(Canvas)
    expect(wrapper.find('.canvas').exists()).toBe(true)
  })

  it('루트 노드의 텍스트 콘텐츠가 DOM에 표시', () => {
    const editor = useEditorStore()
    editor.addNode(createTextNode({ content: 'Hello canvas' }), null)
    const wrapper = mount(Canvas)
    expect(wrapper.text()).toContain('Hello canvas')
  })

  it('Frame 자식 노드가 재귀 렌더된다', () => {
    const editor = useEditorStore()
    const frame = createFrameNode()
    editor.addNode(frame, null)
    editor.addNode(createTextNode({ content: 'inside frame' }), frame.id)
    const wrapper = mount(Canvas)
    expect(wrapper.text()).toContain('inside frame')
  })

  it('각 노드는 절대 위치(left/top) 스타일을 가진다', () => {
    const editor = useEditorStore()
    editor.addNode(createTextNode({ x: 30, y: 40 }), null)
    const wrapper = mount(Canvas)
    const node = wrapper.find('.node--text')
    expect(node.exists()).toBe(true)
    const style = node.attributes('style') ?? ''
    expect(style).toContain('left: 30px')
    expect(style).toContain('top: 40px')
    expect(style).toContain('position: absolute')
  })

  it('노드 클릭 시 해당 id가 선택된다', async () => {
    const editor = useEditorStore()
    const node = createTextNode()
    editor.addNode(node, null)
    const wrapper = mount(Canvas)
    await wrapper.find(`[data-node-id="${node.id}"]`).trigger('click')
    expect(editor.selectedId).toBe(node.id)
  })

  it('빈 캔버스 영역 클릭 시 선택이 해제된다', async () => {
    const editor = useEditorStore()
    const node = createTextNode()
    editor.addNode(node, null)
    editor.select(node.id)
    const wrapper = mount(Canvas)
    await wrapper.find('.canvas').trigger('click')
    expect(editor.selectedId).toBeNull()
  })

  it('선택된 노드는 .node--selected 클래스를 가진다', async () => {
    const editor = useEditorStore()
    const node = createTextNode()
    editor.addNode(node, null)
    editor.select(node.id)
    const wrapper = mount(Canvas)
    expect(wrapper.find(`[data-node-id="${node.id}"]`).classes()).toContain('node--selected')
  })
})
