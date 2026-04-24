import { onScopeDispose } from 'vue'
import { useEditorStore } from '@/stores/editor'

/**
 * 이벤트 타깃이 텍스트 입력 가능한 요소인지 판정한다.
 * input/textarea/contentEditable 요소에서는 전역 단축키를 무시해야 한다.
 * Canvas 뷰포트(useCanvasViewport) 등 다른 모듈에서도 재사용한다.
 * @param target KeyboardEvent의 target
 * @returns 입력 요소면 true
 */
export const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

/** Arrow 키 1회당 기본 이동량(px) */
const NUDGE_STEP = 1
/** Shift+Arrow 키 1회당 이동량(px) */
const NUDGE_STEP_LARGE = 10

/**
 * 에디터 전역 키보드 단축키를 등록한다.
 * setup 컨텍스트(컴포넌트 setup 또는 effectScope) 안에서 호출해야 한다.
 *
 * 지원 단축키:
 * - Delete / Backspace         : 선택 노드 삭제
 * - Cmd/Ctrl + Z               : Undo
 * - Shift + Cmd/Ctrl + Z       : Redo
 * - Cmd/Ctrl + D               : 선택 노드 복제 (새 노드 자동 선택)
 * - Arrow Left/Right/Up/Down   : 선택 노드 1px 이동 (Shift 동시 시 10px)
 * - Cmd/Ctrl + ]               : 선택 노드 한 단계 위로 (z+1)
 * - Cmd/Ctrl + [               : 선택 노드 한 단계 아래로 (z-1)
 * - Cmd/Ctrl + Shift + ]       : 선택 노드 맨 위로 (bringToFront)
 * - Cmd/Ctrl + Shift + [       : 선택 노드 맨 아래로 (bringToBack)
 *
 * `Cmd`(metaKey)와 `Ctrl`(ctrlKey) 모두 허용해 macOS/Windows 양쪽에서 동일하게 동작한다.
 * 입력 요소(input/textarea/contentEditable) 포커스 중에는 모든 단축키 무시.
 */
export const useShortcuts = (): void => {
  const editor = useEditorStore()

  /**
   * 선택 노드를 dx/dy만큼 이동시킨다. 선택이 없으면 no-op.
   * updateNode가 `update-${id}` 키로 coalesce하므로 연속된 Arrow 키는
   * 500ms 윈도우 안에서 단일 undo 단위로 묶인다.
   */
  const nudge = (dx: number, dy: number): void => {
    const id = editor.selectedId
    if (!id) return
    const node = editor.nodes[id]
    if (!node) return
    editor.updateNode(id, { x: node.x + dx, y: node.y + dy })
  }

  /**
   * keydown 이벤트 핸들러.
   * 매칭된 단축키는 preventDefault 처리한다.
   */
  const handler = (event: KeyboardEvent): void => {
    if (isEditableTarget(event.target)) return

    const cmd = event.metaKey || event.ctrlKey
    const key = event.key.toLowerCase()

    if (cmd && key === 'z') {
      event.preventDefault()
      if (event.shiftKey) editor.redo()
      else editor.undo()
      return
    }

    if (cmd && key === 'd') {
      event.preventDefault()
      if (!editor.selectedId) return
      const newId = editor.duplicateNode(editor.selectedId)
      if (newId) editor.select(newId)
      return
    }

    // z-order 단축키 (Cmd/Ctrl + [ 또는 ])
    if (cmd && (key === ']' || key === '[')) {
      if (!editor.selectedId) return
      event.preventDefault()
      if (key === ']') {
        if (event.shiftKey) editor.bringToFront(editor.selectedId)
        else editor.reorder(editor.selectedId, +1)
      } else {
        if (event.shiftKey) editor.bringToBack(editor.selectedId)
        else editor.reorder(editor.selectedId, -1)
      }
      return
    }

    // Arrow nudge — cmd 조합 없이만 작동
    if (!cmd) {
      const step = event.shiftKey ? NUDGE_STEP_LARGE : NUDGE_STEP
      switch (event.key) {
        case 'ArrowRight':
          if (!editor.selectedId) return
          event.preventDefault()
          nudge(step, 0)
          return
        case 'ArrowLeft':
          if (!editor.selectedId) return
          event.preventDefault()
          nudge(-step, 0)
          return
        case 'ArrowDown':
          if (!editor.selectedId) return
          event.preventDefault()
          nudge(0, step)
          return
        case 'ArrowUp':
          if (!editor.selectedId) return
          event.preventDefault()
          nudge(0, -step)
          return
      }
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (!editor.selectedId) return
      event.preventDefault()
      editor.deleteNode(editor.selectedId)
    }
  }

  window.addEventListener('keydown', handler)
  onScopeDispose(() => {
    window.removeEventListener('keydown', handler)
  })
}
