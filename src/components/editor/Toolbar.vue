<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useEditorStore } from '@/stores/editor'
import {
  createTextNode,
  createImageNode,
  createButtonNode,
  createFrameNode,
  createShapeNode,
  type BaseNodeOptions,
} from '@/composables/useNodeFactory'
import { downloadProject, readProjectFile } from '@/utils/projectFile'
import { downloadHtml } from '@/utils/htmlExport'
import type { AppNode } from '@/types/node'
import ShortcutsHelp from './ShortcutsHelp.vue'

const editor = useEditorStore()
const router = useRouter()

/** 새 노드 추가 시 누적 offset (다음 위치를 약간씩 이동시켜 겹침 방지) */
let offsetCount = 0

/**
 * 다음 노드의 기본 위치(좌표)를 계산한다.
 * @returns 캔버스 기준 x/y
 */
const nextPos = (): { x: number; y: number } => {
  const offset = (offsetCount % 10) * 20
  offsetCount += 1
  return { x: 40 + offset, y: 40 + offset }
}

/**
 * factory를 호출해 노드를 만들고 페이지 직속으로 추가, 즉시 선택한다.
 * @param factory 노드 팩토리 (createTextNode 등)
 */
const addNew = <T extends AppNode>(
  factory: (opts: BaseNodeOptions) => T,
): void => {
  const node = factory(nextPos())
  editor.addNode(node, null)
  editor.select(node.id)
}

const onAddText = (): void => addNew(createTextNode)
const onAddImage = (): void => addNew(createImageNode)
const onAddButton = (): void => addNew(createButtonNode)
const onAddFrame = (): void => addNew(createFrameNode)
const onAddShape = (): void => addNew(createShapeNode)

const onUndo = (): void => editor.undo()
const onRedo = (): void => editor.redo()
const onPreview = (): void => {
  router.push({ name: 'preview' })
}

/** JSON 파일 다운로드 */
const onSave = (): void => {
  downloadProject(editor.buildProject())
}

/** 현재 프로젝트를 단일 .html 파일로 export */
const onExportHtml = (): void => {
  downloadHtml(editor.buildProject())
}

/** 단축키 헬프 모달 토글 */
const showHelp = ref(false)
const onToggleHelp = (): void => {
  showHelp.value = !showHelp.value
}

/** Load 버튼이 트리거할 hidden file input */
const fileInput = ref<HTMLInputElement | null>(null)
const onLoadClick = (): void => fileInput.value?.click()

/**
 * 파일 input 변경 핸들러 — 선택된 .json을 읽어 editor에 로드한다.
 * 같은 파일을 두 번 선택해도 onChange가 트리거되도록 input 값을 초기화한다.
 */
const onFileChange = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const project = await readProjectFile(file)
  if (project) editor.loadProject(project)
  input.value = ''
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar__group toolbar__group--add">
      <button type="button" @click="onAddText">+ Text</button>
      <button type="button" @click="onAddImage">+ Image</button>
      <button type="button" @click="onAddButton">+ Button</button>
      <button type="button" @click="onAddFrame">+ Frame</button>
      <button type="button" @click="onAddShape">+ Shape</button>
    </div>

    <div class="toolbar__group toolbar__group--history">
      <button type="button" :disabled="!editor.canUndo" @click="onUndo">↶ Undo</button>
      <button type="button" :disabled="!editor.canRedo" @click="onRedo">↷ Redo</button>
    </div>

    <div class="toolbar__group toolbar__group--io">
      <button type="button" @click="onPreview">Preview</button>
      <button type="button" @click="onSave">Save JSON</button>
      <button type="button" @click="onLoadClick">Load JSON</button>
      <button type="button" @click="onExportHtml">Export HTML</button>
      <button type="button" title="Keyboard shortcuts" @click="onToggleHelp">?</button>
      <input
        ref="fileInput"
        type="file"
        accept="application/json,.json"
        hidden
        @change="onFileChange"
      />
    </div>
    <ShortcutsHelp v-if="showHelp" @close="showHelp = false" />
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/common/variables' as *;

.toolbar {
  display: flex;
  align-items: center;
  gap: $space-lg;
  width: 100%;
  font-size: 13px;
}

.toolbar__group {
  display: flex;
  gap: $space-xs;

  &--io {
    margin-left: auto;
  }
}

button {
  background: $bg-app;
  border: 1px solid $border;
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
  color: $text-primary;
  font-size: 12px;

  &:hover:not(:disabled) {
    background: rgba($primary, 0.1);
    border-color: $primary;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
</style>
