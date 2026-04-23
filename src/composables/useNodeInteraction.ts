import { computed, type ComputedRef } from 'vue'
import { useEditorStore } from '@/stores/editor'

/**
 * useNodeInteraction의 반환 값.
 */
export interface NodeInteractionApi {
  /** 현재 노드가 선택 상태인지 여부 (reactive) */
  isSelected: ComputedRef<boolean>
  /** 노드 클릭 핸들러 — 캔버스 클릭으로의 버블 차단 + 선택 */
  onClick: (event: MouseEvent) => void
}

/**
 * 노드 컴포넌트에서 공통으로 쓰는 선택/클릭 인터랙션을 제공한다.
 * @param nodeId 노드 id를 반환하는 함수 (props가 reactive하게 바뀌어도 항상 최신을 읽기 위해 함수 형태)
 * @returns `isSelected`, `onClick`
 */
export const useNodeInteraction = (nodeId: () => string): NodeInteractionApi => {
  const editor = useEditorStore()

  const isSelected = computed<boolean>(() => editor.selectedId === nodeId())

  const onClick = (event: MouseEvent): void => {
    event.stopPropagation()
    editor.select(nodeId())
  }

  return { isSelected, onClick }
}
