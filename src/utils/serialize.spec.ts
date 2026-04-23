import { describe, it, expect } from 'vitest'
import { toJSON, fromJSON, CURRENT_VERSION } from './serialize'
import type { Project } from '@/types/project'
import { createTextNode } from '@/composables/useNodeFactory'

const sample = (): Project => {
  const node = createTextNode({ x: 10 })
  return {
    version: 1,
    name: 'My Project',
    page: {
      id: 'p1',
      name: 'Page 1',
      width: 1280,
      height: 800,
      background: '#fff',
      rootIds: [node.id],
    },
    nodes: { [node.id]: node },
    updatedAt: 1700000000000,
  }
}

describe('toJSON', () => {
  it('Project를 JSON 문자열로 직렬화', () => {
    const json = toJSON(sample())
    const parsed = JSON.parse(json)
    expect(parsed.version).toBe(CURRENT_VERSION)
    expect(parsed.name).toBe('My Project')
    expect(Object.keys(parsed.nodes)).toHaveLength(1)
  })

  it('version은 항상 CURRENT_VERSION으로 강제 설정', () => {
    const project = { ...sample(), version: 99 as unknown as 1 }
    const parsed = JSON.parse(toJSON(project))
    expect(parsed.version).toBe(CURRENT_VERSION)
  })
})

describe('fromJSON', () => {
  it('직렬화 왕복 시 동일 트리', () => {
    const original = sample()
    const restored = fromJSON(toJSON(original))
    expect(restored).not.toBeNull()
    expect(restored!.name).toBe(original.name)
    expect(restored!.page.rootIds).toEqual(original.page.rootIds)
    expect(Object.keys(restored!.nodes)).toEqual(Object.keys(original.nodes))
  })

  it('잘못된 JSON은 null', () => {
    expect(fromJSON('not json')).toBeNull()
    expect(fromJSON('null')).toBeNull()
    expect(fromJSON('{}')).toBeNull()
  })

  it('필수 필드 누락 시 null', () => {
    expect(fromJSON(JSON.stringify({ version: 1, name: 'x' }))).toBeNull()
  })

  it('빈 문자열은 null', () => {
    expect(fromJSON('')).toBeNull()
  })
})
