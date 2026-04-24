<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlotsStore, type SlotMeta } from '@/stores/slots'
import { useSlotPickerStore } from '@/stores/slotPicker'
import { useConfirmStore } from '@/stores/confirm'

/**
 * 다중 슬롯 선택/관리 모달.
 * App.vue에 1회 마운트되어 `useSlotPickerStore().open()`으로 어디서든 띄울 수 있다.
 *
 * 행 동작:
 * - 전체 클릭 → picker.pick(id) (선택 → 호출자가 selectSlot 처리)
 * - 우측 휴지통 → ConfirmDialog 경유 후 slots.removeSlot (본문 키까지 연쇄 삭제됨)
 *
 * 닫기: backdrop / ESC / 닫기 버튼 → picker.close (null resolve)
 */
const picker = useSlotPickerStore()
const slots = useSlotsStore()
const confirm = useConfirmStore()
const { visible } = storeToRefs(picker)

/** updatedAt 내림차순 (최근 수정이 위) */
const sortedSlots = computed<SlotMeta[]>(() =>
  [...slots.slots].sort((a, b) => b.updatedAt - a.updatedAt),
)

/**
 * updatedAt을 사람이 읽기 좋은 형태로 포맷.
 * 실시간 상대 시간까지는 MVP 범위 밖이므로 고정 로케일 포맷을 쓴다.
 */
const formatTime = (ms: number): string => {
  const d = new Date(ms)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
    d.getDate(),
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`
}

/** 행 전체 클릭 → 선택 */
const onPick = (slot: SlotMeta): void => {
  picker.pick(slot.id)
}

/**
 * 휴지통 버튼 클릭 → Confirm 모달로 한 번 더 확인 후 제거.
 * 행 클릭(선택)과 구분되도록 이벤트 전파를 막는다.
 */
const onDelete = async (slot: SlotMeta, event: MouseEvent): Promise<void> => {
  event.stopPropagation()
  const result = await confirm.confirm({
    title: '작업 삭제',
    message: `"${slot.name}"을(를) 삭제할까요?\n이 작업은 되돌릴 수 없습니다.`,
    actions: [
      { id: 'cancel', label: '취소' },
      { id: 'delete', label: '삭제', variant: 'danger' },
    ],
  })
  if (result === 'delete') {
    slots.removeSlot(slot.id)
  }
}

/** ESC 키로 닫기 */
const onKeydown = (event: KeyboardEvent): void => {
  if (!visible.value) return
  if (event.key === 'Escape') picker.close()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    v-if="visible"
    class="slot-picker"
    role="dialog"
    aria-modal="true"
    @click="picker.close()"
  >
    <div class="slot-picker__panel" @click.stop>
      <header class="slot-picker__header">
        <h2 class="slot-picker__title">내 작업</h2>
        <button
          type="button"
          class="slot-picker__close"
          aria-label="닫기"
          @click="picker.close()"
        >
          ×
        </button>
      </header>

      <p v-if="sortedSlots.length === 0" class="slot-picker__empty">
        저장된 작업이 없습니다.
      </p>

      <ul v-else class="slot-picker__list">
        <li
          v-for="slot in sortedSlots"
          :key="slot.id"
          class="slot-picker__row"
          :class="{ 'slot-picker__row--active': slot.id === slots.activeId }"
          @click="onPick(slot)"
        >
          <div class="slot-picker__info">
            <div class="slot-picker__name">{{ slot.name }}</div>
            <div class="slot-picker__time">{{ formatTime(slot.updatedAt) }}</div>
          </div>
          <button
            type="button"
            class="slot-picker__delete"
            aria-label="삭제"
            @click="onDelete(slot, $event)"
          >
            🗑
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/common/variables' as *;

.slot-picker {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-modal;
}

.slot-picker__panel {
  background: $bg-panel;
  border-radius: 12px;
  width: 520px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}

.slot-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-lg;
  border-bottom: 1px solid $border;
}

.slot-picker__title {
  margin: 0;
  font-size: 16px;
}

.slot-picker__close {
  background: transparent;
  border: 0;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  color: $text-muted;

  &:hover {
    color: $text-primary;
  }
}

.slot-picker__empty {
  margin: 0;
  padding: $space-xl;
  text-align: center;
  color: $text-muted;
  font-size: 14px;
}

.slot-picker__list {
  list-style: none;
  margin: 0;
  padding: $space-sm 0;
  overflow: auto;
}

.slot-picker__row {
  display: flex;
  align-items: center;
  gap: $space-md;
  padding: $space-sm $space-lg;
  cursor: pointer;
  transition: background 0.12s;

  &:hover {
    background: $bg-app;
  }

  &--active {
    background: rgba($primary, 0.1);
  }
}

.slot-picker__info {
  flex: 1;
  min-width: 0;
}

.slot-picker__name {
  font-size: 14px;
  font-weight: 500;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slot-picker__time {
  font-size: 12px;
  color: $text-muted;
  margin-top: 2px;
}

.slot-picker__delete {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 14px;
  color: $text-muted;
  transition: background 0.12s, border-color 0.12s, color 0.12s;

  &:hover {
    background: rgba($danger, 0.1);
    border-color: $danger;
    color: $danger;
  }
}
</style>
