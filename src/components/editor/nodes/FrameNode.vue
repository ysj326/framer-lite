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
.node--frame {
  overflow: hidden;
}
</style>
