<script setup lang="ts">
import type { ImageNode } from '@/types/node'
import { useNodeField } from '@/composables/useNodeField'

const props = defineProps<{ node: ImageNode }>()
const get = () => props.node

const src = useNodeField(
  get,
  (n) => (n as ImageNode).data.src,
  (v) => ({ data: { src: String(v), alt: (props.node).data.alt } } as Partial<ImageNode>),
)
const alt = useNodeField(
  get,
  (n) => (n as ImageNode).data.alt,
  (v) => ({ data: { src: (props.node).data.src, alt: String(v) } } as Partial<ImageNode>),
)
</script>

<template>
  <fieldset class="prop-group">
    <legend>Image</legend>
    <label class="prop-row">
      <span>Src</span>
      <input v-model="src" type="text" placeholder="https:// or data:" />
    </label>
    <label class="prop-row">
      <span>Alt</span>
      <input v-model="alt" type="text" />
    </label>
  </fieldset>
</template>

<style lang="scss" scoped>
@use '@/styles/common/variables' as *;

.prop-group {
  border: 0;
  padding: 0 0 $space-md;
  margin: 0;

  legend {
    font-size: 10px;
    text-transform: uppercase;
    color: $text-muted;
    margin-bottom: $space-xs;
  }
}

.prop-row {
  display: flex;
  flex-direction: column;
  font-size: 10px;
  color: $text-muted;
  margin-bottom: $space-xs;

  input {
    border: 1px solid $border;
    border-radius: 3px;
    padding: 4px 6px;
    font-size: 12px;
  }
}
</style>
