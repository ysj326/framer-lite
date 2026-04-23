<script setup lang="ts">
import type { ButtonNode } from '@/types/node'
import { useNodeField } from '@/composables/useNodeField'

const props = defineProps<{ node: ButtonNode }>()
const get = () => props.node

const label = useNodeField(
  get,
  (n) => (n as ButtonNode).data.label,
  (v) => ({ data: { label: String(v), href: (props.node).data.href } } as Partial<ButtonNode>),
)
const href = useNodeField(
  get,
  (n) => (n as ButtonNode).data.href,
  (v) => ({ data: { label: (props.node).data.label, href: String(v) } } as Partial<ButtonNode>),
)
</script>

<template>
  <fieldset class="prop-group">
    <legend>Button</legend>
    <label class="prop-row">
      <span>Label</span>
      <input v-model="label" type="text" />
    </label>
    <label class="prop-row">
      <span>Link (href)</span>
      <input v-model="href" type="text" placeholder="https://" />
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
