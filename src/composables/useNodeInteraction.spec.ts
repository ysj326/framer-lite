import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { effectScope } from 'vue'
import { useNodeInteraction } from './useNodeInteraction'
import { useEditorStore } from '@/stores/editor'
import { createTextNode } from './useNodeFactory'

const setup = (id: string) => {
  const scope = effectScope()
  let api!: ReturnType<typeof useNodeInteraction>
  scope.run(() => {
    api = useNodeInteraction(() => id)
  })
  return { api, stop: () => scope.stop() }
}

describe('useNodeInteraction', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('isSelected는 store.selectedId와 비교한 결과', () => {
    const editor = useEditorStore()
    const node = createTextNode()
    editor.addNode(node, null)
    const { api, stop } = setup(node.id)
    expect(api.isSelected.value).toBe(false)
    editor.select(node.id)
    expect(api.isSelected.value).toBe(true)
    stop()
  })

  it('onClick은 stopPropagation 호출 후 editor.select(id)', () => {
    const editor = useEditorStore()
    const node = createTextNode()
    editor.addNode(node, null)
    const { api, stop } = setup(node.id)
    let stopped = false
    const event = { stopPropagation: () => { stopped = true } } as MouseEvent
    api.onClick(event)
    expect(stopped).toBe(true)
    expect(editor.selectedId).toBe(node.id)
    stop()
  })
})
