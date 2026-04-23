import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import LayersPanel from './LayersPanel.vue'
import { useEditorStore } from '@/stores/editor'
import { createTextNode } from '@/composables/useNodeFactory'

describe('LayersPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('빈 상태 메시지 표시', () => {
    const w = mount(LayersPanel)
    expect(w.text()).toContain('노드 없음')
  })

  it('루트 노드를 z-order 역순으로 표시 (위 = z 위)', () => {
    const editor = useEditorStore()
    const a = createTextNode({ name: 'A' })
    const b = createTextNode({ name: 'B' })
    const c = createTextNode({ name: 'C' })
    editor.addNode(a, null)
    editor.addNode(b, null)
    editor.addNode(c, null)
    // rootIds = [a, b, c], reverse → 위에서부터 C, B, A
    const w = mount(LayersPanel)
    const rows = w.findAll('.layer-item__row').map((r) => r.text())
    expect(rows[0]).toContain('C')
    expect(rows[1]).toContain('B')
    expect(rows[2]).toContain('A')
  })
})
