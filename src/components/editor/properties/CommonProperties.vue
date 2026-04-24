<script setup lang="ts">
import type { AppNode } from '@/types/node'
import { useNodeField } from '@/composables/useNodeField'

const props = defineProps<{ node: AppNode }>()
const get = () => props.node

const x = useNodeField(get, (n) => n.x, (v) => ({ x: Number(v) || 0 }))
const y = useNodeField(get, (n) => n.y, (v) => ({ y: Number(v) || 0 }))
const width = useNodeField(get, (n) => n.width, (v) => ({ width: Number(v) || 0 }))
const height = useNodeField(get, (n) => n.height, (v) => ({ height: Number(v) || 0 }))
const rotation = useNodeField(
  get,
  (n) => n.rotation ?? 0,
  (v) => ({ rotation: Number(v) || 0 }),
)
const zIndex = useNodeField(get, (n) => n.zIndex, (v) => ({ zIndex: Number(v) || 0 }))
const visible = useNodeField(get, (n) => n.visible, (v) => ({ visible: !!v }))

const backgroundColor = useNodeField(
  get,
  (n) => n.style.backgroundColor ?? '',
  (v) => ({ style: { ...props.node.style, backgroundColor: v || undefined } }),
)
const opacity = useNodeField(
  get,
  (n) => n.style.opacity ?? 1,
  (v) => ({ style: { ...props.node.style, opacity: Number(v) } }),
)
</script>

<template>
  <fieldset class="prop-group">
    <legend>Layout</legend>
    <div class="prop-row">
      <label>X<input v-model.number="x" type="number" /></label>
      <label>Y<input v-model.number="y" type="number" /></label>
    </div>
    <div class="prop-row">
      <label>W<input v-model.number="width" type="number" /></label>
      <label>H<input v-model.number="height" type="number" /></label>
    </div>
    <div class="prop-row">
      <label>
        Rotate°
        <input
          v-model.number="rotation"
          type="number"
          step="1"
          data-field="rotation"
        />
      </label>
      <label>Z<input v-model.number="zIndex" type="number" /></label>
    </div>
    <div class="prop-row">
      <label class="prop-row__check">
        <input v-model="visible" type="checkbox" />
        Visible
      </label>
    </div>
  </fieldset>

  <fieldset class="prop-group">
    <legend>Style</legend>
    <div class="prop-row">
      <label>BG<input v-model="backgroundColor" type="color" /></label>
      <label>
        Opacity
        <input v-model.number="opacity" type="range" min="0" max="1" step="0.05" />
      </label>
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
    letter-spacing: 0.5px;
  }
}

.prop-row {
  display: flex;
  gap: $space-xs;
  margin-bottom: $space-xs;

  label {
    flex: 1;
    display: flex;
    flex-direction: column;
    font-size: 10px;
    color: $text-muted;
  }

  input[type='number'],
  input[type='text'],
  input[type='color'] {
    border: 1px solid $border;
    border-radius: 3px;
    padding: 4px 6px;
    font-size: 12px;
    width: 100%;
    box-sizing: border-box;
  }

  input[type='range'] {
    width: 100%;
  }
}

.prop-row__check {
  flex-direction: row;
  align-items: center;
  gap: $space-xs;
  font-size: 12px;
  color: $text-primary;
}
</style>
