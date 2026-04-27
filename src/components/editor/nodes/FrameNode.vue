<script setup lang="ts">
import type { FrameNode } from '@/types/node'
import { nodeBoxStyle } from '@/utils/nodePresentation'
import { useNodeInteraction } from '@/composables/useNodeInteraction'

const props = defineProps<{ node: FrameNode }>()
const { isSelected, onClick } = useNodeInteraction(() => props.node.id)
</script>

<template>
  <div
    class="node node--frame"
    :class="{ 'node--selected': isSelected }"
    :style="nodeBoxStyle(node)"
    :data-node-id="node.id"
    @click="onClick"
  >
    <slot />
  </div>
</template>

<style lang="scss" scoped>
// Frame은 자식 영역을 클립하지 않는다 (Figma "Clip content: OFF" 기본 동작과 일치).
// 추후 Phase에서 per-Frame "clip content" 토글이 필요해지면 node.style에 새 필드 추가.
.node--frame {
  overflow: visible;
}
</style>
