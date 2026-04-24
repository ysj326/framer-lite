import { describe, it, expect } from 'vitest'
import { uniqueMasterName, collectSubtree, buildMasterFromFrame } from './masterFactory'
import type { Master } from '@/types/master'
import type { AppNode, FrameNode, TextNode } from '@/types/node'

// ---------------------------------------------------------------------------
// 테스트 헬퍼
// ---------------------------------------------------------------------------

/** masters 더미 생성 헬퍼 */
const makeMaster = (name: string): Master => ({
  id: `m-${name}`,
  name,
  rootId: 'r',
  nodes: {},
  createdAt: 0,
  updatedAt: 0,
})

/**
 * 테스트용 BaseNode 기본값 생성.
 * 타입별 data는 호출자가 스프레드 후 덮어씌운다.
 */
const base = (_t: string, id: string) => ({
  id,
  name: id,
  parentId: null,
  childIds: [] as string[],
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  zIndex: 0,
  visible: true,
  locked: false,
  style: {},
})

// ---------------------------------------------------------------------------
// uniqueMasterName
// ---------------------------------------------------------------------------

describe('uniqueMasterName', () => {
  it('이름이 비어 있으면 그 이름을 그대로 반환', () => {
    const masters: Record<string, Master> = {}
    expect(uniqueMasterName('Card', masters)).toBe('Card')
  })

  it('동일 이름이 하나 있으면 "(1)"을 붙임', () => {
    const masters: Record<string, Master> = {
      m1: makeMaster('Card'),
    }
    expect(uniqueMasterName('Card', masters)).toBe('Card (1)')
  })

  it('"(1)"까지 있으면 "(2)"를 붙임', () => {
    const masters: Record<string, Master> = {
      m1: makeMaster('Card'),
      m2: makeMaster('Card (1)'),
    }
    expect(uniqueMasterName('Card', masters)).toBe('Card (2)')
  })
})

// ---------------------------------------------------------------------------
// collectSubtree
// ---------------------------------------------------------------------------

describe('collectSubtree', () => {
  it('Frame과 그 자손 노드를 모두 수집해 새 Record로 반환', () => {
    const nodes: Record<string, AppNode> = {
      f: { ...base('frame', 'f'), type: 'frame', childIds: ['t1', 't2'], data: {} } as FrameNode,
      t1: { ...base('text', 't1'), type: 'text', data: { content: 'hi' } } as TextNode,
      t2: { ...base('text', 't2'), type: 'text', data: { content: 'yo' } } as TextNode,
      other: { ...base('text', 'other'), type: 'text', data: { content: 'x' } } as TextNode,
    }
    const result = collectSubtree(nodes, 'f')
    expect(Object.keys(result).sort()).toEqual(['f', 't1', 't2'])
    expect(result.other).toBeUndefined()
  })

  it('중첩 Frame도 재귀적으로 수집', () => {
    const nodes: Record<string, AppNode> = {
      outer: {
        ...base('frame', 'outer'),
        type: 'frame',
        childIds: ['inner'],
        data: {},
      } as FrameNode,
      inner: {
        ...base('frame', 'inner'),
        type: 'frame',
        childIds: ['leaf'],
        data: {},
      } as FrameNode,
      leaf: { ...base('text', 'leaf'), type: 'text', data: { content: 'L' } } as TextNode,
    }
    const result = collectSubtree(nodes, 'outer')
    expect(Object.keys(result).sort()).toEqual(['inner', 'leaf', 'outer'])
  })

  it('subtree에 instance 타입 노드가 포함되면 에러를 throw', () => {
    const nodes: Record<string, AppNode> = {
      f: { ...base('frame', 'f'), type: 'frame', childIds: ['inst'], data: {} } as FrameNode,
      inst: {
        ...base('instance', 'inst'),
        type: 'instance',
        childIds: [],
        data: { masterId: 'm', overrides: {} },
      },
    }
    expect(() => collectSubtree(nodes, 'f')).toThrow(/instance/i)
  })
})

// ---------------------------------------------------------------------------
// buildMasterFromFrame
// ---------------------------------------------------------------------------

describe('buildMasterFromFrame', () => {
  it('Frame과 자손을 담은 Master 객체를 반환', () => {
    const nodes: Record<string, AppNode> = {
      f: {
        ...base('frame', 'f'),
        name: 'Hero',
        type: 'frame',
        childIds: ['t'],
        data: {},
      } as FrameNode,
      t: { ...base('text', 't'), type: 'text', data: { content: 'x' } } as TextNode,
    }
    const masters: Record<string, Master> = {}
    const master = buildMasterFromFrame(nodes, 'f', masters, () => 1_000)
    expect(master.id).toBeTruthy()
    expect(master.name).toBe('Hero')
    expect(master.rootId).toBe('f')
    expect(Object.keys(master.nodes).sort()).toEqual(['f', 't'])
    expect(master.createdAt).toBe(1_000)
    expect(master.updatedAt).toBe(1_000)
  })

  it('이름 충돌 시 suffix "(1)"로 고유화', () => {
    const nodes: Record<string, AppNode> = {
      f: {
        ...base('frame', 'f'),
        name: 'Card',
        type: 'frame',
        childIds: [],
        data: {},
      } as FrameNode,
    }
    const masters: Record<string, Master> = {
      m: { id: 'm', name: 'Card', rootId: 'x', nodes: {}, createdAt: 0, updatedAt: 0 },
    }
    const master = buildMasterFromFrame(nodes, 'f', masters, () => 0)
    expect(master.name).toBe('Card (1)')
  })

  it('rootId가 frame이 아니면 에러', () => {
    const nodes: Record<string, AppNode> = {
      t: { ...base('text', 't'), type: 'text', data: { content: 'x' } } as TextNode,
    }
    expect(() => buildMasterFromFrame(nodes, 't', {}, () => 0)).toThrow(/frame/i)
  })
})
