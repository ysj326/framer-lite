<script setup lang="ts">
import type { TextNode } from '@/types/node'
import { nodeBoxStyle } from '@/utils/nodePresentation'
import { useNodeInteraction } from '@/composables/useNodeInteraction'

const props = defineProps<{ node: TextNode }>()
const { isSelected, onClick } = useNodeInteraction(() => props.node.id)
</script>

<template>
  <div
    class="node node--text"
    :class="{ 'node--selected': isSelected }"
    :style="nodeBoxStyle(node)"
    :data-node-id="node.id"
    @click="onClick"
  >
    {{ node.data.content }}
  </div>
</template>

<style lang="scss" scoped>
.node--text {
  white-space: pre-wrap;
  overflow: hidden;
  line-height: 1.4;
}
</style>
