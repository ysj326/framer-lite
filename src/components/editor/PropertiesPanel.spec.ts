import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PropertiesPanel from './PropertiesPanel.vue'
import { useEditorStore } from '@/stores/editor'
import {
  createTextNode,
  createImageNode,
  createButtonNode,
  createFrameNode,
  createShapeNode,
} from '@/composables/useNodeFactory'

describe('PropertiesPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('선택 없으면 안내 문구 표시', () => {
    const w = mount(PropertiesPanel)
    expect(w.text()).toContain('노드를 선택하세요')
  })

  it('text 노드 선택 시 노드 이름·타입과 TextProperties 컴포넌트 렌더', async () => {
    const editor = useEditorStore()
    const node = createTextNode({ name: 'My Title' })
    editor.addNode(node, null)
    editor.select(node.id)
    const w = mount(PropertiesPanel)
    expect(w.text()).toContain('My Title')
    expect(w.text()).toContain('text')
    // CommonProperties + TextProperties 모두 mount
    expect(w.find('legend').exists()).toBe(true)
    expect(w.text()).toContain('Text') // TextProperties legend
  })

  it.each([
    ['image', () => createImageNode(), 'Image'],
    ['button', () => createButtonNode(), 'Button'],
    ['shape', () => createShapeNode(), 'Shape'],
  ])('%s 노드 선택 시 %s legend가 표시 (분기 컴포넌트 마운트)', async (_type, factory, legendText) => {
    const editor = useEditorStore()
    const node = factory()
    editor.addNode(node, null)
    editor.select(node.id)
    const w = mount(PropertiesPanel)
    const legends = w.findAll('legend').map((l) => l.text())
    expect(legends).toContain(legendText)
  })

  it('frame 노드 선택 시에는 Layout/Style 외 추가 type-specific 섹션 없음', async () => {
    const editor = useEditorStore()
    const node = createFrameNode()
    editor.addNode(node, null)
    editor.select(node.id)
    const w = mount(PropertiesPanel)
    const legends = w.findAll('legend').map((l) => l.text())
    expect(legends).toEqual(['Layout', 'Style'])
  })

  it('Common 입력 변경 시 store에 즉시 반영 (양방향 바인딩)', async () => {
    const editor = useEditorStore()
    const node = createTextNode({ x: 0 })
    editor.addNode(node, null)
    editor.select(node.id)
    const w = mount(PropertiesPanel)
    const xInput = w.find('input[type="number"]')
    expect(xInput.exists()).toBe(true)
    await xInput.setValue(99)
    expect(editor.nodes[node.id]!.x).toBe(99)
  })

  it('Rotation 입력으로 node.rotation을 갱신', async () => {
    const editor = useEditorStore()
    const node = createTextNode({ rotation: 0 })
    editor.addNode(node, null)
    editor.select(node.id)
    const w = mount(PropertiesPanel)
    const rotationInput = w.find('input[data-field="rotation"]')
    expect(rotationInput.exists()).toBe(true)
    await rotationInput.setValue(45)
    expect(editor.nodes[node.id]!.rotation).toBe(45)
  })
})
