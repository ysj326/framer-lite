import { nanoid } from 'nanoid'
import type { AppNode } from '@/types/node'

/**
 * 노드 컬렉션과 페이지 루트 id 목록을 묶은 트리 상태.
 * 모든 변경 함수는 이 형태의 새 객체를 반환한다 (immutable).
 */
export interface TreeState {
  nodes: Record<string, AppNode>
  rootIds: string[]
}

/**
 * id로 노드를 조회한다.
 * @param nodes 노드 평면 저장소
 * @param id 찾을 노드 id
 * @returns 노드 또는 undefined
 */
export const findById = (
  nodes: Record<string, AppNode>,
  id: string,
): AppNode | undefined => nodes[id]

/**
 * 특정 부모의 직계 자식 노드들을 배열 순서로 반환한다.
 * `parentId`가 null이면 페이지 루트(rootIds)를 사용한다.
 * 참조가 깨진 자식 id(노드 미존재)는 결과에서 제외된다.
 * @param nodes 노드 평면 저장소
 * @param parentId 부모 id 또는 null(페이지 직속)
 * @param rootIds 페이지 직속 노드 id 배열
 * @returns 직계 자식 노드 배열
 */
export const getChildren = (
  nodes: Record<string, AppNode>,
  parentId: string | null,
  rootIds: string[],
): AppNode[] => {
  const ids = parentId === null ? rootIds : (nodes[parentId]?.childIds ?? [])
  const result: AppNode[] = []
  for (const id of ids) {
    const node = nodes[id]
    if (node) result.push(node)
  }
  return result
}

/**
 * 트리를 깊이 우선(depth-first)으로 순회하며 각 노드를 방문한다.
 * @param nodes 노드 평면 저장소
 * @param rootIds 시작 루트 id 배열
 * @param visit 각 노드에 대해 호출되는 콜백
 */
export const walk = (
  nodes: Record<string, AppNode>,
  rootIds: string[],
  visit: (node: AppNode) => void,
): void => {
  const visitOne = (id: string): void => {
    const node = nodes[id]
    if (!node) return
    visit(node)
    for (const childId of node.childIds) visitOne(childId)
  }
  for (const id of rootIds) visitOne(id)
}

/**
 * 부모의 childIds(또는 페이지 rootIds)를 immutable하게 갱신한 새 상태를 반환한다.
 * 내부 헬퍼이며 상위 함수(addNode/removeNode/moveNode)에서 사용한다.
 * @param state 현재 트리 상태
 * @param parentId 갱신 대상 부모 id 또는 null(페이지 루트)
 * @param updater childIds(또는 rootIds)를 변환하는 함수
 * @returns 새 트리 상태
 */
const updateChildIds = (
  state: TreeState,
  parentId: string | null,
  updater: (ids: string[]) => string[],
): TreeState => {
  if (parentId === null) {
    return { nodes: state.nodes, rootIds: updater(state.rootIds) }
  }
  const parent = state.nodes[parentId]
  if (!parent) return state
  const nextParent = { ...parent, childIds: updater(parent.childIds) } as AppNode
  return {
    nodes: { ...state.nodes, [parentId]: nextParent },
    rootIds: state.rootIds,
  }
}

/**
 * 노드를 추가한다. parentId에 따라 페이지 루트 또는 Frame.childIds 끝에 append.
 * 추가되는 노드의 `parentId`는 인자값으로 강제 설정되어 정합성이 보장된다.
 * 부모가 존재하지 않으면 nodes에는 등록되지만 트리 참조에는 추가되지 않는다.
 * @param nodes 현재 노드 저장소
 * @param rootIds 현재 페이지 루트 id 배열
 * @param node 추가할 노드
 * @param parentId 부모 id 또는 null(페이지 직속)
 * @returns 새 트리 상태
 */
export const addNode = (
  nodes: Record<string, AppNode>,
  rootIds: string[],
  node: AppNode,
  parentId: string | null,
): TreeState => {
  const next = { ...node, parentId } as AppNode
  const base: TreeState = {
    nodes: { ...nodes, [next.id]: next },
    rootIds,
  }
  return updateChildIds(base, parentId, (ids) => [...ids, next.id])
}

