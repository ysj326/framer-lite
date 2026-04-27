import { nanoid } from 'nanoid'
import type { AppNode } from '@/types/node'
import type { Master } from '@/types/master'

/**
 * masters 맵 안에서 동일 이름이 충돌하면 "(1)", "(2)" 접미사를 붙여 고유화한다.
 * @param base 희망 이름
 * @param masters 현재 masters 맵
 * @returns 충돌 없는 고유 이름
 */
export const uniqueMasterName = (
  base: string,
  masters: Record<string, Master>,
): string => {
  const used = new Set<string>(Object.values(masters).map((m) => m.name))
  if (!used.has(base)) return base
  let n = 1
  while (used.has(`${base} (${n})`)) n += 1
  return `${base} (${n})`
}

/**
 * 주어진 rootId의 subtree(자기 자신 + 모든 자손)를 원본 Record에서 수집해
 * 새 Record로 반환한다. 원본은 변경하지 않는다.
 *
 * 19a 제약: subtree에 instance 노드가 포함되면 에러 (Nesting은 19f에서 해제).
 * @param nodes 원본 노드 맵
 * @param rootId 수집 시작 id
 * @returns rootId와 자손만 담긴 새 Record
 * @throws subtree 안에 instance 타입이 있을 때
 */
export const collectSubtree = (
  nodes: Record<string, AppNode>,
  rootId: string,
): Record<string, AppNode> => {
  const result: Record<string, AppNode> = {}

  const visit = (id: string): void => {
    const node = nodes[id]
    if (!node) return
    if (node.type === 'instance') {
      throw new Error(`subtree에 instance 노드(${id})는 허용되지 않음 (19f Nesting 예정)`)
    }
    result[id] = node
    for (const childId of node.childIds) visit(childId)
  }

  visit(rootId)
  return result
}

/**
 * 주어진 Frame 노드로부터 Master 객체를 만든다. 순수 함수 — state 변경 없음.
 *
 * 호출자는 이후 (1) `masters[master.id] = master`로 등록, (2) subtree를
 * page.nodes에서 제거, (3) 해당 위치에 Instance 노드를 삽입하는 흐름을
 * 원자적으로 수행해야 한다.
 *
 * @param nodes 원본 page 노드 맵
 * @param frameId Frame 노드 id (타입이 'frame'이 아니면 throw)
 * @param masters 현재 masters 맵 (이름 중복 판정용, 이 함수는 변경하지 않음)
 * @param now 시각 공급자 (테스트 주입용, 기본 `Date.now`)
 * @returns 신규 Master 객체
 * @throws rootId 노드가 존재하지 않거나 frame 타입이 아닐 때
 */
export const buildMasterFromFrame = (
  nodes: Record<string, AppNode>,
  frameId: string,
  masters: Record<string, Master>,
  now: () => number = Date.now,
): Master => {
  const frame = nodes[frameId]
  if (!frame || frame.type !== 'frame') {
    throw new Error(`frameId(${frameId})는 frame 노드여야 합니다`)
  }
  const subtree = collectSubtree(nodes, frameId)
  const ts = now()
  return {
    id: nanoid(),
    name: uniqueMasterName(frame.name, masters),
    rootId: frameId,
    nodes: subtree,
    createdAt: ts,
    updatedAt: ts,
  }
}
