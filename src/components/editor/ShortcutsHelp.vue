<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits<{
  close: []
}>()

/** 단축키 목록 — 데이터 소스가 한 곳이라 추후 표시 변경이 쉽다. */
const shortcuts: Array<{ keys: string; description: string }> = [
  { keys: 'Cmd / Ctrl + Z', description: '실행 취소 (Undo)' },
  { keys: 'Shift + Cmd / Ctrl + Z', description: '다시 실행 (Redo)' },
  { keys: 'Cmd / Ctrl + D', description: '선택 노드 복제' },
  { keys: 'Delete / Backspace', description: '선택 노드 삭제' },
  { keys: 'Arrow ←→↑↓', description: '선택 노드 1px 이동 (Shift+Arrow = 10px)' },
  { keys: 'Cmd / Ctrl + ]', description: '한 단계 위로 (z+1)' },
  { keys: 'Cmd / Ctrl + [', description: '한 단계 아래로 (z-1)' },
  { keys: 'Shift + Cmd / Ctrl + ]', description: '맨 위로' },
  { keys: 'Shift + Cmd / Ctrl + [', description: '맨 아래로' },
  { keys: 'Double Click Text / Button', description: '인플레이스 편집 (Esc 취소)' },
  { keys: 'Click', description: '노드 선택' },
  { keys: 'Click empty area', description: '선택 해제' },
  { keys: 'Drag handle', description: '이동' },
  { keys: 'Resize handle', description: '크기 변경' },
]

/**
 * ESC 키로 모달 닫기.
 */
const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

const onBackdropClick = (): void => emit('close')
</script>

<template>
  <div class="shortcuts-help" @click="onBackdropClick">
    <div class="shortcuts-help__panel" @click.stop>
      <header class="shortcuts-help__header">
        <h2>Keyboard Shortcuts</h2>
        <button type="button" class="shortcuts-help__close" @click="emit('close')">×</button>
      </header>
      <table class="shortcuts-help__table">
        <tbody>
          <tr v-for="row in shortcuts" :key="row.keys">
            <td><kbd>{{ row.keys }}</kbd></td>
            <td>{{ row.description }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/common/variables' as *;

.shortcuts-help {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: $z-modal;
}

.shortcuts-help__panel {
  background: $bg-panel;
  border-radius: 12px;
  width: 480px;
  max-width: 90vw;
  max-height: 80vh;
  overflow: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}

.shortcuts-help__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-lg;
  border-bottom: 1px solid $border;

  h2 {
    margin: 0;
    font-size: 16px;
  }
}

.shortcuts-help__close {
  background: transparent;
  border: 0;
  font-size: 22px;
  cursor: pointer;
  color: $text-muted;
  line-height: 1;

  &:hover {
    color: $text-primary;
  }
}

.shortcuts-help__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  td {
    padding: $space-sm $space-lg;
    border-bottom: 1px solid $border;
    vertical-align: middle;

    &:first-child {
      width: 40%;
    }
  }

  tr:last-child td {
    border-bottom: 0;
  }

  kbd {
    background: $bg-app;
    border: 1px solid $border;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 11px;
    font-family: $font-mono;
    color: $text-primary;
  }
}
</style>
