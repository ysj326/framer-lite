import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import { cloneDeep } from 'lodash-es'
import type { AppNode } from '@/types/node'
import type { Page, Project } from '@/types/project'
import * as tree from '@/utils/nodeTree'
import { useHistoryStore, type EditorSnapshot } from './history'
import { CURRENT_VERSION } from '@/utils/serialize'

/**
 * 빈 프로젝트의 기본 페이지를 만든다.
 * 모든 신규 프로젝트와 `reset()` 호출 시 사용된다.
 * @returns 새 Page 객체
 */
const createDefaultPage = (): Page => ({
  id: nanoid(),
  name: 'Page 1',
  width: 1280,
  height: 800,
  background: '#ffffff',
  rootIds: [],
})

/**
 * 비주얼 에디터의 단일 진실 공급원(SSOT) 스토어.
 * - state: 평면 노드 맵, 단일 페이지 메타, 선택 id
 * - actions는 immutable 갱신을 통해 history(Phase 2)와 잘 맞물린다.
 */
export const useEditorStore = defineStore('editor', () => {
  const nodes = ref<Record<string, AppNode>>({})
  const page = ref<Page>(createDefaultPage())
  const selectedId = ref<string | null>(null)

  /**
   * 현재 인플레이스 편집 중인 노드 id.
   * 편집 중에는 MoveableWrapper 선택 핸들을 숨기고, 단축키(Delete/Backspace 등)도
   * `isEditableTarget` 검사에 의해 무시되어야 한다.
   * 한 번에 한 노드만 편집 가능.
   */
  const editingId = ref<string | null>(null)

  const history = useHistoryStore()

  /** 현재 선택된 노드 (없으면 null) */
  const selectedNode = computed<AppNode | null>(() => {
    const id = selectedId.value
    if (id === null) return null
    return nodes.value[id] ?? null
  })

  /** 페이지 루트(rootIds 순서)에 해당하는 노드 배열 */
  const rootNodes = computed<AppNode[]>(() =>
    tree.getChildren(nodes.value, null, page.value.rootIds),
  )

  /** undo 가능 여부 (history 위임) */
  const canUndo = computed<boolean>(() => history.canUndo)
  /** redo 가능 여부 (history 위임) */
  const canRedo = computed<boolean>(() => history.canRedo)

  /**
   * 현재 편집 데이터 스냅샷을 만든다 (history commit/undo/redo 용).
   * @returns 스냅샷 (cloneDeep은 history.commit이 수행)
   */
  const snapshot = (): EditorSnapshot => ({
    nodes: nodes.value,
    page: page.value,
  })

  /**
   * undo/redo로 받은 스냅샷을 에디터에 적용한다.
   * 스냅샷에 없는 selectedId는 노드 부재 시에만 해제한다.
   * @param snap 적용할 스냅샷
   */
  const applySnapshot = (snap: EditorSnapshot): void => {
    nodes.value = cloneDeep(snap.nodes)
    page.value = cloneDeep(snap.page)
    if (selectedId.value !== null && !nodes.value[selectedId.value]) {
      selectedId.value = null
    }
  }

  /**
   * 선택 상태를 바꾼다. 편집 중인 노드가 있으면 같이 종료한다
   * (다른 노드를 선택했거나 선택을 해제한 경우).
   * @param id 선택할 노드 id 또는 null(해제)
   */
  const select = (id: string | null): void => {
    if (editingId.value !== null && editingId.value !== id) {
      editingId.value = null
    }
    selectedId.value = id
  }

  /**
   * 지정한 노드를 인플레이스 편집 모드로 전환한다.
   * - 존재하지 않는 노드이거나 locked된 노드는 진입하지 않는다(no-op).
   * - 편집 모드에서는 선택도 같이 맞춰준다(UX 일관성).
   *
   * @param id 편집할 노드 id
   */
  const startEdit = (id: string): void => {
    const node = nodes.value[id]
    if (!node) return
    if (node.locked) return
    selectedId.value = id
    editingId.value = id
  }

  /**
   * 인플레이스 편집을 종료한다.
   */
  const endEdit = (): void => {
    editingId.value = null
  }

  /**
   * 노드를 추가한다.
   * @param node 추가할 노드 (id는 호출자가 nanoid로 발급된 상태여야 한다)
   * @param parentId 부모 id 또는 null(페이지 직속)
   */
  const addNode = (node: AppNode, parentId: string | null): void => {
    history.commit(snapshot())
    const next = tree.addNode(nodes.value, page.value.rootIds, node, parentId)
    nodes.value = next.nodes
    page.value = { ...page.value, rootIds: next.rootIds }
  }

  /**
   * 노드의 일부 필드를 갱신한다(부분 패치).
   * 존재하지 않는 id면 무시한다.
   * @param id 대상 노드 id
   * @param patch 덮어쓸 필드들
   */
  const updateNode = (id: string, patch: Partial<AppNode>): void => {
    const current = nodes.value[id]
    if (!current) return
    history.commit(snapshot(), `update-${id}`)
    nodes.value = { ...nodes.value, [id]: { ...current, ...patch } as AppNode }
  }

  /**
   * 노드와 모든 후손을 삭제한다.
   * 선택된 노드가 사라지면 선택을 해제한다.
   * @param id 삭제할 노드 id
   */
  const deleteNode = (id: string): void => {
    if (!nodes.value[id]) return
    history.commit(snapshot())
    const next = tree.removeNode(nodes.value, page.value.rootIds, id)
    nodes.value = next.nodes
    page.value = { ...page.value, rootIds: next.rootIds }
    if (selectedId.value !== null && !nodes.value[selectedId.value]) {
      selectedId.value = null
    }
    if (editingId.value !== null && !nodes.value[editingId.value]) {
      editingId.value = null
    }
  }

  /**
   * 노드를 깊은 복제한다(Frame이면 후손까지). 새 루트는 원본 바로 다음 위치에 삽입.
   * @param id 복제할 노드 id
   * @returns 복제된 새 루트 id (원본이 없으면 null)
   */
  const duplicateNode = (id: string): string | null => {
    const original = nodes.value[id]
    if (!original) return null
    const result = tree.cloneSubtree(nodes.value, id)
    if (!result) return null

    history.commit(snapshot())
    const merged = { ...nodes.value, ...result.added }
    const newId = result.newRootId

    if (original.parentId === null) {
      const idx = page.value.rootIds.indexOf(id)
      const newRoot = [...page.value.rootIds]
      newRoot.splice(idx + 1, 0, newId)
      nodes.value = merged
      page.value = { ...page.value, rootIds: newRoot }
    } else {
      const parent = merged[original.parentId]
      if (!parent) return null
      const idx = parent.childIds.indexOf(id)
      const newChildIds = [...parent.childIds]
      newChildIds.splice(idx + 1, 0, newId)
      nodes.value = {
        ...merged,
        [original.parentId]: { ...parent, childIds: newChildIds } as AppNode,
      }
    }
    return newId
  }

  /**
   * 노드의 부모를 변경한다.
   * @param id 이동할 노드 id
   * @param newParentId 새 부모 id 또는 null(페이지 루트)
   */
  const moveNode = (id: string, newParentId: string | null): void => {
    const target = nodes.value[id]
    if (!target || target.parentId === newParentId) return
    history.commit(snapshot())
    const next = tree.moveNode(nodes.value, page.value.rootIds, id, newParentId)
    nodes.value = next.nodes
    page.value = { ...page.value, rootIds: next.rootIds }
  }

  /**
   * z-order 보조값(zIndex)을 갱신한다.
   * 동일 부모 내 정렬은 배열 순서가 우선이며, 본 값은 보조 캐시이다.
   * @param id 대상 노드 id
   * @param zIndex 새 z 값
   */
  const setZIndex = (id: string, zIndex: number): void => {
    updateNode(id, { zIndex })
  }

  /**
   * 같은 부모 안에서 노드 순서를 swap 방식으로 한 칸 이동한다.
   * 배열 순서가 z-order의 진실이므로 인덱스 변경이 곧 z 변경이다.
   * 경계(맨 앞·맨 뒤)를 벗어나면 no-op.
   * @param id 이동할 노드 id
   * @param delta +1 = 한 단계 뒤(인덱스 증가), -1 = 한 단계 앞(인덱스 감소)
   */
  const reorder = (id: string, delta: number): void => {
    const node = nodes.value[id]
    if (!node) return
    const isRoot = node.parentId === null
    const siblings = isRoot
      ? page.value.rootIds
      : (nodes.value[node.parentId!]?.childIds ?? [])
    const idx = siblings.indexOf(id)
    if (idx === -1) return
    const newIdx = idx + delta
    if (newIdx < 0 || newIdx >= siblings.length) return

    history.commit(snapshot())
    const next = [...siblings]
    const tmp = next[idx]!
    next[idx] = next[newIdx]!
    next[newIdx] = tmp

    if (isRoot) {
      page.value = { ...page.value, rootIds: next }
    } else {
      const parentId = node.parentId!
      const parent = nodes.value[parentId]!
      nodes.value = {
        ...nodes.value,
        [parentId]: { ...parent, childIds: next } as AppNode,
      }
    }
  }

  /**
   * 외부 Project 스냅샷을 통째로 로드한다.
   * 기존 상태는 모두 덮어써지고 선택은 해제된다.
   * @param project 로드할 프로젝트
   */
  const loadProject = (project: Project): void => {
    nodes.value = project.nodes
    page.value = project.page
    selectedId.value = null
    editingId.value = null
    history.clear()
  }

  /**
   * 빈 초기 상태로 되돌린다.
   */
  const reset = (): void => {
    nodes.value = {}
    page.value = createDefaultPage()
    selectedId.value = null
    editingId.value = null
    history.clear()
  }

  /**
   * 현재 editor 상태를 직렬화 가능한 Project 객체로 만든다.
   * Save/Export/AutoSave 모두 이 메서드를 사용한다.
   * @returns 현재 시각의 Project 스냅샷
   */
  const buildProject = (): Project => ({
    version: CURRENT_VERSION,
    name: page.value.name,
    page: page.value,
    nodes: nodes.value,
    updatedAt: Date.now(),
  })

  /**
   * 직전 변경을 되돌린다.
   */
  const undo = (): void => {
    const restored = history.undo(snapshot())
    if (restored) applySnapshot(restored)
  }

  /**
   * 직전에 되돌린 변경을 다시 적용한다.
   */
  const redo = (): void => {
    const restored = history.redo(snapshot())
    if (restored) applySnapshot(restored)
  }

  return {
    nodes,
    page,
    selectedId,
    editingId,
    selectedNode,
    rootNodes,
    canUndo,
    canRedo,
    select,
    startEdit,
    endEdit,
    addNode,
    updateNode,
    deleteNode,
    duplicateNode,
    moveNode,
    setZIndex,
    reorder,
    loadProject,
    reset,
    undo,
    redo,
    buildProject,
  }
})
