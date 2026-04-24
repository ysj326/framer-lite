import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * ConfirmDialog의 버튼 한 개를 나타낸다.
 * `id`는 사용자가 해당 버튼을 눌렀을 때 Promise가 resolve 되는 값이다.
 */
export interface ConfirmAction {
  /** 선택 결과로 반환되는 값 */
  id: string
  /** 버튼에 표시할 텍스트 */
  label: string
  /** 버튼 강조 스타일 (기본 'default') */
  variant?: 'primary' | 'danger' | 'default'
}

/**
 * `confirm()` 호출 시 전달할 옵션.
 */
export interface ConfirmOptions {
  /** 모달 제목 */
  title: string
  /** 설명 본문 */
  message: string
  /** 표시할 버튼 목록 (왼→오 순서) */
  actions: ConfirmAction[]
}

/**
 * 전역 Confirm 모달 상태와 resolver를 관리한다.
 *
 * 사용 패턴:
 * ```ts
 * const confirm = useConfirmStore()
 * const result = await confirm.confirm({ title, message, actions })
 * // result: 선택된 action.id | null (취소)
 * ```
 *
 * `ConfirmDialog.vue`(앱에 1회 마운트)가 이 store의 visible/title/message/actions를
 * 읽어 렌더링하고, 버튼 클릭 / ESC / backdrop 시 `resolveAction(id | null)`을 호출한다.
 */
export const useConfirmStore = defineStore('confirm', () => {
  const visible = ref(false)
  const title = ref('')
  const message = ref('')
  const actions = ref<ConfirmAction[]>([])

  /**
   * 대기 중인 Promise resolver. setup closure에 보관되므로 외부에서 접근 불가.
   * 새 confirm 호출이나 resolveAction에서 소비된다.
   */
  let pending: ((id: string | null) => void) | null = null

  /**
   * 모달을 열고 선택 결과를 반환하는 Promise를 돌려준다.
   * 이미 열려있는 dialog가 있으면 해당 Promise는 즉시 `null`로 resolve되고
   * 새 옵션으로 교체된다 (race condition 방지).
   *
   * @returns 선택된 action.id, 또는 취소(null)
   */
  const confirm = (options: ConfirmOptions): Promise<string | null> => {
    if (pending) {
      pending(null)
      pending = null
    }
    title.value = options.title
    message.value = options.message
    actions.value = options.actions
    visible.value = true
    return new Promise<string | null>((resolve) => {
      pending = resolve
    })
  }

  /**
   * 대기 중인 Promise를 해당 id로 resolve하고 모달을 닫는다.
   * `null` 전달 시 취소로 간주.
   */
  const resolveAction = (id: string | null): void => {
    visible.value = false
    if (pending) {
      pending(id)
      pending = null
    }
  }

  return {
    visible,
    title,
    message,
    actions,
    confirm,
    resolveAction,
  }
})
