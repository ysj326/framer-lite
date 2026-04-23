<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import type { ShapeNode } from '@/types/node'
import { nodeBoxStyle } from '@/utils/nodePresentation'
import { useNodeInteraction } from '@/composables/useNodeInteraction'

const props = defineProps<{ node: ShapeNode }>()
const { isSelected, onClick } = useNodeInteraction(() => props.node.id)

/**
 * Shape variant별 추가 스타일.
 * `ellipse`는 borderRadius 50%로 타원/원으로 표시.
 */
const shapeStyle = computed<CSSProperties>(() => {
  const base = nodeBoxStyle(props.node)
  if (props.node.data.variant === 'ellipse') {
    return { ...base, borderRadius: '50%' }
  }
  return base
})
</script>

<template>
  <div
    class="node node--shape"
    :class="{ 'node--selected': isSelected }"
    :style="shapeStyle"
    :data-node-id="node.id"
    @click="onClick"
  ></div>
</template>

<style lang="scss" scoped>
@use '@/styles/common/variables' as *;

.node--shape {
  // 배경색 미지정 시 기본 가시성을 위해 옅은 배경
  &:not([style*='background-color']) {
    background: $border;
  }
}
</style>
