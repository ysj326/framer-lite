import { describe, it, expect } from 'vitest'
import { buildProjectBlob, readProjectFile } from './projectFile'
import { toJSON } from './serialize'
import type { Project } from '@/types/project'

const sample = (): Project => ({
  version: 1,
  name: 'Sample',
  page: {
    id: 'p1',
    name: 'Page',
    width: 1280,
    height: 800,
    background: '#fff',
    rootIds: [],
  },
  nodes: {},
  masters: {},
  updatedAt: 0,
})

describe('buildProjectBlob', () => {
  it('JSON Blob을 반환한다', () => {
    const blob = buildProjectBlob(sample())
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/json')
  })

  it('Blob 내용은 toJSON 결과와 동일', async () => {
    const project = sample()
    const blob = buildProjectBlob(project)
    const text = await blob.text()
    expect(text).toBe(toJSON(project))
  })
})

describe('readProjectFile', () => {
  it('유효한 File을 Project로 복원', async () => {
    const project = sample()
    const file = new File([toJSON(project)], 'p.json', { type: 'application/json' })
    const result = await readProjectFile(file)
    expect(result).not.toBeNull()
    expect(result!.name).toBe('Sample')
  })

  it('잘못된 내용의 File은 null', async () => {
    const file = new File(['not json'], 'p.json')
    const result = await readProjectFile(file)
    expect(result).toBeNull()
  })
})
