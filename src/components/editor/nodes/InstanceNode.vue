<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { useEditorStore } from '@/stores/editor'
import type { AppNode, InstanceNode as InstanceNodeType } from '@/types/node'
import MasterSubtree from './MasterSubtree.vue'
import { nodeBoxStyle } from '@/utils/nodePresentation'
import { useNodeInteraction } from '@/composables/useNodeInteraction'

defineOptions({ name: 'InstanceNode' })

/**
 * Instance 노드 entry 렌더 컴포넌트.
 * masters에서 참조 master를 조회해 MasterSubtree로 내부 트리를 펼친다.
 * master가 없으면 회색 placeholder를 표시한다 (Phase 19a는 블랙박스 정책 — 내부 선택 X).
 * 표준 노드 패턴 준수: data-node-id, nodeBoxStyle, @click, node--selected 적용.
 */
const props = defineProps<{ node: InstanceNodeType }>()
const editor = useEditorStore()
const { isSelected, onClick } = useNodeInteraction(() => props.node.id)

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

/**
 * Instance wrapper에 적용할 최종 CSS.
 * - 위치/크기/회전/zIndex/visibility는 Instance 자신의 좌표를 사용 (정책 B).
 * - 시각 속성(backgroundColor/color/opacity/fontSize/fontWeight/borderRadius)은
 *   Instance.style이 비어 있을 때 master rootFrame.style을 fallback으로 계승한다.
 *   19b에서 Instance가 override를 가지면 Instance 값이 우선 적용된다.
 *   HTML export(`htmlExport.ts`)의 wrapperDecls 합성 로직과 일치.
 */
const wrapperStyle = computed<CSSProperties>(() => {
  const base = nodeBoxStyle(props.node)
  const root = rootFrame.value
  if (!root) return base
  const rs = root.style
  return {
    ...base,
    backgroundColor: base.backgroundColor ?? rs.backgroundColor,
    color: base.color ?? rs.color,
    opacity: base.opacity ?? rs.opacity,
    fontSize: base.fontSize ?? (rs.fontSize != null ? `${rs.fontSize}px` : undefined),
    fontWeight: base.fontWeight ?? rs.fontWeight,
    borderRadius:
      base.borderRadius ?? (rs.borderRadius != null ? `${rs.borderRadius}px` : undefined),
  }
})
</script>

<template>
  <div
    v-if="!master || !rootFrame"
    class="node node--instance node--instance-missing"
    :class="{ 'node--selected': isSelected }"
    :style="nodeBoxStyle(node)"
    :data-node-id="node.id"
    @click="onClick"
  >
    Missing master: {{ node.data.masterId }}
  </div>
  <div
    v-else
    class="node node--instance"
    :class="{ 'node--selected': isSelected }"
    :style="wrapperStyle"
    :data-node-id="node.id"
    @click="onClick"
  >
    <MasterSubtree
      v-for="child in rootChildren"
      :key="child.id"
      :node="child"
      :scope="master.nodes"
    />
  </div>
</template>

<style lang="scss" scoped>
.node--instance-missing {
  border: 1px dashed #999;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  box-sizing: border-box;
}
</style>
