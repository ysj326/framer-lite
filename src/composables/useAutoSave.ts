import { watch } from 'vue'
import { debounce } from 'lodash-es'
import { useEditorStore } from '@/stores/editor'
import { toJSON, fromJSON } from '@/utils/serialize'

/** 기본 localStorage 키 */
const DEFAULT_KEY = 'framer-lite:project'
/** 기본 debounce(ms) — 사용자가 키 입력을 잠시 멈추는 시점에 저장 */
const DEFAULT_DEBOUNCE_MS = 1000

/**
 * useAutoSave 옵션.
 */
export interface AutoSaveOptions {
  /** localStorage 키 (기본 'framer-lite:project') */
  storageKey?: string
  /** 저장 debounce(ms) (기본 1000) */
  debounceMs?: number
}

/**
 * 에디터 상태를 localStorage에 자동 저장하고, 부팅 시 복구를 제공한다.
 * 반드시 setup 컨텍스트(컴포넌트 setup 또는 effectScope) 안에서 호출해야 한다.
 *
 * 자동 저장:
 * - editor.nodes / editor.page 변경을 deep watch
 * - debounce(default 1s) 후 localStorage에 직렬화 저장
 *
 * 부팅 복구:
 * - `restore()` 호출 시 localStorage에서 읽어 editor.loadProject 적용
 *
 * @param options 동작 옵션
 * @returns `restore`(부팅 복구), `saveNow`(즉시 저장), `clear`(저장본 삭제)
 */
export const useAutoSave = (options: AutoSaveOptions = {}) => {
  const editor = useEditorStore()
  const storageKey = options.storageKey ?? DEFAULT_KEY
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS

  /**
   * 즉시 localStorage에 저장한다.
   * 용량 초과 등 실패는 조용히 무시(UI 토스트는 호출자 책임).
   */
  const saveNow = (): void => {
    try {
      localStorage.setItem(storageKey, toJSON(editor.buildProject()))
    } catch {
      /* QuotaExceeded 등 — 무시 */
    }
  }

  /** debounce된 저장 — watch 콜백에서 사용 */
  const debouncedSave = debounce(saveNow, debounceMs)

  /**
   * localStorage에 저장된 프로젝트를 editor에 로드한다.
   * @returns 복구 성공 여부 (저장본 없거나 잘못된 형식이면 false)
   */
  const restore = (): boolean => {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return false
    const project = fromJSON(raw)
    if (!project) return false
    editor.loadProject(project)
    return true
  }

  /**
   * 저장된 프로젝트를 localStorage에서 삭제한다.
   */
  const clear = (): void => {
    localStorage.removeItem(storageKey)
  }

  watch(
    () => ({ nodes: editor.nodes, page: editor.page }),
    () => debouncedSave(),
    { deep: true },
  )

  return { restore, saveNow, clear }
}
