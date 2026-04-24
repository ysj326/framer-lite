import { watch } from 'vue'
import { debounce } from 'lodash-es'
import { useEditorStore } from '@/stores/editor'
import { useSlotsStore, SLOT_BODY_KEY_PREFIX } from '@/stores/slots'
import { toJSON, fromJSON } from '@/utils/serialize'

/**
 * 단일 슬롯만 있던 구버전의 localStorage 키 — 부팅 시 한 번 마이그레이션된다.
 * 본문 키 접두사는 slots store의 `SLOT_BODY_KEY_PREFIX`를 그대로 사용한다
 * (slots가 removeSlot에서 본문을 연쇄 삭제하므로 접두사는 단일 source-of-truth).
 */
const DEFAULT_LEGACY_KEY = 'framer-lite:project'
/** 기본 debounce(ms) — 사용자가 입력을 잠시 멈추는 시점에 저장 */
const DEFAULT_DEBOUNCE_MS = 1000

/**
 * useAutoSave 옵션.
 * 프로덕션에서는 기본값을 사용하고, 테스트에서만 키 충돌 방지를 위해 override한다.
 */
export interface AutoSaveOptions {
  /** 슬롯 본문 키 접두사 (기본 `'framer-lite:slot:'`) */
  keyPrefix?: string
  /** 구버전 단일 키 (기본 `'framer-lite:project'`) — 마이그레이션 대상 */
  legacyKey?: string
  /** 저장 debounce(ms) (기본 1000) */
  debounceMs?: number
}

/**
 * `migrateLegacy` 결과.
 */
export interface MigrationResult {
  /** 실제로 이전이 일어났는지 */
  migrated: boolean
  /** 이전 후 새로 만들어진 슬롯 id (migrated=false면 null) */
  slotId: string | null
}

/**
 * 활성 슬롯 기준으로 에디터 상태를 localStorage에 자동 저장하고,
 * 부팅 시 복구/마이그레이션을 제공한다.
 *
 * 반드시 setup 컨텍스트(컴포넌트 setup 또는 effectScope) 안에서 호출해야 한다.
 *
 * 동작 요약:
 * - 활성 슬롯이 있을 때만 저장/복구 (없으면 no-op)
 * - editor.nodes / editor.page 변경을 deep watch → debounce 후 `prefix + activeId`에 저장
 * - 저장 시 slots.touchActive로 updatedAt도 갱신 → 목록 정렬에 반영
 *
 * @param options 동작 옵션
 * @returns `restore` / `saveNow` / `clear` / `migrateLegacy`
 */
export const useAutoSave = (options: AutoSaveOptions = {}) => {
  const editor = useEditorStore()
  const slots = useSlotsStore()
  const keyPrefix = options.keyPrefix ?? SLOT_BODY_KEY_PREFIX
  const legacyKey = options.legacyKey ?? DEFAULT_LEGACY_KEY
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS

  /**
   * 현재 활성 슬롯의 본문 키를 반환한다. 활성 슬롯 없으면 null.
   */
  const activeKey = (): string | null =>
    slots.activeId ? keyPrefix + slots.activeId : null

  /**
   * 활성 슬롯에 현재 editor 상태를 즉시 저장한다.
   * 활성 슬롯이 없으면 no-op.
   * 용량 초과 등 실패는 조용히 무시 (UI 토스트는 호출자 책임).
   */
  const saveNow = (): void => {
    const key = activeKey()
    if (!key) return
    try {
      localStorage.setItem(key, toJSON(editor.buildProject()))
      slots.touchActive()
    } catch {
      /* QuotaExceeded 등 — 무시 */
    }
  }

  /** debounce된 저장 — watch 콜백에서 사용 */
  const debouncedSave = debounce(saveNow, debounceMs)

  /**
   * 활성 슬롯의 본문을 editor에 로드한다.
   * @returns 복구 성공 여부 (활성 슬롯 없거나 본문 없거나 손상 시 false)
   */
  const restore = (): boolean => {
    const key = activeKey()
    if (!key) return false
    const raw = localStorage.getItem(key)
    if (!raw) return false
    const project = fromJSON(raw)
    if (!project) return false
    editor.loadProject(project)
    return true
  }

  /**
   * 활성 슬롯의 본문을 localStorage에서 삭제한다. slot meta는 유지.
   * 활성 슬롯 없으면 no-op.
   */
  const clear = (): void => {
    const key = activeKey()
    if (!key) return
    localStorage.removeItem(key)
  }

  /**
   * 구버전 단일 키(`legacyKey`)에 저장된 프로젝트가 있으면
   * 새 슬롯 1개로 이전하고 legacy 키를 삭제한다.
   *
   * 이전 조건 (모두 충족해야 함):
   * 1. `legacyKey`에 값이 있고
   * 2. 파싱 가능한 Project JSON이고
   * 3. 슬롯 인덱스가 비어있음 (이미 마이그레이션된 경우는 건드리지 않음)
   *
   * @returns 이전 결과 (migrated, slotId)
   */
  const migrateLegacy = (): MigrationResult => {
    if (slots.slots.length > 0) {
      return { migrated: false, slotId: null }
    }
    const raw = localStorage.getItem(legacyKey)
    if (!raw) {
      return { migrated: false, slotId: null }
    }
    const project = fromJSON(raw)
    if (!project) {
      return { migrated: false, slotId: null }
    }
    const slot = slots.createSlot(project.name || '내 작업')
    localStorage.setItem(keyPrefix + slot.id, raw)
    localStorage.removeItem(legacyKey)
    return { migrated: true, slotId: slot.id }
  }

  watch(
    () => ({ nodes: editor.nodes, page: editor.page }),
    () => debouncedSave(),
    { deep: true },
  )

  return { restore, saveNow, clear, migrateLegacy }
}
