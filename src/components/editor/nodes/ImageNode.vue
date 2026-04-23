<script setup lang="ts">
import type { ImageNode } from '@/types/node'
import { nodeBoxStyle } from '@/utils/nodePresentation'
import { useNodeInteraction } from '@/composables/useNodeInteraction'

const props = defineProps<{ node: ImageNode }>()
const { isSelected, onClick } = useNodeInteraction(() => props.node.id)
</script>

<template>
  <div
    class="node node--image"
    :class="{ 'node--selected': isSelected }"
    :style="nodeBoxStyle(node)"
    :data-node-id="node.id"
    @click="onClick"
  >
    <img v-if="node.data.src" :src="node.data.src" :alt="node.data.alt" />
    <span v-else class="node--image__placeholder">Image</span>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/common/variables' as *;

.node--image {
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.04);
}

.node--image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.node--image__placeholder {
  color: $text-muted;
  font-size: 12px;
}
</style>
