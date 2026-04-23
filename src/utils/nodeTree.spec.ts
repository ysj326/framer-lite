import { describe, it, expect } from 'vitest'
import {
  getChildren,
  findById,
  walk,
  addNode,
  removeNode,
  moveNode,
  cloneSubtree,
} from './nodeTree'
import type { AppNode, FrameNode, TextNode } from '@/types/node'

/**
 * 테스트용 Text 노드 생성 헬퍼.
 * Phase 1.3 useNodeFactory가 정식 팩토리이며, 여기서는 spec 독립성을 위해 인라인 사용.
 */
const makeText = (
  id: string,
  parentId: string | null = null,
  overrides: Partial<TextNode> = {},
): TextNode => ({
  id,
  type: 'text',
  name: `text-${id}`,
  parentId,
  childIds: [],
  x: 0,
  y: 0,
  width: 100,
  height: 30,
  zIndex: 0,
  visible: true,
  locked: false,
  style: {},
  data: { content: 'hello' },
  ...overrides,
})

/**
 * 테스트용 Frame 노드 생성 헬퍼.
 */
const makeFrame = (
  id: string,
  parentId: string | null = null,
  childIds: string[] = [],
  overrides: Partial<FrameNode> = {},
): FrameNode => ({
  id,
  type: 'frame',
  name: `frame-${id}`,
  parentId,
  childIds,
  x: 0,
  y: 0,
  width: 200,
  height: 200,
  zIndex: 0,
  visible: true,
  locked: false,
  style: {},
  data: {},
  ...overrides,
})

/**
 * (nodes, rootIds) 형태로 묶어 spec 가독성 향상.
 */
const toMap = (...list: AppNode[]): Record<string, AppNode> =>
  Object.fromEntries(list.map((n) => [n.id, n]))

describe('findById', () => {
  it('id로 노드를 찾는다', () => {
    const a = makeText('a')
    const nodes = toMap(a)
    expect(findById(nodes, 'a')).toBe(a)
  })

  it('없는 id는 undefined를 반환', () => {
    expect(findById({}, 'missing')).toBeUndefined()
  })
})

describe('getChildren', () => {
  it('parentId가 null이면 rootIds 순서대로 반환', () => {
    const a = makeText('a')
    const b = makeText('b')
    const nodes = toMap(a, b)
    expect(getChildren(nodes, null, ['b', 'a'])).toEqual([b, a])
  })

  it('Frame의 childIds 순서대로 자식 반환', () => {
    const c1 = makeText('c1', 'f1')
    const c2 = makeText('c2', 'f1')
    const f1 = makeFrame('f1', null, ['c1', 'c2'])
    const nodes = toMap(f1, c1, c2)
    expect(getChildren(nodes, 'f1', [])).toEqual([c1, c2])
  })

  it('존재하지 않는 부모는 빈 배열', () => {
    expect(getChildren({}, 'ghost', [])).toEqual([])
  })

  it('childIds 중 nodes에 없는 항목은 건너뜀', () => {
    const f1 = makeFrame('f1', null, ['missing'])
    const nodes = toMap(f1)
    expect(getChildren(nodes, 'f1', [])).toEqual([])
  })
})

describe('walk', () => {
  it('depth-first 순서로 모든 노드 방문', () => {
    const c1 = makeText('c1', 'f1')
    const c2 = makeText('c2', 'f1')
    const f1 = makeFrame('f1', null, ['c1', 'c2'])
    const a = makeText('a')
    const nodes = toMap(a, f1, c1, c2)
    const visited: string[] = []
    walk(nodes, ['a', 'f1'], (n) => visited.push(n.id))
    expect(visited).toEqual(['a', 'f1', 'c1', 'c2'])
  })

  it('빈 트리는 호출되지 않음', () => {
    const calls: string[] = []
    walk({}, [], (n) => calls.push(n.id))
    expect(calls).toEqual([])
  })
})

describe('addNode', () => {
  it('parentId=null이면 rootIds 끝에 추가하고 nodes에 등록', () => {
    const a = makeText('a')
    const next = addNode({}, [], a, null)
    expect(next.nodes).toEqual({ a })
    expect(next.rootIds).toEqual(['a'])
    expect(next.nodes.a!.parentId).toBeNull()
  })

  it('parentId 지정 시 Frame.childIds 끝에 추가', () => {
    const f1 = makeFrame('f1', null, [])
    const c = makeText('c')
    const next = addNode(toMap(f1), ['f1'], c, 'f1')
    expect(next.nodes.c!.parentId).toBe('f1')
    expect((next.nodes.f1 as FrameNode).childIds).toEqual(['c'])
    expect(next.rootIds).toEqual(['f1'])
  })

  it('원본 nodes/rootIds는 변경되지 않는다 (immutable)', () => {
    const f1 = makeFrame('f1', null, [])
    const nodes = toMap(f1)
    const rootIds = ['f1']
    addNode(nodes, rootIds, makeText('c'), 'f1')
    expect((nodes.f1 as FrameNode).childIds).toEqual([])
    expect(rootIds).toEqual(['f1'])
  })
})

