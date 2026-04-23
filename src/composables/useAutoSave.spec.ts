import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { effectScope } from 'vue'
import { useAutoSave } from './useAutoSave'
import { useEditorStore } from '@/stores/editor'
import { createTextNode } from './useNodeFactory'
import { toJSON } from '@/utils/serialize'
import type { Project } from '@/types/project'

const STORAGE_KEY = 'test:framer-lite:project'

/**
 * 테스트 헬퍼: setup 컨텍스트 안에서 useAutoSave를 호출.
 */
const scopedSetup = () => {
  const scope = effectScope()
  let auto!: ReturnType<typeof useAutoSave>
  scope.run(() => {
    auto = useAutoSave({ storageKey: STORAGE_KEY, debounceMs: 0 })
  })
  return { auto, stop: () => scope.stop() }
}

describe('useAutoSave', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  describe('saveNow', () => {
    it('현재 editor 상태를 localStorage에 즉시 저장', () => {
      const editor = useEditorStore()
      editor.addNode(createTextNode(), null)
      const { auto, stop } = scopedSetup()
      auto.saveNow()
      const raw = localStorage.getItem(STORAGE_KEY)
      expect(raw).toBeTruthy()
      const parsed = JSON.parse(raw!)
      expect(Object.keys(parsed.nodes)).toHaveLength(1)
      stop()
    })
  })

  describe('restore', () => {
    it('localStorage 데이터가 있으면 editor에 로드 후 true', () => {
      const project: Project = {
        version: 1,
        name: 'Restored',
        page: {
          id: 'p1',
          name: 'Page',
          width: 1280,
          height: 800,
          background: '#fff',
          rootIds: [],
        },
        nodes: {},
        updatedAt: 0,
      }
      localStorage.setItem(STORAGE_KEY, toJSON(project))
      const { auto, stop } = scopedSetup()
      const ok = auto.restore()
      const editor = useEditorStore()
      expect(ok).toBe(true)
      expect(editor.page.name).toBe('Page')
      stop()
    })

    it('빈 localStorage는 false', () => {
      const { auto, stop } = scopedSetup()
      expect(auto.restore()).toBe(false)
      stop()
    })

    it('잘못된 데이터는 false', () => {
      localStorage.setItem(STORAGE_KEY, 'garbage')
      const { auto, stop } = scopedSetup()
      expect(auto.restore()).toBe(false)
      stop()
    })
  })

  describe('clear', () => {
    it('localStorage 항목 제거', () => {
      localStorage.setItem(STORAGE_KEY, '{}')
      const { auto, stop } = scopedSetup()
      auto.clear()
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      stop()
    })
  })
})