/**
 * 자기 자신과 모든 후손 id를 깊이 우선으로 수집한다.
 * @param nodes 노드 저장소
 * @param id 시작 id
 * @returns 자기+후손 id Set
 */
const collectDescendantIds = (
  nodes: Record<string, AppNode>,
  id: string,
): Set<string> => {
  const acc = new Set<string>()
  const visit = (current: string): void => {
    const node = nodes[current]
    if (!node || acc.has(current)) return
    acc.add(current)
    for (const childId of node.childIds) visit(childId)
  }
  visit(id)
  return acc
}

/**
 * 노드와 모든 후손을 삭제한다. 부모의 childIds(또는 rootIds)에서도 참조 제거.
 * 존재하지 않는 id이면 입력 그대로 반환한다.
 * @param nodes 현재 노드 저장소
 * @param rootIds 현재 페이지 루트 id 배열
 * @param id 삭제할 노드 id
 * @returns 새 트리 상태
 */
export const removeNode = (
  nodes: Record<string, AppNode>,
  rootIds: string[],
  id: string,
): TreeState => {
  const target = nodes[id]
  if (!target) return { nodes, rootIds }

  const toRemove = collectDescendantIds(nodes, id)
  const nextNodes: Record<string, AppNode> = {}
  for (const [key, value] of Object.entries(nodes)) {
    if (!toRemove.has(key)) nextNodes[key] = value
  }

  return updateChildIds(
    { nodes: nextNodes, rootIds },
    target.parentId,
    (ids) => ids.filter((cid) => cid !== id),
  )
}

/**
 * 노드를 다른 부모로 이동한다. 기존 부모에서 제거 후 새 부모 끝에 append.
 * 같은 부모로 이동하거나 존재하지 않는 id이면 입력 그대로 반환한다.
 * @param nodes 현재 노드 저장소
 * @param rootIds 현재 페이지 루트 id 배열
 * @param id 이동할 노드 id
 * @param newParentId 새 부모 id 또는 null(페이지 루트)
 * @returns 새 트리 상태
 */
export const moveNode = (
  nodes: Record<string, AppNode>,
  rootIds: string[],
  id: string,
  newParentId: string | null,
): TreeState => {
  const target = nodes[id]
  if (!target) return { nodes, rootIds }
  if (target.parentId === newParentId) return { nodes, rootIds }

  const detached = updateChildIds(
    { nodes, rootIds },
    target.parentId,
    (ids) => ids.filter((cid) => cid !== id),
  )
  const moved = { ...target, parentId: newParentId } as AppNode
  const withMoved: TreeState = {
    nodes: { ...detached.nodes, [id]: moved },
    rootIds: detached.rootIds,
  }
  return updateChildIds(withMoved, newParentId, (ids) => [...ids, id])
}

/**
 * 서브트리 복제 결과.
 */
export interface CloneSubtreeResult {
  /** 복제된 모든 노드(원본 노드는 미포함) */
  added: Record<string, AppNode>
  /** 복제 결과의 새 루트 노드 id */
  newRootId: string
}

/**
 * 노드와 모든 후손을 새 id로 깊은 복제한다.
 * 복제된 루트 노드의 `parentId`는 원본과 동일하게 유지된다(이후 호출자가 트리에 삽입).
 * @param nodes 노드 저장소
 * @param id 복제할 루트 노드 id
 * @returns 새로 만들어진 노드 맵과 새 루트 id. 원본 id가 없으면 빈 결과.
 */
export const cloneSubtree = (
  nodes: Record<string, AppNode>,
  id: string,
): CloneSubtreeResult | null => {
  const root = nodes[id]
  if (!root) return null

  const idMap = new Map<string, string>()
  const added: Record<string, AppNode> = {}

  const cloneOne = (originalId: string, newParentId: string | null): string => {
    const original = nodes[originalId]
    if (!original) return ''
    const newId = nanoid()
    idMap.set(originalId, newId)
    const newChildIds = original.childIds.map((cid) => cloneOne(cid, newId)).filter(Boolean)
    const cloned = {
      ...original,
      id: newId,
      parentId: newParentId,
      childIds: newChildIds,
    } as AppNode
    added[newId] = cloned
    return newId
  }

  const newRootId = cloneOne(id, root.parentId)
  return { added, newRootId }
}
