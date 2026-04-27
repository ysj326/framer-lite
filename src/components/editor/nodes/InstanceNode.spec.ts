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

  it('Instance 루트 div에 data-node-id 속성과 nodeBoxStyle 좌표가 적용된다', () => {
    const editor = useEditorStore()
    editor.masters.m1 = {
      id: 'm1', name: 'Card', rootId: 'r', createdAt: 0, updatedAt: 0,
      nodes: {
        r: {
          id: 'r', type: 'frame', name: 'root',
          parentId: null, childIds: [],
          x: 0, y: 0, width: 100, height: 50, rotation: 0,
          zIndex: 0, visible: true, locked: false, style: {}, data: {},
        },
      },
    }
    const inst: InstanceNodeType = {
      id: 'i1', type: 'instance', name: 'Card',
      parentId: null, childIds: [],
      x: 30, y: 40, width: 100, height: 50, rotation: 0,
      zIndex: 0, visible: true, locked: false, style: {},
      data: { masterId: 'm1', overrides: {} },
    }
    editor.nodes[inst.id] = inst
    const wrapper = mount(InstanceNode, { props: { node: inst } })
    const root = wrapper.find('[data-node-id="i1"]')
    expect(root.exists()).toBe(true)
    const styleAttr = root.attributes('style') ?? ''
    expect(styleAttr).toMatch(/left:\s*30px/)
    expect(styleAttr).toMatch(/top:\s*40px/)
  })

  it('master rootFrame의 backgroundColor가 wrapper에 계승된다', () => {
    const editor = useEditorStore()
    editor.masters.m1 = {
      id: 'm1', name: 'Card', rootId: 'r', createdAt: 0, updatedAt: 0,
      nodes: {
        r: {
          id: 'r', type: 'frame', name: 'root',
          parentId: null, childIds: [],
          x: 0, y: 0, width: 100, height: 50, rotation: 0,
          zIndex: 0, visible: true, locked: false,
          style: { backgroundColor: 'rgb(255, 0, 0)', borderRadius: 8 },
          data: {},
        },
      },
    }
    const inst: InstanceNodeType = {
      id: 'i1', type: 'instance', name: 'Card',
      parentId: null, childIds: [],
      x: 0, y: 0, width: 100, height: 50, rotation: 0,
      zIndex: 0, visible: true, locked: false, style: {},
      data: { masterId: 'm1', overrides: {} },
    }
    editor.nodes[inst.id] = inst
    const wrapper = mount(InstanceNode, { props: { node: inst } })
    const styleAttr = wrapper.find('[data-node-id="i1"]').attributes('style') ?? ''
    expect(styleAttr).toMatch(/background-color:\s*rgb\(255,\s*0,\s*0\)/)
    expect(styleAttr).toMatch(/border-radius:\s*8px/)
  })

  it('루트 div 클릭 시 editor.select가 호출된다', async () => {
    const editor = useEditorStore()
    editor.masters.m1 = {
      id: 'm1', name: 'Card', rootId: 'r', createdAt: 0, updatedAt: 0,
      nodes: {
        r: {
          id: 'r', type: 'frame', name: 'root',
          parentId: null, childIds: [],
          x: 0, y: 0, width: 100, height: 50, rotation: 0,
          zIndex: 0, visible: true, locked: false, style: {}, data: {},
        },
      },
    }
    const inst: InstanceNodeType = {
      id: 'i1', type: 'instance', name: 'Card',
      parentId: null, childIds: [],
      x: 30, y: 40, width: 100, height: 50, rotation: 0,
      zIndex: 0, visible: true, locked: false, style: {},
      data: { masterId: 'm1', overrides: {} },
    }
    editor.nodes[inst.id] = inst
    const wrapper = mount(InstanceNode, { props: { node: inst } })
    await wrapper.find('[data-node-id="i1"]').trigger('click')
    expect(editor.selectedId).toBe('i1')
  })
})
