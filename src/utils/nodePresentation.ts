import type { CSSProperties } from 'vue'
import type { AppNode } from '@/types/node'

/**
 * 노드 1개를 캔버스/미리보기에서 표시할 때 적용되는 CSS 속성.
 * 좌표·크기·zIndex·가시성·NodeStyle을 표준 CSS로 매핑한다.
 * Shape variant 같은 타입 전용 스타일은 호출 측에서 추가로 머지한다.
 * @param node 대상 노드
 * @returns Vue `:style` 바인딩에 그대로 전달 가능한 객체
 */
export const nodeBoxStyle = (node: AppNode): CSSProperties => {
  const { style } = node
  return {
    position: 'absolute',
    left: `${node.x}px`,
    top: `${node.y}px`,
    width: `${node.width}px`,
    height: `${node.height}px`,
    zIndex: node.zIndex,
    visibility: node.visible ? 'visible' : 'hidden',
    opacity: style.opacity,
    backgroundColor: style.backgroundColor,
    color: style.color,
    fontSize: style.fontSize != null ? `${style.fontSize}px` : undefined,
    fontWeight: style.fontWeight,
    borderRadius: style.borderRadius != null ? `${style.borderRadius}px` : undefined,
  }
}
