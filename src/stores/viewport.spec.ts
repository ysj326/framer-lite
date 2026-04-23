import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useViewportStore } from './viewport'

describe('viewport store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('초기 상태', () => {
    it('zoom=1, pan=(0,0)', () => {
      const v = useViewportStore()
      expect(v.zoom).toBe(1)
      expect(v.panX).toBe(0)
      expect(v.panY).toBe(0)
    })
  })

  describe('setZoom', () => {
    it('정상 범위 값은 그대로 설정', () => {
      const v = useViewportStore()
      v.setZoom(2)
      expect(v.zoom).toBe(2)
    })

    it('최소(0.1) 이하는 0.1로 clamp', () => {
      const v = useViewportStore()
      v.setZoom(0.05)
      expect(v.zoom).toBe(0.1)
    })

    it('최대(4) 초과는 4로 clamp', () => {
      const v = useViewportStore()
      v.setZoom(10)
      expect(v.zoom).toBe(4)
    })
  })

  describe('setPan', () => {
    it('panX/panY를 동시에 갱신', () => {
      const v = useViewportStore()
      v.setPan(100, 200)
      expect(v.panX).toBe(100)
      expect(v.panY).toBe(200)
    })
  })

  describe('reset', () => {
    it('zoom=1, pan=(0,0)으로 되돌린다', () => {
      const v = useViewportStore()
      v.setZoom(2)
      v.setPan(50, 60)
      v.reset()
      expect(v.zoom).toBe(1)
      expect(v.panX).toBe(0)
      expect(v.panY).toBe(0)
    })
  })
})
