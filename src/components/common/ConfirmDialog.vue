<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useConfirmStore } from '@/stores/confirm'

/**
 * 전역 Confirm 모달.
 * App.vue 루트에 1회 마운트되어, 어느 컴포넌트에서든
 * `useConfirmStore().confirm({ ... })`로 Promise 기반 확인 창을 띄울 수 있다.
 *
 * 닫기 경로:
 * - 버튼 클릭: 해당 action.id로 resolve
 * - Backdrop 클릭: null(취소)로 resolve
 * - ESC: null(취소)로 resolve
 */
const store = useConfirmStore()
const { visible, title, message, actions } = storeToRefs(store)

/** ESC 키로 취소 */
const onKeydown = (event: KeyboardEvent): void => {
  if (!visible.value) return
  if (event.key === 'Escape') store.resolveAction(null)
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
    class="confirm-dialog"
    role="dialog"
    aria-modal="true"
    @click="store.resolveAction(null)"
  >
    <div class="confirm-dialog__panel" @click.stop>
      <h2 class="confirm-dialog__title">{{ title }}</h2>
      <p class="confirm-dialog__message">{{ message }}</p>
      <div class="confirm-dialog__actions">
        <button
          v-for="action in actions"
          :key="action.id"
          type="button"
          class="confirm-dialog__action"
          :class="[
            `confirm-dialog__action--${action.variant ?? 'default'}`,
          ]"
          @click="store.resolveAction(action.id)"
        >
          {{ action.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/common/variables' as *;

.confirm-dialog {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-modal;
}

.confirm-dialog__panel {
  background: $bg-panel;
  border-radius: 12px;
  width: 440px;
  max-width: 90vw;
  padding: $space-xl;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}

.confirm-dialog__title {
  margin: 0 0 $space-sm;
  font-size: 17px;
  font-weight: 600;
}

.confirm-dialog__message {
  margin: 0 0 $space-xl;
  font-size: 14px;
  color: $text-muted;
  line-height: 1.5;
  white-space: pre-line;
}

.confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: $space-sm;
  flex-wrap: wrap;
}

.confirm-dialog__action {
  min-width: 80px;
  padding: $space-sm $space-md;
  border-radius: 8px;
  border: 1px solid $border;
  background: $bg-app;
  color: $text-primary;
  font: inherit;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;

  &:hover {
    border-color: $primary;
  }

  &--primary {
    background: $primary;
    border-color: $primary;
    color: #fff;

    &:hover {
      background: darken($primary, 6%);
      border-color: darken($primary, 6%);
    }
  }

  &--danger {
    background: $danger;
    border-color: $danger;
    color: #fff;

    &:hover {
      background: darken($danger, 6%);
      border-color: darken($danger, 6%);
    }
  }
}
</style>
