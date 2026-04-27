import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { cloneDeep } from 'lodash-es'
import type { AppNode } from '@/types/node'
import type { Page } from '@/types/project'
import type { Master } from '@/types/master'

/**
 * 에디터의 undo/redo 단위가 되는 상태 스냅샷.
 * `selectedId`는 데이터 변경의 일부가 아니므로 포함하지 않는다.
 * masters는 컴포넌트 심볼 정의(Phase 19a)로, undo/redo 대상이다.
 */
export interface EditorSnapshot {
  nodes: Record<string, AppNode>
  page: Page
  masters: Record<string, Master>
}

/**
 * 같은 coalesceKey 묶음으로 처리할 시간 윈도우(ms).
 * 이 시간 안에 들어온 같은 key의 commit은 history에 추가되지 않는다.
 */
const COALESCE_WINDOW_MS = 500

/**
 * Undo/Redo 스택을 관리하는 generic 스토어.
 * 호출자(주로 editor store)가 변경 직전 스냅샷을 `commit`하고,
 * `undo(currentSnapshot)`/`redo(currentSnapshot)`로 이전/다음 상태를 받아 적용한다.
 */
export const useHistoryStore = defineStore('history', () => {
  const past = ref<EditorSnapshot[]>([])
  const future = ref<EditorSnapshot[]>([])
  const lastKey = ref<string | null>(null)
  const lastAt = ref<number>(0)

  /** undo 가능 여부 */
  const canUndo = computed<boolean>(() => past.value.length > 0)
  /** redo 가능 여부 */
  const canRedo = computed<boolean>(() => future.value.length > 0)

  /**
   * 변경 직전 스냅샷을 history에 기록한다.
   * 같은 coalesceKey 호출이 시간 윈도우 안에 다시 오면 추가하지 않아,
   * 빠른 연쇄 변경(예: 텍스트 입력)이 하나의 undo 단위로 묶인다.
   * 새 commit 시 future 스택은 항상 비워진다.
   * @param snapshot 변경 직전 에디터 스냅샷
   * @param coalesceKey 같은 그룹 식별 키 (선택). 미지정 시 항상 push.
   */
  const commit = (snapshot: EditorSnapshot, coalesceKey?: string): void => {
    const now = Date.now()
    const isCoalesced =
      coalesceKey != null &&
      lastKey.value === coalesceKey &&
      now - lastAt.value < COALESCE_WINDOW_MS &&
      past.value.length > 0

    if (!isCoalesced) {
      past.value.push(cloneDeep(snapshot))
    }
    future.value = []
    lastKey.value = coalesceKey ?? null
    lastAt.value = now
  }

  /**
   * 가장 최근 변경을 되돌릴 스냅샷을 반환한다.
   * 호출자가 현재 상태(currentSnapshot)를 같이 넘기면 future 스택에 보존된다.
   * @param currentSnapshot 현재 에디터 스냅샷 (redo 대상)
   * @returns 적용해야 할 이전 스냅샷, 없으면 null
   */
  const undo = (currentSnapshot: EditorSnapshot): EditorSnapshot | null => {
    if (past.value.length === 0) return null
    const previous = past.value.pop()!
    future.value.push(cloneDeep(currentSnapshot))
    lastKey.value = null
    return previous
  }

  /**
   * 직전에 undo한 변경을 다시 적용할 스냅샷을 반환한다.
   * @param currentSnapshot 현재 에디터 스냅샷 (undo 대상)
   * @returns 적용해야 할 다음 스냅샷, 없으면 null
   */
  const redo = (currentSnapshot: EditorSnapshot): EditorSnapshot | null => {
    if (future.value.length === 0) return null
    const next = future.value.pop()!
    past.value.push(cloneDeep(currentSnapshot))
    lastKey.value = null
    return next
  }

  /**
   * 모든 history를 비운다 (예: 새 프로젝트 로드 직후).
   */
  const clear = (): void => {
    past.value = []
    future.value = []
    lastKey.value = null
    lastAt.value = 0
  }

  return {
    past,
    future,
    canUndo,
    canRedo,
    commit,
    undo,
    redo,
    clear,
  }
})
