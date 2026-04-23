import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 최소/최대 zoom (10% ~ 400%) */
const MIN_ZOOM = 0.1
const MAX_ZOOM = 4

/**
 * 캔버스 뷰포트(zoom·pan) 상태.
 * 데이터 변경이 아닌 사용자 시점이라 history(undo)에 포함되지 않는다.
 */
export const useViewportStore = defineStore('viewport', () => {
  const zoom = ref<number>(1)
  const panX = ref<number>(0)
  const panY = ref<number>(0)

  /**
   * zoom을 [MIN_ZOOM, MAX_ZOOM] 범위로 clamp 후 적용한다.
   * @param value 새 zoom (1 = 100%)
   */
  const setZoom = (value: number): void => {
    zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value))
  }

  /**
   * pan 좌표를 동시에 갱신한다.
   * @param x 가로 픽셀 오프셋
   * @param y 세로 픽셀 오프셋
   */
  const setPan = (x: number, y: number): void => {
    panX.value = x
    panY.value = y
  }

  /**
   * 100% / 원점으로 초기화.
   */
  const reset = (): void => {
    zoom.value = 1
    panX.value = 0
    panY.value = 0
  }

  return { zoom, panX, panY, setZoom, setPan, reset }
})
