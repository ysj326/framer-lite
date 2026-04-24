<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import CommonProperties from './properties/CommonProperties.vue'
import TextProperties from './properties/TextProperties.vue'
import ImageProperties from './properties/ImageProperties.vue'
import ButtonProperties from './properties/ButtonProperties.vue'
import ShapeProperties from './properties/ShapeProperties.vue'

const editor = useEditorStore()

/**
 * 현재 선택된 Frame을 컴포넌트 마스터로 등록하고 그 자리를 Instance로 치환한다.
 * editor.createComponent가 성공하면 같은 id가 Instance가 되어 선택 상태도 그대로 유지된다.
 */
const onCreateComponent = (): void => {
  if (!editor.selectedNode) return
  if (editor.selectedNode.type !== 'frame') return
  editor.createComponent(editor.selectedNode.id)
}
</script>

<template>
  <div class="properties-panel">
    <h3 class="properties-panel__title">Properties</h3>
    <p v-if="!editor.selectedNode" class="properties-panel__empty">
      노드를 선택하세요
    </p>
    <template v-else>
      <div class="properties-panel__name">
        <span class="properties-panel__type">{{ editor.selectedNode.type }}</span>
        <span class="properties-panel__node-name">{{ editor.selectedNode.name }}</span>
      </div>
      <button
        v-if="editor.selectedNode.type === 'frame'"
        type="button"
        class="create-component"
        @click="onCreateComponent"
      >
        Create Component
      </button>
      <CommonProperties :node="editor.selectedNode" />
      <TextProperties v-if="editor.selectedNode.type === 'text'" :node="editor.selectedNode" />
      <ImageProperties v-else-if="editor.selectedNode.type === 'image'" :node="editor.selectedNode" />
      <ButtonProperties v-else-if="editor.selectedNode.type === 'button'" :node="editor.selectedNode" />
      <ShapeProperties v-else-if="editor.selectedNode.type === 'shape'" :node="editor.selectedNode" />
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/common/variables' as *;

.properties-panel {
  font-size: 12px;
}

.properties-panel__title {
  font-size: 11px;
  text-transform: uppercase;
  color: $text-muted;
  margin: 0 0 $space-sm;
  letter-spacing: 0.5px;
}

.properties-panel__empty {
  color: $text-muted;
  font-size: 12px;
}

.properties-panel__name {
  display: flex;
  align-items: baseline;
  gap: $space-xs;
  margin-bottom: $space-md;
}

.properties-panel__type {
  font-size: 10px;
  text-transform: uppercase;
  color: $text-muted;
}

.properties-panel__node-name {
  font-size: 13px;
  font-weight: 600;
}

.create-component {
  width: 100%;
  padding: 6px 8px;
  margin-bottom: $space-sm;
  border: 1px solid $accent;
  background: transparent;
  color: $accent;
  font-size: 12px;
  cursor: pointer;
  border-radius: 3px;
  &:hover { background: rgba($accent, 0.12); }
}
</style>
