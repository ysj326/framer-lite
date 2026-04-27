import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import LayerItem from './LayerItem.vue'
import { useEditorStore } from '@/stores/editor'
import {
  createTextNode,
  createFrameNode,
} from '@/composables/useNodeFactory'
import type { FrameNode } from '@/types/node'

describe('LayerItem', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('노드 이름과 타입을 표시한다', () => {
    const editor = useEditorStore()
    const node = createTextNode({ name: 'Hello' })
    editor.addNode(node, null)
    const w = mount(LayerItem, { props: { node, depth: 0 } })
    expect(w.text()).toContain('Hello')
    expect(w.text()).toContain('text')
  })

  it('row 클릭 시 store가 해당 노드를 선택한다', async () => {
    const editor = useEditorStore()
    const node = createTextNode()
    editor.addNode(node, null)
    const w = mount(LayerItem, { props: { node, depth: 0 } })
    await w.find('.layer-item__row').trigger('click')
    expect(editor.selectedId).toBe(node.id)
  })

  it('isSelected 노드는 selected 클래스를 가진다', () => {
    const editor = useEditorStore()
    const node = createTextNode()
    editor.addNode(node, null)
    editor.select(node.id)
    const w = mount(LayerItem, { props: { node, depth: 0 } })
    expect(w.find('.layer-item__row').classes()).toContain('layer-item__row--selected')
  })

  it('가시성 버튼 클릭 시 visible이 토글된다', async () => {
    const editor = useEditorStore()
    const node = createTextNode()
    editor.addNode(node, null)
    const w = mount(LayerItem, { props: { node, depth: 0 } })
    const visibilityBtn = w.findAll('.layer-item__btn').find((b) => b.text().includes('👁'))!
    await visibilityBtn.trigger('click')
    expect(editor.nodes[node.id]!.visible).toBe(false)
  })

  it('▲ 클릭 시 reorder(+1)로 z-order가 증가', async () => {
    const editor = useEditorStore()
    const a = createTextNode()
    const b = createTextNode()
    editor.addNode(a, null)
    editor.addNode(b, null)
    // a는 idx 0 → ▲ 클릭 시 idx 1로 (b와 swap)
    const w = mount(LayerItem, { props: { node: a, depth: 0 } })
    const upBtn = w.findAll('.layer-item__btn').find((b) => b.text() === '▲')!
    await upBtn.trigger('click')
    expect(editor.page.rootIds).toEqual([b.id, a.id])
  })

  it('▼ 클릭 시 reorder(-1)로 z-order가 감소', async () => {
    const editor = useEditorStore()
    const a = createTextNode()
    const b = createTextNode()
    editor.addNode(a, null)
    editor.addNode(b, null)
    const w = mount(LayerItem, { props: { node: b, depth: 0 } })
    const downBtn = w.findAll('.layer-item__btn').find((b) => b.text() === '▼')!
    await downBtn.trigger('click')
    expect(editor.page.rootIds).toEqual([b.id, a.id])
  })

  it('Frame은 자식 노드를 재귀 렌더 (역순으로)', () => {
    const editor = useEditorStore()
    const frame = createFrameNode({ name: 'F' })
    editor.addNode(frame, null)
    const c1 = createTextNode({ name: 'A' })
    const c2 = createTextNode({ name: 'B' })
    editor.addNode(c1, frame.id)
    editor.addNode(c2, frame.id)
    const w = mount(LayerItem, {
      props: { node: editor.nodes[frame.id] as FrameNode, depth: 0 },
    })
    // 자식 LayerItem 두 개 렌더 (reverse — B가 먼저, A가 나중)
    const childRows = w.findAll('.layer-item .layer-item .layer-item__row')
    expect(childRows.length).toBe(2)
    expect(childRows[0]!.text()).toContain('B')
    expect(childRows[1]!.text()).toContain('A')
  })

  it('depth가 paddingLeft에 반영된다', () => {
    const editor = useEditorStore()
    const node = createTextNode()
    editor.addNode(node, null)
    const w = mount(LayerItem, { props: { node, depth: 2 } })
    const style = w.find('.layer-item__row').attributes('style') ?? ''
    expect(style).toContain('padding-left:')
    // depth*12 + 8 = 32px
    expect(style).toContain('32px')
  })

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

  it('Instance 노드의 라벨 앞에 다이아몬드 ◆ 아이콘이 표시된다', () => {
    const editor = useEditorStore()
    const inst = {
      id: 'i', type: 'instance' as const, name: 'MyCard',
      parentId: null, childIds: [],
      x: 0, y: 0, width: 10, height: 10, rotation: 0,
      zIndex: 0, visible: true, locked: false, style: {},
      data: { masterId: 'mx', overrides: {} },
    }
    editor.nodes[inst.id] = inst

    const wrapper = mount(LayerItem, { props: { node: inst, depth: 0 } })
    expect(wrapper.text()).toContain('◆')
  })
})
