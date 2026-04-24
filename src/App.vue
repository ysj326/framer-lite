<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAutoSave } from '@/composables/useAutoSave'
import { useSlotsStore } from '@/stores/slots'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import SlotPickerDialog from '@/components/common/SlotPickerDialog.vue'

/**
 * 앱 부팅 시 1회만:
 * 1. 슬롯 인덱스 hydrate
 * 2. 구버전 단일 키 → 슬롯 1개로 마이그레이션 (있을 때만)
 * 3. 활성 슬롯의 본문 복구
 *
 * useAutoSave를 App.vue에서 1회 등록하므로 라우트 이동으로 watch가 끊기지 않고,
 * TemplatesView에서 loadProject 직후 EditorView로 이동해도 기존 데이터로 덮어써지지 않는다.
 * ConfirmDialog도 App.vue에 1회 마운트되어 어느 화면에서든 전역으로 띄울 수 있다.
 */
const slots = useSlotsStore()
const autoSave = useAutoSave()
onMounted(() => {
  slots.hydrate()
  autoSave.migrateLegacy()
  autoSave.restore()
})
</script>

<template>
  <RouterView />
  <ConfirmDialog />
  <SlotPickerDialog />
</template>
