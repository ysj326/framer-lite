<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import Moveable from 'moveable'
import { useEditorStore } from '@/stores/editor'
import { useViewportStore } from '@/stores/viewport'

const props = defineProps<{
  /** moveable 핸들이 그려질 부모 컨테이너 (대개 Canvas) */
  container: HTMLElement | null
}>()

const editor = useEditorStore()
const viewport = useViewportStore()
let moveableInstance: Moveable | null = null

/**
 * 현재 selectedId에 해당하는 노드 DOM을 container 안에서 찾는다.
 * 인플레이스 편집 중(`editingId`)에는 핸들을 숨겨 텍스트 선택/편집을 방해하지 않는다.
 * @returns 노드 DOM 또는 null
 */
const findTargetEl = (): HTMLElement | null => {
  if (editor.editingId !== null) return null
  if (!editor.selectedId || !props.container) return null
  return props.container.querySelector<HTMLElement>(
    `[data-node-id="${editor.selectedId}"]`,
  )
}

/**
 * Moveable 인스턴스를 생성하고 drag/resize 이벤트를 store에 연결한다.
 * 매 update는 editor.updateNode를 통하며, history coalesce(`update-${id}`)로
 * 드래그 한 번 = undo 한 번 단위로 자동 묶인다.
 */
const initMoveable = (): void => {
  if (!props.container || moveableInstance) return

  moveableInstance = new Moveable(props.container, {
    target: findTargetEl() ?? undefined,
    draggable: true,
    resizable: true,
    origin: false,
    edge: false,
    keepRatio: false,
    zoom: viewport.zoom,
  })

  moveableInstance.on('drag', ({ left, top }) => {
    if (!editor.selectedId) return
    editor.updateNode(editor.selectedId, { x: left, y: top })
  })

  moveableInstance.on('resize', ({ width, height, drag }) => {
    if (!editor.selectedId) return
    editor.updateNode(editor.selectedId, {
      width,
      height,
      x: drag.left,
      y: drag.top,
    })
  })
}

watch(
  () => props.container,
  (el) => {
    if (el && !moveableInstance) initMoveable()
  },
)

/**
 * 선택 변경 또는 편집 상태 변경 시 target 갱신.
 * v-if 등으로 DOM이 바뀐 직후일 수 있어 nextTick 후 갱신.
 * editing 진입 시 target=null로 핸들이 사라지고, 종료 시 다시 붙는다.
 */
watch(
  () => [editor.selectedId, editor.editingId] as const,
  async () => {
    await nextTick()
    if (!moveableInstance) return
    moveableInstance.target = findTargetEl() ?? undefined
    moveableInstance.updateRect()
  },
)

/**
 * 노드 자체 좌표/크기 변경 시(예: PropertiesPanel 입력) target rect 동기화.
 */
watch(
  () => {
    const id = editor.selectedId
    if (!id) return null
    const n = editor.nodes[id]
    return n ? `${n.x},${n.y},${n.width},${n.height}` : null
  },
  () => {
    moveableInstance?.updateRect()
  },
)

/**
 * 캔버스 zoom 변경 시 moveable의 좌표 변환을 동기화한다.
 */
watch(
  () => viewport.zoom,
  (z) => {
    if (!moveableInstance) return
    moveableInstance.zoom = z
    moveableInstance.updateRect()
  },
)

onMounted(() => {
  initMoveable()
})

onBeforeUnmount(() => {
  moveableInstance?.destroy()
  moveableInstance = null
})
</script>

<template>
  <span class="moveable-wrapper" aria-hidden="true" />
</template>

<style scoped>
.moveable-wrapper {
  display: none;
}
</style>
