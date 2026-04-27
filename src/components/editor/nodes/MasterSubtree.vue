<script setup lang="ts">
import { computed } from 'vue'
import type { AppNode } from '@/types/node'
import TextNode from './TextNode.vue'
import ImageNode from './ImageNode.vue'
import ButtonNode from './ButtonNode.vue'
import FrameNode from './FrameNode.vue'
import ShapeNode from './ShapeNode.vue'

defineOptions({ name: 'MasterSubtree' })

/**
 * master.nodes scope 안에서 재귀 렌더하는 컴포넌트.
 * NodeRenderer와 별개 경로로, editor.nodes 대신 주입된 scope를 사용한다.
 * 19a는 master 안에 instance 포함 불가 — Nesting은 19f에서 확장.
 */
const props = defineProps<{
  /** 렌더할 노드 */
  node: AppNode
  /** master.nodes (자식 lookup용 범위) */
  scope: Record<string, AppNode>
}>()

/** frame일 때만 scope에서 자식을 찾아 반환 */
const childNodes = computed<AppNode[]>(() =>
  props.node.type === 'frame'
    ? (props.node.childIds.map((id) => props.scope[id]).filter(Boolean) as AppNode[])
    : [],
)
</script>

<template>
  <TextNode v-if="node.type === 'text'" :node="node" />
  <ImageNode v-else-if="node.type === 'image'" :node="node" />
  <ButtonNode v-else-if="node.type === 'button'" :node="node" />
  <ShapeNode v-else-if="node.type === 'shape'" :node="node" />
  <FrameNode v-else-if="node.type === 'frame'" :node="node">
    <MasterSubtree
      v-for="child in childNodes"
      :key="child.id"
      :node="child"
      :scope="scope"
    />
  </FrameNode>
  <!-- 19a: master 안에 instance는 허용하지 않음 (Nesting은 19f) -->
</template>
