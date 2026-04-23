<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'

const props = defineProps<{
  /** 프레임 가로 폭 (px) — Desktop 1280, Mobile 375 등 */
  width: number
}>()

/**
 * 지정 폭 컨테이너 스타일.
 * 콘텐츠가 폭을 넘으면 가로 스크롤로 표시한다.
 */
const frameStyle = computed<CSSProperties>(() => ({
  width: `${props.width}px`,
}))
</script>

<template>
  <div class="viewport-frame" :style="frameStyle">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/common/variables' as *;

.viewport-frame {
  border: 1px solid $border;
  border-radius: 12px;
  overflow: auto;
  background: $bg-canvas;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  max-height: calc(100vh - 120px);
}
</style>
