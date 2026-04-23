import { describe, it, expect } from 'vitest'
import {
  createTextNode,
  createImageNode,
  createButtonNode,
  createFrameNode,
  createShapeNode,
} from './useNodeFactory'

describe('createTextNode', () => {
  it('기본 Text 노드를 생성한다', () => {
    const node = createTextNode()
    expect(node.type).toBe('text')
    expect(node.id).toBeTruthy()
    expect(node.name).toBe('Text')
    expect(node.parentId).toBeNull()
    expect(node.childIds).toEqual([])
    expect(node.visible).toBe(true)
    expect(node.locked).toBe(false)
    expect(node.data.content).toBe('Text')
  })

  it('opts로 필드를 오버라이드한다', () => {
    const node = createTextNode({ x: 50, y: 60, content: 'Hello', name: 'My' })
    expect(node.x).toBe(50)
    expect(node.y).toBe(60)
    expect(node.name).toBe('My')
    expect(node.data.content).toBe('Hello')
  })

  it('두 번 호출하면 서로 다른 id를 가진다', () => {
    expect(createTextNode().id).not.toBe(createTextNode().id)
  })
})

describe('createImageNode', () => {
  it('기본 Image 노드를 생성한다', () => {
    const node = createImageNode()
    expect(node.type).toBe('image')
    expect(node.name).toBe('Image')
    expect(node.data.src).toBe('')
    expect(node.data.alt).toBe('')
  })

  it('src/alt를 설정할 수 있다', () => {
    const node = createImageNode({ src: '/a.png', alt: 'A' })
    expect(node.data.src).toBe('/a.png')
    expect(node.data.alt).toBe('A')
  })
})

describe('createButtonNode', () => {
  it('기본 Button 노드를 생성한다', () => {
    const node = createButtonNode()
    expect(node.type).toBe('button')
    expect(node.name).toBe('Button')
    expect(node.data.label).toBe('Button')
    expect(node.data.href).toBe('')
  })

  it('label/href를 설정할 수 있다', () => {
    const node = createButtonNode({ label: 'Buy', href: 'https://x.com' })
    expect(node.data.label).toBe('Buy')
    expect(node.data.href).toBe('https://x.com')
  })
})

describe('createFrameNode', () => {
  it('기본 Frame 노드를 생성한다', () => {
    const node = createFrameNode()
    expect(node.type).toBe('frame')
    expect(node.name).toBe('Frame')
    expect(node.childIds).toEqual([])
    expect(node.data).toEqual({})
  })
})

describe('createShapeNode', () => {
  it('기본 Shape 노드는 rect 변형', () => {
    const node = createShapeNode()
    expect(node.type).toBe('shape')
    expect(node.data.variant).toBe('rect')
  })

  it('ellipse 변형을 지정할 수 있다', () => {
    const node = createShapeNode({ variant: 'ellipse' })
    expect(node.data.variant).toBe('ellipse')
  })
})

describe('공통 동작', () => {
  it('parentId를 지정하면 그대로 반영된다', () => {
    const node = createTextNode({ parentId: 'p1' })
    expect(node.parentId).toBe('p1')
  })

  it('style을 부분 지정하면 머지가 아닌 그대로 대입된다', () => {
    const node = createTextNode({ style: { color: 'red' } })
    expect(node.style).toEqual({ color: 'red' })
  })
})
