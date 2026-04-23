import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { effectScope, type EffectScope } from 'vue'
import { useNodeField } from './useNodeField'
import { useEditorStore } from '@/stores/editor'
import { createTextNode } from './useNodeFactory'
import type { AppNode } from '@/types/node'

/**
 * 항상 store의 최신 노드를 반환하는 헬퍼.
 * 컴포넌트에서 props로 받는 node와 동일한 패턴(getter)을 흉내낸다.
 */
const liveNode = (id: string) => () => {
  const editor = useEditorStore()
  return editor.nodes[id] as AppNode
}

describe('useNodeField', () => {
  let scope: EffectScope

  beforeEach(() => {
    setActivePinia(createPinia())
    scope = effectScope()
  })

  afterEach(() => {
    scope.stop()
  })

  it('read 함수가 노드에서 값을 추출한다 (get)', () => {
    const editor = useEditorStore()
    const node = createTextNode({ x: 42 })
    editor.addNode(node, null)
    let field!: ReturnType<typeof useNodeField<number>>
    scope.run(() => {
      field = useNodeField(liveNode(node.id), (n) => n.x, (v) => ({ x: v }))
    })
    expect(field.value).toBe(42)
  })

  it('set은 editor.updateNode를 호출해 store에 반영 (set)', () => {
    const editor = useEditorStore()
    const node = createTextNode()
    editor.addNode(node, null)
    let field!: ReturnType<typeof useNodeField<number>>
    scope.run(() => {
      field = useNodeField(liveNode(node.id), (n) => n.x, (v) => ({ x: v }))
    })
    field.value = 100
    expect(editor.nodes[node.id]!.x).toBe(100)
  })

  it('store가 외부에서 변경되면 get도 새 값을 돌려준다 (reactive)', () => {
    const editor = useEditorStore()
    const node = createTextNode({ x: 0 })
    editor.addNode(node, null)
    let field!: ReturnType<typeof useNodeField<number>>
    scope.run(() => {
      field = useNodeField(liveNode(node.id), (n) => n.x, (v) => ({ x: v }))
    })
    editor.updateNode(node.id, { x: 7 })
    expect(field.value).toBe(7)
  })

  it('중첩 필드(style.color) 같은 패턴도 동일하게 동작', () => {
    const editor = useEditorStore()
    const node = createTextNode({ style: { color: '#000' } })
    editor.addNode(node, null)
    let field!: ReturnType<typeof useNodeField<string>>
    scope.run(() => {
      field = useNodeField(
        liveNode(node.id),
        (n) => n.style.color ?? '',
        (v) => ({ style: { ...editor.nodes[node.id]!.style, color: v } }),
      )
    })
    field.value = '#ff0000'
    expect(editor.nodes[node.id]!.style.color).toBe('#ff0000')
  })
})