describe('removeNode', () => {
  it('루트 노드 삭제 시 rootIds와 nodes 모두 정리', () => {
    const a = makeText('a')
    const next = removeNode(toMap(a), ['a'], 'a')
    expect(next.nodes).toEqual({})
    expect(next.rootIds).toEqual([])
  })

  it('Frame 삭제 시 모든 후손도 함께 삭제', () => {
    const c1 = makeText('c1', 'f1')
    const c2 = makeText('c2', 'f1')
    const inner = makeFrame('inner', 'f1', ['c2'])
    const f1 = makeFrame('f1', null, ['c1', 'inner'])
    c2.parentId = 'inner'
    const nodes = toMap(f1, c1, inner, c2)
    const next = removeNode(nodes, ['f1'], 'f1')
    expect(next.nodes).toEqual({})
    expect(next.rootIds).toEqual([])
  })

  it('자식 노드 삭제 시 부모 childIds에서 제거', () => {
    const c = makeText('c', 'f1')
    const f1 = makeFrame('f1', null, ['c'])
    const next = removeNode(toMap(f1, c), ['f1'], 'c')
    expect((next.nodes.f1 as FrameNode).childIds).toEqual([])
    expect(next.nodes.c).toBeUndefined()
  })

  it('없는 id는 변경 없이 동일 결과', () => {
    const a = makeText('a')
    const next = removeNode(toMap(a), ['a'], 'ghost')
    expect(next.nodes).toEqual({ a })
    expect(next.rootIds).toEqual(['a'])
  })
})

describe('moveNode', () => {
  it('루트 노드를 Frame 안으로 이동', () => {
    const a = makeText('a')
    const f1 = makeFrame('f1', null, [])
    const next = moveNode(toMap(a, f1), ['a', 'f1'], 'a', 'f1')
    expect(next.rootIds).toEqual(['f1'])
    expect((next.nodes.f1 as FrameNode).childIds).toEqual(['a'])
    expect(next.nodes.a!.parentId).toBe('f1')
  })

  it('Frame 안 자식을 페이지 루트로 이동', () => {
    const c = makeText('c', 'f1')
    const f1 = makeFrame('f1', null, ['c'])
    const next = moveNode(toMap(f1, c), ['f1'], 'c', null)
    expect((next.nodes.f1 as FrameNode).childIds).toEqual([])
    expect(next.rootIds).toEqual(['f1', 'c'])
    expect(next.nodes.c!.parentId).toBeNull()
  })

  it('같은 부모로 이동은 변경 없음', () => {
    const a = makeText('a')
    const next = moveNode(toMap(a), ['a'], 'a', null)
    expect(next.rootIds).toEqual(['a'])
    expect(next.nodes.a!.parentId).toBeNull()
  })

  it('없는 id는 변경 없이 동일 결과', () => {
    const a = makeText('a')
    const next = moveNode(toMap(a), ['a'], 'ghost', null)
    expect(next.nodes).toEqual({ a })
    expect(next.rootIds).toEqual(['a'])
  })
})

describe('cloneSubtree', () => {
  it('단일 노드는 새 id로 복제되며 added에 1개', () => {
    const a = makeText('a')
    const result = cloneSubtree(toMap(a), 'a')
    expect(result).not.toBeNull()
    expect(result!.newRootId).not.toBe('a')
    expect(Object.keys(result!.added)).toHaveLength(1)
    const cloned = result!.added[result!.newRootId]
    expect(cloned!.type).toBe('text')
    expect(cloned!.parentId).toBeNull()
  })

  it('Frame 자식까지 모두 새 id로 복제', () => {
    const c1 = makeText('c1', 'f1')
    const c2 = makeText('c2', 'f1')
    const f1 = makeFrame('f1', null, ['c1', 'c2'])
    const result = cloneSubtree(toMap(f1, c1, c2), 'f1')
    expect(Object.keys(result!.added)).toHaveLength(3)
    const newFrame = result!.added[result!.newRootId] as FrameNode
    expect(newFrame.childIds).toHaveLength(2)
    // 새 자식 id는 원본과 달라야 함
    expect(newFrame.childIds).not.toContain('c1')
    expect(newFrame.childIds).not.toContain('c2')
    // 새 자식의 parentId는 새 frame id를 가리켜야 함
    for (const childId of newFrame.childIds) {
      expect(result!.added[childId]!.parentId).toBe(result!.newRootId)
    }
  })

  it('없는 id는 null 반환', () => {
    expect(cloneSubtree({}, 'ghost')).toBeNull()
  })
})
