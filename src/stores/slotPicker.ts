import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * SlotPickerDialog의 visibility와 대기중 Promise resolver를 관리한다.
 * Confirm 모달(`useConfirmStore`)과 동일한 Promise-기반 패턴을 따른다.
 *
 * 사용:
 * ```ts
 * const picker = useSlotPickerStore()
 * const chosen = await picker.open()     // slotId | null
 * ```
 *
 * 실제 슬롯 목록/삭제 로직은 `SlotPickerDialog.vue`가
 * `useSlotsStore`를 직접 참조해 수행하고, 선택된 id를 이 store로 넘긴다.
 */
export const useSlotPickerStore = defineStore('slotPicker', () => {
  const visible = ref(false)

  /**
   * 대기 중인 Promise resolver. setup closure에 보관.
   */
  let pending: ((id: string | null) => void) | null = null

  /**
   * 슬롯 선택 모달을 열고 선택 결과 Promise를 반환한다.
   * 이미 열려있으면 이전 Promise는 null로 즉시 resolve된다.
   */
  const open = (): Promise<string | null> => {
    if (pending) {
      pending(null)
      pending = null
    }
    visible.value = true
    return new Promise<string | null>((resolve) => {
      pending = resolve
    })
  }

  /**
   * 슬롯이 선택되었을 때 호출한다. Promise가 해당 id로 resolve되고 모달이 닫힌다.
   */
  const pick = (id: string): void => {
    visible.value = false
    if (pending) {
      pending(id)
      pending = null
    }
  }

  /**
   * 사용자가 선택 없이 닫았을 때 (ESC / backdrop / 닫기 버튼).
   */
  const close = (): void => {
    visible.value = false
    if (pending) {
      pending(null)
      pending = null
    }
  }

  return {
    visible,
    open,
    pick,
    close,
  }
})
