import { ref, computed, watch, nextTick, type ComputedRef, type Ref } from 'vue'
import { useEditorStore } from '@/stores/editor'

/**
 * useInlineEdit 옵션.
 */
export interface InlineEditOptions {
  /**
   * 편집 대상 노드 id. props 참조를 감싸 reactive하게 읽기 위해 함수 형태.
   */
  nodeId: () => string
  /**
   * 현재 값을 store에서 읽어오는 함수. 편집 진입 시 스냅샷되어 cancel 시 복구된다.
   */
  getValue: () => string
  /**
   * 확정된 값을 store에 기록하는 함수. commit 시에만 호출된다.
   */
  setValue: (value: string) => void
  /**
   * true면 Enter가 줄바꿈(개행)으로 작동하고 Cmd/Ctrl+Enter가 commit.
   * false면 Enter가 즉시 commit. 기본 false.
   */
  multiline?: boolean
}

/**
 * useInlineEdit이 반환하는 API.
 */
export interface InlineEditApi {
  /** contenteditable 엘리먼트에 바인딩할 ref */
  editRef: Ref<HTMLElement | null>
  /** 해당 노드가 현재 편집 중인지 (editor.editingId === nodeId) */
  isEditing: ComputedRef<boolean>
  /** 편집 확정: 현재 DOM 값을 setValue로 기록하고 편집 종료 */
  commit: () => void
  /** 편집 취소: 진입 시점 값으로 복구하고 편집 종료 */
  cancel: () => void
  /** contenteditable 요소의 keydown에 바인딩 */
  onKeydown: (event: KeyboardEvent) => void
  /** contenteditable 요소의 blur에 바인딩 — 편집 중이면 commit */
  onBlur: () => void
}

/**
 * Text/Button 등 인라인 편집 가능한 노드를 위한 공통 composable.
 *
 * 동작:
 * - editor.editingId === options.nodeId() 인 동안 `isEditing`이 true
 * - 편집 진입 순간 현재 값을 스냅샷 저장 → cancel에서 복구
 * - 진입 직후 editRef에 focus + 전체 선택
 * - Escape: cancel, blur: commit, Enter: multiline 여부에 따라 분기
 *
 * 컴포넌트는 editRef/onKeydown/onBlur를 contenteditable 엘리먼트에 바인딩하고,
 * setValue가 실제 store patch(예: updateNode)를 수행하도록 주입한다.
 */
export const useInlineEdit = (options: InlineEditOptions): InlineEditApi => {
  const editor = useEditorStore()
  const editRef = ref<HTMLElement | null>(null)
  const originalValue = ref<string>('')
  const multiline = options.multiline ?? false

  const isEditing = computed<boolean>(
    () => editor.editingId === options.nodeId(),
  )

  /** 편집 진입/종료 감지 — 진입 시 스냅샷·focus, 종료 시 DOM 값 정리 없음 */
  watch(isEditing, async (now) => {
    if (!now) return
    originalValue.value = options.getValue()
    await nextTick()
    const el = editRef.value
    if (!el) return
    el.focus()
    // 전체 선택
    try {
      const range = document.createRange()
      range.selectNodeContents(el)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    } catch {
      /* 일부 환경에서 Selection API 미지원 — 무시 */
    }
  })

  /** 현재 DOM 값을 읽어 setValue로 저장하고 편집 종료 */
  const commit = (): void => {
    const el = editRef.value
    const value = el ? el.innerText : originalValue.value
    options.setValue(value)
    editor.endEdit()
  }

  /**
   * 편집 취소: 진입 시점 값으로 DOM만 되돌리고 편집 종료.
   * store는 commit에서만 갱신되므로 cancel에서는 setValue를 호출하지 않는다.
   */
  const cancel = (): void => {
    const el = editRef.value
    if (el) el.innerText = originalValue.value
    editor.endEdit()
  }

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
      return
    }
    if (event.key === 'Enter') {
      // multiline=true면 Cmd/Ctrl+Enter만 commit, 그 외엔 기본(개행) 허용
      // multiline=false면 Enter가 바로 commit (줄바꿈 차단)
      if (!multiline || event.metaKey || event.ctrlKey) {
        event.preventDefault()
        commit()
      }
    }
  }

  const onBlur = (): void => {
    if (isEditing.value) commit()
  }

  return { editRef, isEditing, commit, cancel, onKeydown, onBlur }
}
