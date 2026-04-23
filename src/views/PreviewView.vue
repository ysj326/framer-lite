<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEditorStore } from '@/stores/editor'
import PreviewCanvas from '@/components/preview/PreviewCanvas.vue'
import ViewportFrame from '@/components/preview/ViewportFrame.vue'

type ViewportMode = 'desktop' | 'mobile'

/** 각 모드의 프레임 폭 (px) */
const VIEWPORT_WIDTH: Record<ViewportMode, number> = {
  desktop: 1280,
  mobile: 375,
}

const router = useRouter()
const editor = useEditorStore()
const mode = ref<ViewportMode>('desktop')

/**
 * Preview 진입 시 선택 해제.
 * 미리보기에서는 selection outline이 노출되지 않아야 자연스럽다.
 */
onMounted(() => {
  editor.select(null)
})

const goBack = (): void => {
  router.push({ name: 'editor' })
}

const setMode = (next: ViewportMode): void => {
  mode.value = next
}
</script>

<template>
  <div class="preview-view">
    <header class="preview-view__topbar">
      <button type="button" class="preview-view__back" @click="goBack">← Back</button>
      <div class="preview-view__toggle">
        <button
          type="button"
          :class="{ 'is-active': mode === 'desktop' }"
          @click="setMode('desktop')"
        >Desktop</button>
        <button
          type="button"
          :class="{ 'is-active': mode === 'mobile' }"
          @click="setMode('mobile')"
        >Mobile</button>
      </div>
    </header>
    <main class="preview-view__stage">
      <ViewportFrame :width="VIEWPORT_WIDTH[mode]">
        <PreviewCanvas />
      </ViewportFrame>
    </main>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/common/variables' as *;

.preview-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $bg-app;
}

.preview-view__topbar {
  display: flex;
  align-items: center;
  gap: $space-md;
  padding: $space-md $space-lg;
  background: $bg-panel;
  border-bottom: 1px solid $border;
}

.preview-view__back {
  background: $bg-app;
  border: 1px solid $border;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;

  &:hover {
    border-color: $primary;
  }
}

.preview-view__toggle {
  margin-left: auto;
  display: flex;
  gap: $space-xs;

  button {
    background: transparent;
    border: 1px solid $border;
    border-radius: 4px;
    padding: 4px 12px;
    cursor: pointer;
    font-size: 12px;
    color: $text-primary;

    &.is-active {
      background: $primary;
      color: white;
      border-color: $primary;
    }
  }
}

.preview-view__stage {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: $space-xl;
  overflow: auto;
}
</style>
