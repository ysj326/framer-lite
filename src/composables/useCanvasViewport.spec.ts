import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { effectScope, ref, type EffectScope } from 'vue'
import { useCanvasViewport } from './useCanvasViewport'
import { useViewportStore } from '@/stores/viewport'

describe('useCanvasViewport', () => {
  let scope: EffectScope
  let container: HTMLElement

  beforeEach(() => {
    setActivePinia(createPinia())
    container = document.createElement('div')
    document.body.appendChild(container)
    scope = effectScope()
    scope.run(() => {
      useCanvasViewport(ref(container))
    })
  })

  afterEach(() => {
    scope.stop()
    if (container.parentNode) container.parentNode.removeChild(container)
  })

  /**
   * happy-dom의 WheelEvent constructor 옵션 처리가 불완전해
   * deltaY/metaKey를 직접 attach 한 합성 이벤트를 사용한다.
   */
  const fireWheel = (
    target: EventTarget,
    init: { deltaY: number; metaKey?: boolean; ctrlKey?: boolean },
  ): void => {
    const evt = new Event('wheel', { bubbles: true, cancelable: true })
    Object.assign(evt, {
      deltaY: init.deltaY,
      metaKey: !!init.metaKey,
      ctrlKey: !!init.ctrlKey,
    })
    target.dispatchEvent(evt)
  }

  describe('wheel zoom', () => {
    it('modifier 없이 wheel은 zoom 변화 없음', () => {
      const v = useViewportStore()
      fireWheel(container, { deltaY: 100 })
      expect(v.zoom).toBe(1)
    })

    it('Cmd+wheel(deltaY 음수) → zoom in', () => {
      const v = useViewportStore()
      fireWheel(container, { deltaY: -100, metaKey: true })
      expect(v.zoom).toBeGreaterThan(1)
    })

    it('Ctrl+wheel(deltaY 양수) → zoom out', () => {
      const v = useViewportStore()
      fireWheel(container, { deltaY: 100, ctrlKey: true })
      expect(v.zoom).toBeLessThan(1)
    })
  })

  describe('Space + drag pan', () => {
    it('Space 누르지 않은 상태의 mousedown은 pan 무시', () => {
      const v = useViewportStore()
      container.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }))
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 200 }))
      window.dispatchEvent(new MouseEvent('mouseup'))
      expect(v.panX).toBe(0)
      expect(v.panY).toBe(0)
    })

    it('Space → mousedown → mousemove → panX/Y 갱신', () => {
      const v = useViewportStore()
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
      container.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }))
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 130 }))
      expect(v.panX).toBe(50)
      expect(v.panY).toBe(30)
    })

    it('mouseup 후 추가 mousemove는 영향 없음', () => {
      const v = useViewportStore()
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
      container.dispatchEvent(new MouseEvent('mousedown', { clientX: 0, clientY: 0 }))
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10 }))
      window.dispatchEvent(new MouseEvent('mouseup'))
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 999, clientY: 999 }))
      expect(v.panX).toBe(10)
      expect(v.panY).toBe(10)
    })

    it('input 포커스 중 Space는 pan을 활성화하지 않는다', () => {
      const v = useViewportStore()
      const input = document.createElement('input')
      document.body.appendChild(input)
      input.focus()
      input.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }))
      container.dispatchEvent(new MouseEvent('mousedown', { clientX: 0, clientY: 0 }))
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 50 }))
      expect(v.panX).toBe(0)
      document.body.removeChild(input)
    })
  })

  describe('cursor 표시', () => {
    it('Space 누르면 cursor=grab, mousedown 시 grabbing, mouseup 후 grab', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
      expect(container.style.cursor).toBe('grab')
      container.dispatchEvent(new MouseEvent('mousedown', { clientX: 0, clientY: 0 }))
      expect(container.style.cursor).toBe('grabbing')
      window.dispatchEvent(new MouseEvent('mouseup'))
      expect(container.style.cursor).toBe('grab')
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }))
      expect(container.style.cursor).toBe('')
    })
  })
})
