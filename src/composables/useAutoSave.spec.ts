import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { effectScope } from 'vue'
import { useAutoSave } from './useAutoSave'
import { useEditorStore } from '@/stores/editor'
import { useSlotsStore } from '@/stores/slots'
import { createTextNode } from './useNodeFactory'
import { toJSON } from '@/utils/serialize'
import type { Project } from '@/types/project'

const KEY_PREFIX = 'test:framer-lite:slot:'
const LEGACY_KEY = 'test:framer-lite:project'

/**
 * 테스트 헬퍼: setup 컨텍스트 안에서 useAutoSave 생성.
 */
const scopedSetup = () => {
  const scope = effectScope()
  let auto!: ReturnType<typeof useAutoSave>
  scope.run(() => {
    auto = useAutoSave({
      keyPrefix: KEY_PREFIX,
      legacyKey: LEGACY_KEY,
      debounceMs: 0,
    })
  })
  return { auto, stop: () => scope.stop() }
}

/** 테스트용 최소 Project 생성 */
const makeProject = (name = 'Page'): Project => ({
  version: 1,
  name: 'Test',
  page: {
    id: 'p1',
    name,
    width: 1280,
    height: 800,
    background: '#fff',
    rootIds: [],
  },
  nodes: {},
  masters: {},
  updatedAt: 0,
})

describe('useAutoSave', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  describe('saveNow', () => {
    it('활성 슬롯이 없으면 저장하지 않음', () => {
      const editor = useEditorStore()
      editor.addNode(createTextNode(), null)
      const { auto, stop } = scopedSetup()
      auto.saveNow()
      // 어떤 슬롯 키에도 저장되지 않음
      const keys = Object.keys(localStorage)
      expect(keys.filter((k) => k.startsWith(KEY_PREFIX))).toHaveLength(0)
      stop()
    })

    it('활성 슬롯이 있으면 slot 키(`prefix + id`)에 저장', () => {
      const editor = useEditorStore()
      const slots = useSlotsStore()
      const slot = slots.createSlot('작업1')
      editor.addNode(createTextNode(), null)
      const { auto, stop } = scopedSetup()
      auto.saveNow()
      const raw = localStorage.getItem(KEY_PREFIX + slot.id)
      expect(raw).toBeTruthy()
      const parsed = JSON.parse(raw!)
      expect(Object.keys(parsed.nodes)).toHaveLength(1)
      stop()
    })

    it('저장 시 slots.touchActive 호출로 updatedAt 갱신', async () => {
      const slots = useSlotsStore()
      const slot = slots.createSlot('작업1')
      const before = slot.updatedAt
      // 약간의 시간 경과
      await new Promise((r) => setTimeout(r, 2))
      const { auto, stop } = scopedSetup()
      auto.saveNow()
      const current = slots.slots.find((s) => s.id === slot.id)!
      expect(current.updatedAt).toBeGreaterThan(before)
      stop()
    })
  })

  describe('restore', () => {
    it('활성 슬롯이 없으면 false', () => {
      const { auto, stop } = scopedSetup()
      expect(auto.restore()).toBe(false)
      stop()
    })

    it('활성 슬롯 있고 본문이 있으면 editor 로드 후 true', () => {
      const slots = useSlotsStore()
      const slot = slots.createSlot('작업1')
      localStorage.setItem(KEY_PREFIX + slot.id, toJSON(makeProject('Restored')))
      const { auto, stop } = scopedSetup()
      const ok = auto.restore()
      const editor = useEditorStore()
      expect(ok).toBe(true)
      expect(editor.page.name).toBe('Restored')
      stop()
    })

    it('활성 슬롯은 있지만 본문이 없으면 false', () => {
      const slots = useSlotsStore()
      slots.createSlot('작업1')
      const { auto, stop } = scopedSetup()
      expect(auto.restore()).toBe(false)
      stop()
    })

    it('잘못된 JSON은 false', () => {
      const slots = useSlotsStore()
      const slot = slots.createSlot('작업1')
      localStorage.setItem(KEY_PREFIX + slot.id, 'garbage')
      const { auto, stop } = scopedSetup()
      expect(auto.restore()).toBe(false)
      stop()
    })
  })

  describe('clear', () => {
    it('활성 슬롯의 본문 키만 제거 (slot meta는 유지)', () => {
      const slots = useSlotsStore()
      const slot = slots.createSlot('작업1')
      localStorage.setItem(KEY_PREFIX + slot.id, '{}')
      const { auto, stop } = scopedSetup()
      auto.clear()
      expect(localStorage.getItem(KEY_PREFIX + slot.id)).toBeNull()
      expect(slots.slots.find((s) => s.id === slot.id)).toBeTruthy()
      stop()
    })

    it('활성 슬롯이 없으면 no-op', () => {
      const { auto, stop } = scopedSetup()
      expect(() => auto.clear()).not.toThrow()
      stop()
    })
  })

  describe('migrateLegacy', () => {
    it('legacy 있고 slots 비어있으면 슬롯 1개 생성 후 본문 이전, legacy 삭제', () => {
      localStorage.setItem(LEGACY_KEY, toJSON(makeProject('Legacy Page')))
      const slots = useSlotsStore()
      const { auto, stop } = scopedSetup()
      const result = auto.migrateLegacy()
      expect(result.migrated).toBe(true)
      expect(result.slotId).toBeTruthy()
      expect(slots.slots).toHaveLength(1)
      expect(slots.activeId).toBe(result.slotId)
      // 본문이 slot 키로 이동
      const body = localStorage.getItem(KEY_PREFIX + result.slotId!)
      expect(body).toBeTruthy()
      expect(JSON.parse(body!).page.name).toBe('Legacy Page')
      // legacy 삭제
      expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
      stop()
    })

    it('legacy 키가 없으면 { migrated: false }', () => {
      const { auto, stop } = scopedSetup()
      const result = auto.migrateLegacy()
      expect(result.migrated).toBe(false)
      expect(result.slotId).toBe(null)
      stop()
    })

    it('slots가 이미 있으면 legacy를 건드리지 않음 (이미 마이그레이션된 상태로 간주)', () => {
      const slots = useSlotsStore()
      slots.createSlot('기존')
      localStorage.setItem(LEGACY_KEY, 'stale')
      const { auto, stop } = scopedSetup()
      const result = auto.migrateLegacy()
      expect(result.migrated).toBe(false)
      expect(localStorage.getItem(LEGACY_KEY)).toBe('stale')
      expect(slots.slots).toHaveLength(1)
      stop()
    })

    it('legacy JSON이 손상된 경우 migrate 안 함 (legacy 삭제도 안 함)', () => {
      localStorage.setItem(LEGACY_KEY, '{broken')
      const { auto, stop } = scopedSetup()
      const result = auto.migrateLegacy()
      expect(result.migrated).toBe(false)
      expect(localStorage.getItem(LEGACY_KEY)).toBe('{broken')
      stop()
    })
  })
})
