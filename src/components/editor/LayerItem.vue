<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import * as tree from '@/utils/nodeTree'
import type { AppNode } from '@/types/node'

defineOptions({ name: 'LayerItem' })

const props = defineProps<{ node: AppNode; depth: number }>()
const editor = useEditorStore()

const isSelected = computed<boolean>(() => editor.selectedId === props.node.id)

/**
 * Frame이면 자식 노드를 z-order 역순으로 반환(패널 위 = 화면 앞).
 */
const childLayers = computed<AppNode[]>(() => {
  if (props.node.type !== 'frame') return []
  return [...tree.getChildren(editor.nodes, props.node.id, [])].reverse()
})

const onSelect = (event: MouseEvent): void => {
  event.stopPropagation()
  editor.select(props.node.id)
}

const onToggleVisibility = (): void => {
  editor.updateNode(props.node.id, { visible: !props.node.visible })
}

/** 한 단계 앞으로 (z+, 배열 idx+1) */
const onMoveUp = (): void => editor.reorder(props.node.id, 1)
/** 한 단계 뒤로 (z-, 배열 idx-1) */
const onMoveDown = (): void => editor.reorder(props.node.id, -1)
</script>

<template>
  <li class="layer-item">
    <div
      class="layer-item__row"
      :class="{ 'layer-item__row--selected': isSelected }"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      @click="onSelect"
    >
      <span class="layer-item__name">
        <span
          v-if="node.type === 'instance'"
          class="layer-item__icon"
          title="Component Instance"
        >◆</span>
        {{ node.name }}
      </span>
      <span class="layer-item__type">{{ node.type }}</span>
      <button
        type="button"
        class="layer-item__btn"
        :title="node.visible ? '숨기기' : '보이기'"
        @click.stop="onToggleVisibility"
      >
        {{ node.visible ? '👁' : '◌' }}
      </button>
      <button type="button" class="layer-item__btn" title="앞으로 (z+)" @click.stop="onMoveUp">▲</button>
      <button type="button" class="layer-item__btn" title="뒤로 (z-)" @click.stop="onMoveDown">▼</button>
    </div>
    <ul v-if="childLayers.length" class="layer-item__children">
      <LayerItem
        v-for="c in childLayers"
        :key="c.id"
        :node="c"
        :depth="depth + 1"
      />
    </ul>
  </li>
</template>

<style lang="scss" scoped>
@use '@/styles/common/variables' as *;

.layer-item {
  list-style: none;
}

.layer-item__row {
  display: flex;
  align-items: center;
  gap: $space-xs;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  border-radius: 3px;
  user-select: none;

  &:hover {
    // navy 패널 배경 위에서 살짝 밝은 cream 오버레이
    background: rgba($brand-cream, 0.06);
  }

  &--selected {
    background: rgba($accent, 0.18);
    color: $accent;
    border-left: 2px solid $accent;
    padding-left: 6px; // 좌측 바 두께 보정
  }
}

.layer-item__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layer-item__type {
  font-size: 10px;
  color: $text-muted;
  text-transform: uppercase;
}

.layer-item__icon {
  font-size: 10px;
  color: $accent;
  margin-right: 4px;
}

.layer-item__btn {
  background: transparent;
  border: 0;
  cursor: pointer;
  padding: 2px 4px;
  font-size: 11px;
  color: $text-muted;

  &:hover {
    color: $text-primary;
  }
}

.layer-item__children {
  margin: 0;
  padding: 0;
}
</style>
