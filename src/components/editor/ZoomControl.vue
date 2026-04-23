<script setup lang="ts">
import { computed } from 'vue'
import { useViewportStore } from '@/stores/viewport'

const viewport = useViewportStore()

/** wheel zoom과 동일 비율로 한 단계 확대/축소 (1.2x) */
const STEP = 1.2

const zoomPercent = computed<number>(() => Math.round(viewport.zoom * 100))

const onZoomIn = (): void => viewport.setZoom(viewport.zoom * STEP)
const onZoomOut = (): void => viewport.setZoom(viewport.zoom / STEP)
const onReset = (): void => viewport.reset()
</script>

<template>
  <div class="zoom-control">
    <button type="button" title="Zoom out" @click="onZoomOut">−</button>
    <span class="zoom-control__percent">{{ zoomPercent }}%</span>
    <button type="button" title="Zoom in" @click="onZoomIn">+</button>
    <button type="button" title="Reset to 100% & center" @click="onReset">Fit</button>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/common/variables' as *;

.zoom-control {
  position: absolute;
  bottom: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: $space-xs;
  background: $bg-panel;
  border: 1px solid $border;
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  z-index: $z-toolbar;
  font-size: 12px;
  user-select: none;

  button {
    background: transparent;
    border: 0;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 13px;
    color: $text-primary;
    min-width: 24px;

    &:hover {
      background: $bg-app;
    }
  }
}

.zoom-control__percent {
  min-width: 44px;
  text-align: center;
  color: $text-muted;
}
</style>
