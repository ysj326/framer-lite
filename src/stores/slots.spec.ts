import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSlotsStore, MAX_SLOTS, SLOTS_STORAGE_KEY } from './slots'

describe('slots store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 24, 12, 0, 0))
  })

  describe('초기 상태', () => {
    it('activeId=null, slots=[], canCreate=true', () => {
      const s = useSlotsStore()
      expect(s.activeId).toBe(null)
      expect(s.slots).toEqual([])
      expect(s.canCreate).toBe(true)
      expect(s.activeSlot).toBe(null)
    })
  })

  describe('createSlot', () => {
    it('slot meta를 생성하고 activeId로 지정, 결과 반환', () => {
      const s = useSlotsStore()
      const slot = s.createSlot('첫 작업')
      expect(slot.id).toMatch(/.+/)
      expect(slot.name).toBe('첫 작업')
      expect(slot.updatedAt).toBe(Date.now())
      expect(s.slots).toHaveLength(1)
      expect(s.activeId).toBe(slot.id)
      expect(s.activeSlot?.id).toBe(slot.id)
    })

    it('MAX_SLOTS 도달하면 canCreate=false이고 createSlot은 throw', () => {
      const s = useSlotsStore()
      for (let i = 0; i < MAX_SLOTS; i++) {
        s.createSlot(`slot ${i}`)
      }
      expect(s.slots).toHaveLength(MAX_SLOTS)
      expect(s.canCreate).toBe(false)
      expect(() => s.createSlot('초과')).toThrow()
    })
  })

  describe('removeSlot', () => {
    it('해당 슬롯을 목록에서 제거', () => {
      const s = useSlotsStore()
      const a = s.createSlot('a')
      const b = s.createSlot('b')
      s.removeSlot(a.id)
      expect(s.slots.map((x) => x.id)).toEqual([b.id])
    })

    it('활성 슬롯을 제거하면 activeId=null', () => {
      const s = useSlotsStore()
      const a = s.createSlot('a')
      s.selectSlot(a.id)
      s.removeSlot(a.id)
      expect(s.activeId).toBe(null)
    })

    it('활성이 아닌 슬롯 제거는 activeId 유지', () => {
      const s = useSlotsStore()
      const a = s.createSlot('a')
      const b = s.createSlot('b')
      s.selectSlot(a.id)
      s.removeSlot(b.id)
      expect(s.activeId).toBe(a.id)
    })
  })

  describe('selectSlot', () => {
    it('존재하는 id로 activeId 변경', () => {
      const s = useSlotsStore()
      const a = s.createSlot('a')
      const b = s.createSlot('b')
      s.selectSlot(a.id)
      expect(s.activeId).toBe(a.id)
      s.selectSlot(b.id)
      expect(s.activeId).toBe(b.id)
    })

    it('존재하지 않는 id는 무시 (activeId 유지)', () => {
      const s = useSlotsStore()
      const a = s.createSlot('a')
      s.selectSlot(a.id)
      s.selectSlot('nope')
      expect(s.activeId).toBe(a.id)
    })
  })

  describe('renameSlot', () => {
    it('이름 변경 + updatedAt 갱신', () => {
      const s = useSlotsStore()
      const a = s.createSlot('old')
      vi.advanceTimersByTime(1000)
      s.renameSlot(a.id, 'new')
      const current = s.slots.find((x) => x.id === a.id)!
      expect(current.name).toBe('new')
      expect(current.updatedAt).toBe(Date.now())
    })

    it('존재하지 않는 id는 no-op', () => {
      const s = useSlotsStore()
      expect(() => s.renameSlot('nope', 'x')).not.toThrow()
    })
  })

  describe('touchActive', () => {
    it('활성 슬롯 updatedAt 갱신', () => {
      const s = useSlotsStore()
      const a = s.createSlot('a')
      const before = a.updatedAt
      vi.advanceTimersByTime(5000)
      s.touchActive()
      const current = s.slots.find((x) => x.id === a.id)!
      expect(current.updatedAt).toBeGreaterThan(before)
    })

    it('활성 슬롯 없으면 no-op', () => {
      const s = useSlotsStore()
      expect(() => s.touchActive()).not.toThrow()
    })
  })

  describe('persist / hydrate', () => {
    it('mutation 시 localStorage에 저장되고, 새 store가 hydrate로 복구', () => {
      const s1 = useSlotsStore()
      const a = s1.createSlot('a')
      s1.createSlot('b')
      s1.selectSlot(a.id)

      // 새 pinia 인스턴스 — 별개 store지만 동일 localStorage
      setActivePinia(createPinia())
      const s2 = useSlotsStore()
      s2.hydrate()
      expect(s2.slots).toHaveLength(2)
      expect(s2.activeId).toBe(a.id)
    })

    it('손상된 JSON은 무시하고 초기 상태 유지', () => {
      localStorage.setItem(SLOTS_STORAGE_KEY, '{not json')
      const s = useSlotsStore()
      s.hydrate()
      expect(s.slots).toEqual([])
      expect(s.activeId).toBe(null)
    })

    it('스키마 불일치 JSON도 안전하게 무시', () => {
      localStorage.setItem(SLOTS_STORAGE_KEY, JSON.stringify({ wrong: true }))
      const s = useSlotsStore()
      s.hydrate()
      expect(s.slots).toEqual([])
      expect(s.activeId).toBe(null)
    })
  })
})
