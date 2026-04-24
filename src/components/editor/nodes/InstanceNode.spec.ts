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
