<script setup lang="ts">
import type { ShapeNode } from '@/types/node'
import { useNodeField } from '@/composables/useNodeField'

const props = defineProps<{ node: ShapeNode }>()
const get = () => props.node

const variant = useNodeField(
  get,
  (n) => (n as ShapeNode).data.variant,
  (v) => ({ data: { variant: v as 'rect' | 'ellipse' } } as Partial<ShapeNode>),
)

const borderRadius = useNodeField(
  get,
  (n) => n.style.borderRadius ?? 0,
  (v) => ({ style: { ...props.node.style, borderRadius: Number(v) || undefined } }),
)
</script>

<template>
  <fieldset class="prop-group">
    <legend>Shape</legend>
    <label class="prop-row">
      <span>Variant</span>
      <select v-model="variant">
        <option value="rect">Rectangle</option>
        <option value="ellipse">Ellipse</option>
      </select>
    </label>
    <label v-if="variant === 'rect'" class="prop-row">
      <span>Corner radius</span>
      <input v-model.number="borderRadius" type="number" min="0" />
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

  input,
  select {
    padding: 4px 6px;
    font-size: 12px;
    // 배경/색/테두리는 structure/_layouts.scss 공통 style에서 처리
  }
}
</style>
