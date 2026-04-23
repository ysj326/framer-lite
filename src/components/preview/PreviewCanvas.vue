<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { useEditorStore } from '@/stores/editor'
import NodeRenderer from '@/components/editor/NodeRenderer.vue'

const editor = useEditorStore()

/**
 * 페이지 크기·배경을 그대로 적용한 readonly 캔버스 스타일.
 * 편집용 box-shadow 없이 깨끗한 표면을 유지한다.
 */
const canvasStyle = computed<CSSProperties>(() => ({
  width: `${editor.page.width}px`,
  height: `${editor.page.height}px`,
  background: editor.page.background,
}))
</script>

<template>
  <div class="preview-canvas" :style="canvasStyle">
    <NodeRenderer
      v-for="node in editor.rootNodes"
      :key="node.id"
      :node="node"
    />
  </div>
</template>

<style lang="scss" scoped>
.preview-canvas {
  position: relative;

  // 편집용 인터랙션·선택 표시 모두 비활성화
  :deep(.node) {
    pointer-events: none;
  }
  :deep(.node--selected) {
    outline: none !important;
  }
}
</style>
