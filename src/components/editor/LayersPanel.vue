<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import LayerItem from './LayerItem.vue'
import type { AppNode } from '@/types/node'

const editor = useEditorStore()

/**
 * 페이지 루트 노드 — z-order 위쪽이 패널 위에 오도록 reverse 표시.
 * (배열 순서가 z-order의 진실. 마지막 = 화면 앞.)
 */
const rootLayers = computed<AppNode[]>(() =>
  [...editor.page.rootIds]
    .reverse()
    .map((id) => editor.nodes[id])
    .filter((n): n is AppNode => n != null),
)
</script>

<template>
  <div class="layers-panel">
    <h3 class="layers-panel__title">Layers</h3>
    <ul v-if="rootLayers.length" class="layers-panel__list">
      <LayerItem
        v-for="n in rootLayers"
        :key="n.id"
        :node="n"
        :depth="0"
      />
    </ul>
    <p v-else class="layers-panel__empty">노드 없음</p>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/common/variables' as *;

.layers-panel {
  font-size: 12px;
}

.layers-panel__title {
  font-size: 11px;
  text-transform: uppercase;
  color: $text-muted;
  margin: 0 0 $space-sm;
  letter-spacing: 0.5px;
}

.layers-panel__list {
  margin: 0;
  padding: 0;
}

.layers-panel__empty {
  color: $text-muted;
  font-size: 12px;
}
</style>
