import { watch, onScopeDispose, type Ref } from 'vue'
import { useViewportStore } from '@/stores/viewport'
import { isEditableTarget } from './useShortcuts'

/** wheel 1px 당 zoom 변화량(0.002 ≈ 부드러움) */
const ZOOM_SENSITIVITY = 0.002

/**
 * 캔버스 영역에 zoom/pan 인터랙션을 부착한다.
 * - **Zoom**: `Cmd/Ctrl + wheel` (그냥 wheel은 페이지 스크롤로 둔다)
 * - **Pan** : `Space` 누른 채 마우스 드래그
 *
 * setup 또는 effectScope 컨텍스트에서 호출 가능.
 * containerRef가 null → element로 변하는 시점에 자동으로 listener를 attach한다.
 * @param containerRef wheel/mousedown을 받는 컨테이너 ref
 */
export const useCanvasViewport = (containerRef: Ref<HTMLElement | null>): void => {
  const viewport = useViewportStore()

  let spacePressed = false
  let panning = false
  let panStart = { mouseX: 0, mouseY: 0, panX: 0, panY: 0 }
  let attached: HTMLElement | null = null

  /**
   * 컨테이너 cursor를 현재 상태(panning/pan-ready)에 맞게 갱신한다.
   */
  const refreshCursor = (): void => {
    const c = containerRef.value
    if (!c) return
    if (panning) c.style.cursor = 'grabbing'
    else if (spacePressed) c.style.cursor = 'grab'
    else c.style.cursor = ''
  }

  const onWheel = (event: WheelEvent): void => {
    if (!event.metaKey && !event.ctrlKey) return
    event.preventDefault()
    const factor = 1 - event.deltaY * ZOOM_SENSITIVITY
    viewport.setZoom(viewport.zoom * factor)
  }

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== 'Space') return
    if (isEditableTarget(event.target)) return
    if (spacePressed) return
    spacePressed = true
    event.preventDefault()
    refreshCursor()
  }

  const onKeyUp = (event: KeyboardEvent): void => {
    if (event.code !== 'Space') return
    spacePressed = false
    refreshCursor()
  }

  const onMouseDown = (event: MouseEvent): void => {
    if (!spacePressed) return
    panning = true
    panStart = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      panX: viewport.panX,
      panY: viewport.panY,
    }
    event.preventDefault()
    refreshCursor()
  }

  const onMouseMove = (event: MouseEvent): void => {
    if (!panning) return
    viewport.setPan(
      panStart.panX + (event.clientX - panStart.mouseX),
      panStart.panY + (event.clientY - panStart.mouseY),
    )
  }

  const onMouseUp = (): void => {
    if (!panning) return
    panning = false
    refreshCursor()
  }

  /**
   * containerRef가 새 element가 되면 wheel/mousedown 리스너를 그쪽으로 옮긴다.
   * null로 바뀌면 detach만 한다.
   */
  const attach = (el: HTMLElement | null): void => {
    if (attached) {
      attached.removeEventListener('wheel', onWheel)
      attached.removeEventListener('mousedown', onMouseDown)
    }
    attached = el
    if (el) {
      el.addEventListener('wheel', onWheel, { passive: false })
      el.addEventListener('mousedown', onMouseDown)
    }
  }

  watch(containerRef, attach, { immediate: true })
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)

  onScopeDispose(() => {
    attach(null)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  })
}
