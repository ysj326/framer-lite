<script setup lang="ts">
import type { ButtonNode } from '@/types/node'
import { nodeBoxStyle } from '@/utils/nodePresentation'
import { useNodeInteraction } from '@/composables/useNodeInteraction'

const props = defineProps<{ node: ButtonNode }>()
const { isSelected, onClick } = useNodeInteraction(() => props.node.id)
</script>

<template>
  <div
    class="node node--button"
    :class="{ 'node--selected': isSelected }"
    :style="nodeBoxStyle(node)"
    :data-node-id="node.id"
    @click="onClick"
  >
    <span>{{ node.data.label }}</span>
  </div>
</template>

<style lang="scss" scoped>
.node--button {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: default; // 에디터 안에선 실제 링크 동작 없음
  user-select: none;
}
</style>
