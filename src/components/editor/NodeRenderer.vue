<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import * as tree from '@/utils/nodeTree'
import type { AppNode } from '@/types/node'
import TextNode from './nodes/TextNode.vue'
import ImageNode from './nodes/ImageNode.vue'
import ButtonNode from './nodes/ButtonNode.vue'
import FrameNode from './nodes/FrameNode.vue'
import ShapeNode from './nodes/ShapeNode.vue'
import InstanceNode from './nodes/InstanceNode.vue'

defineOptions({ name: 'NodeRenderer' })

const props = defineProps<{ node: AppNode }>()
const editor = useEditorStore()

/**
 * Frame일 때만 자식 노드 배열을 반환한다.
 * v-if narrowing 후 Frame 분기에서만 사용.
 */
const childNodes = computed<AppNode[]>(() =>
  props.node.type === 'frame'
    ? tree.getChildren(editor.nodes, props.node.id, [])
    : [],
)
</script>

<template>
  <TextNode v-if="node.type === 'text'" :node="node" />
  <ImageNode v-else-if="node.type === 'image'" :node="node" />
  <ButtonNode v-else-if="node.type === 'button'" :node="node" />
  <ShapeNode v-else-if="node.type === 'shape'" :node="node" />
  <InstanceNode v-else-if="node.type === 'instance'" :node="node" />
  <FrameNode v-else-if="node.type === 'frame'" :node="node">
    <NodeRenderer
      v-for="child in childNodes"
      :key="child.id"
      :node="child"
    />
  </FrameNode>
</template>
