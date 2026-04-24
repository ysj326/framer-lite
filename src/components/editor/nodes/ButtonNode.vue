<script setup lang="ts">
import type { ButtonNode } from '@/types/node'
import { nodeBoxStyle } from '@/utils/nodePresentation'
import { useNodeInteraction } from '@/composables/useNodeInteraction'
import { useInlineEdit } from '@/composables/useInlineEdit'
import { useEditorStore } from '@/stores/editor'

const props = defineProps<{ node: ButtonNode }>()
const { isSelected, onClick } = useNodeInteraction(() => props.node.id)
const editor = useEditorStore()

/**
 * 인플레이스 편집 — 버튼 라벨은 한 줄이므로 multiline=false.
 * Enter가 즉시 commit되며, Escape/blur는 Text와 동일.
 */
const { editRef, isEditing, onKeydown, onBlur } = useInlineEdit({
  nodeId: () => props.node.id,
  getValue: () => props.node.data.label,
  setValue: (value) => {
    editor.updateNode(props.node.id, {
      data: { ...props.node.data, label: value },
    })
  },
  multiline: false,
})

const onDblclick = (event: MouseEvent): void => {
  event.stopPropagation()
  if (props.node.locked) return
  editor.startEdit(props.node.id)
}
</script>

<template>
  <div
    class="node node--button"
    :class="{
      'node--selected': isSelected,
      'node--editing': isEditing,
    }"
    :style="nodeBoxStyle(node)"
    :data-node-id="node.id"
    @click="onClick"
    @dblclick="onDblclick"
  >
    <span
      v-if="isEditing"
      ref="editRef"
      contenteditable="true"
      class="node--button__editable"
      @keydown="onKeydown"
      @blur="onBlur"
      @click.stop
      @mousedown.stop
    >{{ node.data.label }}</span>
    <span v-else>{{ node.data.label }}</span>
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

.node--button__editable {
  outline: none;
  min-width: 1ch;
  cursor: text;
  user-select: text;
  white-space: nowrap;
}
</style>
