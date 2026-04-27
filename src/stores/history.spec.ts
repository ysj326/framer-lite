import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHistoryStore, type EditorSnapshot } from './history'
import type { Page } from '@/types/project'

/**
 * 테스트 헬퍼: 빈 스냅샷 생성.
 */
const emptyPage = (): Page => ({
  id: 'p1',
  name: 'Page',
  width: 1280,
  height: 800,
  background: '#fff',
  rootIds: [],
})

const snap = (rootIds: string[] = []): EditorSnapshot => ({
  nodes: {},
  page: { ...emptyPage(), rootIds },
  masters: {},
})

describe('history store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1))
  })

  describe('초기 상태', () => {
    it('past/future 비어 있고 canUndo/canRedo는 false', () => {
      const h = useHistoryStore()
      expect(h.canUndo).toBe(false)
      expect(h.canRedo).toBe(false)
    })
  })

  describe('commit', () => {
    it('스냅샷을 past에 push', () => {
      const h = useHistoryStore()
      h.commit(snap(['a']))
      expect(h.canUndo).toBe(true)
    })

    it('past에 deep clone 저장 (원본 변경이 영향 안 줌)', () => {
      const h = useHistoryStore()
      const s = snap(['a'])
      h.commit(s)
      s.page.rootIds.push('b')
      const restored = h.undo(snap())
      expect(restored!.page.rootIds).toEqual(['a'])
    })

    it('새 commit 시 future를 비운다', () => {
      const h = useHistoryStore()
      h.commit(snap(['a']))
      h.undo(snap(['b']))
      expect(h.canRedo).toBe(true)
      h.commit(snap(['c']))
      expect(h.canRedo).toBe(false)
    })
  })

  describe('coalesce', () => {
    it('같은 key + 시간 윈도우 안이면 추가하지 않음', () => {
      const h = useHistoryStore()
      h.commit(snap(['a']), 'edit-1')
      h.commit(snap(['b']), 'edit-1')
      h.commit(snap(['c']), 'edit-1')
      // past에는 첫 commit만 (가장 오래된 직전 상태)
      const restored = h.undo(snap(['final']))
      expect(restored!.page.rootIds).toEqual(['a'])
      expect(h.canUndo).toBe(false)
    })

    it('시간 윈도우 초과 시 새 항목 push', () => {
      const h = useHistoryStore()
      h.commit(snap(['a']), 'edit-1')
      vi.advanceTimersByTime(600)
      h.commit(snap(['b']), 'edit-1')
      const r1 = h.undo(snap(['c']))
      expect(r1!.page.rootIds).toEqual(['b'])
      const r2 = h.undo(snap(['c']))
      expect(r2!.page.rootIds).toEqual(['a'])
    })

    it('다른 key는 새 항목 push', () => {
      const h = useHistoryStore()
      h.commit(snap(['a']), 'edit-1')
      h.commit(snap(['b']), 'edit-2')
      const r1 = h.undo(snap(['c']))
      expect(r1!.page.rootIds).toEqual(['b'])
      const r2 = h.undo(snap(['c']))
      expect(r2!.page.rootIds).toEqual(['a'])
    })

    it('key 없는 commit은 항상 push', () => {
      const h = useHistoryStore()
      h.commit(snap(['a']))
      h.commit(snap(['b']))
      const r1 = h.undo(snap(['c']))
      expect(r1!.page.rootIds).toEqual(['b'])
      const r2 = h.undo(snap(['c']))
      expect(r2!.page.rootIds).toEqual(['a'])
    })
  })

  describe('undo/redo', () => {
    it('undo는 past pop, current를 future에 push', () => {
      const h = useHistoryStore()
      h.commit(snap(['a']))
      const restored = h.undo(snap(['b']))
      expect(restored!.page.rootIds).toEqual(['a'])
      expect(h.canUndo).toBe(false)
      expect(h.canRedo).toBe(true)
    })

    it('redo는 future pop, current를 past에 push', () => {
      const h = useHistoryStore()
      h.commit(snap(['a']))
      h.undo(snap(['b']))
      const restored = h.redo(snap(['a']))
      expect(restored!.page.rootIds).toEqual(['b'])
      expect(h.canUndo).toBe(true)
      expect(h.canRedo).toBe(false)
    })

    it('undo 후 새 commit 시 redo 불가능 (future 초기화)', () => {
      const h = useHistoryStore()
      h.commit(snap(['a']))
      h.undo(snap(['b']))
      h.commit(snap(['c']))
      expect(h.canRedo).toBe(false)
    })

    it('빈 스택에서 undo/redo는 null', () => {
      const h = useHistoryStore()
      expect(h.undo(snap())).toBeNull()
      expect(h.redo(snap())).toBeNull()
    })

    it('undo 직후의 commit은 coalesce되지 않는다', () => {
      const h = useHistoryStore()
      h.commit(snap(['a']), 'edit-1')
      h.undo(snap(['b']))
      h.commit(snap(['c']), 'edit-1')
      // undo 후 lastKey가 reset되어 새 항목으로 push
      expect(h.canUndo).toBe(true)
      const r = h.undo(snap(['d']))
      expect(r!.page.rootIds).toEqual(['c'])
    })
  })

  describe('clear', () => {
    it('past/future 모두 비운다', () => {
      const h = useHistoryStore()
      h.commit(snap(['a']))
      h.undo(snap(['b']))
      h.clear()
      expect(h.canUndo).toBe(false)
      expect(h.canRedo).toBe(false)
    })
  })
})

describe('history snapshot with masters', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('commit → undo → 스냅샷의 masters 필드가 보존됨', () => {
    const history = useHistoryStore()
    const empty: EditorSnapshot = {
      nodes: {},
      page: { id: 'p', name: 'P', width: 100, height: 100, background: '#fff', rootIds: [] },
      masters: {},
    }
    const withMaster: EditorSnapshot = {
      nodes: {},
      page: empty.page,
      masters: {
        m1: { id: 'm1', name: 'Card', rootId: 'r', nodes: {}, createdAt: 0, updatedAt: 0 },
      },
    }
    history.commit(empty) // past: [empty]
    const prev = history.undo(withMaster)
    expect(prev?.masters).toEqual({})
  })
})
