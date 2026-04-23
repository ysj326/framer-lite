import { describe, it, expect } from 'vitest'
import { nodeBoxStyle } from './nodePresentation'
import { createTextNode, createShapeNode } from '@/composables/useNodeFactory'

describe('nodeBoxStyle', () => {
  it('position/좌표/크기/zIndex 기본값 반영', () => {
    const node = createTextNode({ x: 10, y: 20, width: 200, height: 32, zIndex: 3 })
    const style = nodeBoxStyle(node)
    expect(style.position).toBe('absolute')
    expect(style.left).toBe('10px')
    expect(style.top).toBe('20px')
    expect(style.width).toBe('200px')
    expect(style.height).toBe('32px')
    expect(style.zIndex).toBe(3)
  })

  it('visible=false면 visibility hidden', () => {
    const node = createTextNode()
    node.visible = false
    expect(nodeBoxStyle(node).visibility).toBe('hidden')
  })

  it('NodeStyle 필드를 CSS로 매핑', () => {
    const node = createTextNode({
      style: {
        backgroundColor: '#ff0',
        color: '#333',
        fontSize: 18,
        fontWeight: 700,
        borderRadius: 8,
        opacity: 0.5,
      },
    })
    const style = nodeBoxStyle(node)
    expect(style.backgroundColor).toBe('#ff0')
    expect(style.color).toBe('#333')
    expect(style.fontSize).toBe('18px')
    expect(style.fontWeight).toBe(700)
    expect(style.borderRadius).toBe('8px')
    expect(style.opacity).toBe(0.5)
  })

  it('미지정 NodeStyle 필드는 undefined로 두어 CSS 기본값 사용', () => {
    const node = createShapeNode()
    const style = nodeBoxStyle(node)
    expect(style.backgroundColor).toBeUndefined()
    expect(style.fontSize).toBeUndefined()
  })
})
