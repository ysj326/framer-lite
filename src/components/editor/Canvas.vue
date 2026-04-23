<script setup lang="ts">
import { computed, ref, type CSSProperties } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useViewportStore } from '@/stores/viewport'
import { useCanvasViewport } from '@/composables/useCanvasViewport'
import NodeRenderer from './NodeRenderer.vue'
import MoveableWrapper from './MoveableWrapper.vue'
import ZoomControl from './ZoomControl.vue'

const editor = useEditorStore()
const viewport = useViewportStore()

/** wheel/space+drag 이벤트를 받는 외곽 컨테이너 */
const containerEl = ref<HTMLElement | null>(null)
/** 페이지 박스 (transform 적용 대상, MoveableWrapper의 좌표 기준) */
const canvasEl = ref<HTMLElement | null>(null)

useCanvasViewport(containerEl)

/**
 * 페이지 크기/배경 + zoom·pan transform 통합 스타일.
 * transform-origin은 좌상단(top left)이라 컨트롤 단순.
 */
const canvasStyle = computed<CSSProperties>(() => ({
  width: `${editor.page.width}px`,
  height: `${editor.page.height}px`,
  background: editor.page.background,
  transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
  transformOrigin: 'top left',
}))

/**
 * 캔버스 빈 영역 클릭 → 선택 해제.
 * 노드 클릭은 stopPropagation되어 여기까지 오지 않는다.
 */
const onCanvasClick = (): void => {
  editor.select(null)
}
</script>

<template>
  <div ref="containerEl" class="canvas-container">
    <div ref="canvasEl" class="canvas" :style="canvasStyle" @click="onCanvasClick">
      <NodeRenderer
        v-for="node in editor.rootNodes"
        :key="node.id"
        :node="node"
      />
      <MoveableWrapper :container="canvasEl" />
    </div>
    <ZoomControl />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/common/variables' as *;

.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: $space-xl;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.canvas {
  position: relative;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}
</style>
