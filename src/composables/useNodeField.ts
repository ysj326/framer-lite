import { computed, type WritableComputedRef } from 'vue'
import { useEditorStore } from '@/stores/editor'
import type { AppNode } from '@/types/node'

/**
 * 선택 노드의 임의 필드를 양방향 바인딩한다.
 * 직접 필드(x, y 등)와 중첩 필드(style.color 등) 모두 동일 패턴으로 처리한다.
 *
 * 입력 → `editor.updateNode(id, write(value))` 호출 → history coalesce(`update-${id}`)로 자동 묶임.
 *
 * @param node 노드를 반환하는 함수 (props가 변해도 항상 최신을 읽기 위해 함수 형태)
 * @param read 노드에서 값을 추출
 * @param write 새 값으로부터 updateNode patch를 생성
 * @returns v-model로 사용 가능한 WritableComputed
 */
export const useNodeField = <T>(
  node: () => AppNode,
  read: (n: AppNode) => T,
  write: (value: T) => Partial<AppNode>,
): WritableComputedRef<T> => {
  const editor = useEditorStore()
  return computed({
    get: () => read(node()),
    set: (value) => editor.updateNode(node().id, write(value)),
  })
}
