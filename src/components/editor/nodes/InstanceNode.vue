<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import type { AppNode, InstanceNode as InstanceNodeType } from '@/types/node'
import MasterSubtree from './MasterSubtree.vue'

defineOptions({ name: 'InstanceNode' })

/**
 * Instance 노드 entry 렌더 컴포넌트.
 * masters에서 참조 master를 조회해 MasterSubtree로 내부 트리를 펼친다.
 * master가 없으면 회색 placeholder를 표시한다 (Phase 19a는 블랙박스 정책 — 내부 선택 X).
 */
const props = defineProps<{ node: InstanceNodeType }>()
const editor = useEditorStore()

/** 참조 master (없으면 null) */
const master = computed(() => editor.masters[props.node.data.masterId] ?? null)

/** master의 root frame 노드 (없거나 frame이 아니면 null) */
const rootFrame = computed<AppNode | null>(() => {
  if (!master.value) return null
  const r = master.value.nodes[master.value.rootId]
  return r && r.type === 'frame' ? r : null
})

/** rootFrame 아래 자식 노드 배열 (scope = master.nodes) */
const rootChildren = computed<AppNode[]>(() => {
  if (!master.value || !rootFrame.value) return []
  return rootFrame.value.childIds
    .map((id) => master.value!.nodes[id])
    .filter(Boolean) as AppNode[]
})
</script>

<template>
  <div
    v-if="!master || !rootFrame"
    class="instance-missing"
    :style="{
      width: node.width + 'px',
      height: node.height + 'px',
    }"
  >
    Missing master: {{ node.data.masterId }}
  </div>
  <div v-else class="instance-wrapper">
    <MasterSubtree
      v-for="child in rootChildren"
      :key="child.id"
      :node="child"
      :scope="master.nodes"
    />
  </div>
</template>

<style lang="scss" scoped>
.instance-missing {
  border: 1px dashed #999;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  box-sizing: border-box;
}
.instance-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
