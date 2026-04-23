<script setup lang="ts">
import type { TextNode } from '@/types/node'
import { useNodeField } from '@/composables/useNodeField'

const props = defineProps<{ node: TextNode }>()
const get = () => props.node

const content = useNodeField(
  get,
  (n) => (n as TextNode).data.content,
  (v) => ({ data: { content: String(v) } } as Partial<TextNode>),
)

const color = useNodeField(
  get,
  (n) => n.style.color ?? '#000000',
  (v) => ({ style: { ...props.node.style, color: v || undefined } }),
)

const fontSize = useNodeField(
  get,
  (n) => n.style.fontSize ?? 16,
  (v) => ({ style: { ...props.node.style, fontSize: Number(v) || undefined } }),
)

const fontWeight = useNodeField(
  get,
  (n) => Number(n.style.fontWeight ?? 400),
  (v) => ({ style: { ...props.node.style, fontWeight: Number(v) || undefined } }),
)
</script>

<template>
  <fieldset class="prop-group">
    <legend>Text</legend>
    <label class="prop-text">
      Content
      <textarea v-model="content" rows="3" />
    </label>
    <div class="prop-row">
      <label>Color<input v-model="color" type="color" /></label>
      <label>Size<input v-model.number="fontSize" type="number" min="8" /></label>
      <label>Weight<input v-model.number="fontWeight" type="number" min="100" max="900" step="100" /></label>
    </div>
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

.prop-text {
  display: flex;
  flex-direction: column;
  font-size: 10px;
  color: $text-muted;
  margin-bottom: $space-xs;

  textarea {
    border: 1px solid $border;
    border-radius: 3px;
    padding: 4px 6px;
    font-size: 12px;
    font-family: inherit;
    resize: vertical;
  }
}

.prop-row {
  display: flex;
  gap: $space-xs;

  label {
    flex: 1;
    display: flex;
    flex-direction: column;
    font-size: 10px;
    color: $text-muted;
  }

  input {
    border: 1px solid $border;
    border-radius: 3px;
    padding: 4px 6px;
    font-size: 12px;
    width: 100%;
    box-sizing: border-box;
  }
}
</style>
