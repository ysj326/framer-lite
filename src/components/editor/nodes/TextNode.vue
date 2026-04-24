<script setup lang="ts">
import type { TextNode } from '@/types/node'
import { nodeBoxStyle } from '@/utils/nodePresentation'
import { useNodeInteraction } from '@/composables/useNodeInteraction'
import { useInlineEdit } from '@/composables/useInlineEdit'
import { useEditorStore } from '@/stores/editor'

const props = defineProps<{ node: TextNode }>()
const { isSelected, onClick } = useNodeInteraction(() => props.node.id)
const editor = useEditorStore()

/**
 * 인플레이스 편집 - 더블클릭 시 editor.startEdit으로 진입하고
 * contenteditable div에서 텍스트를 편집한다. 여러 줄을 허용(multiline=true)하므로
 * Enter는 줄바꿈이며 Cmd/Ctrl+Enter 또는 blur/Escape로 확정·취소한다.
 */
const { editRef, isEditing, onKeydown, onBlur } = useInlineEdit({
  nodeId: () => props.node.id,
  getValue: () => props.node.data.content,
  setValue: (value) => {
    editor.updateNode(props.node.id, {
      data: { ...props.node.data, content: value },
    })
  },
  multiline: true,
})

/** 더블클릭: 잠긴 노드는 useEditorStore.startEdit에서 자동 거르지만 명시적으로도 체크 */
const onDblclick = (event: MouseEvent): void => {
  event.stopPropagation()
  if (props.node.locked) return
  editor.startEdit(props.node.id)
}
</script>

<template>
  <div
    class="node node--text"
    :class="{
      'node--selected': isSelected,
      'node--editing': isEditing,
    }"
    :style="nodeBoxStyle(node)"
    :data-node-id="node.id"
    @click="onClick"
    @dblclick="onDblclick"
  >
    <div
      v-if="isEditing"
      ref="editRef"
      contenteditable="true"
      class="node--text__editable"
      @keydown="onKeydown"
      @blur="onBlur"
      @click.stop
      @mousedown.stop
    >
      {{ node.data.content }}
    </div>
    <template v-else>{{ node.data.content }}</template>
  </div>
</template>

<style lang="scss" scoped>
.node--text {
  white-space: pre-wrap;
  overflow: hidden;
  line-height: 1.4;
}

.node--text__editable {
  outline: none;
  min-height: 1em;
  cursor: text;
  width: 100%;
  height: 100%;
  white-space: pre-wrap;
}
</style>
