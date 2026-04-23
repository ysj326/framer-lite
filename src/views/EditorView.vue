<script setup lang="ts">
import EditorLayout from '@/components/editor/EditorLayout.vue'
import { useShortcuts } from '@/composables/useShortcuts'

/**
 * 에디터 화면.
 * useAutoSave는 App.vue에서 1회 등록되므로 여기선 단축키만 활성화.
 */
useShortcuts()
</script>

<template>
  <EditorLayout />
</template>
