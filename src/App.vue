<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAutoSave } from '@/composables/useAutoSave'

/**
 * 앱 부팅 시 1회만 useAutoSave 등록 + localStorage 복구.
 * 이렇게 하면 라우트 이동(/, /editor, /preview)이 watch를 끊지 않고,
 * TemplatesView에서 loadProject 직후 EditorView로 이동해도 기존 데이터로 덮어써지지 않는다.
 */
const autoSave = useAutoSave()
onMounted(() => {
  autoSave.restore()
})
</script>

<template>
  <RouterView />
</template>
