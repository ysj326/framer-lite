<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useEditorStore } from '@/stores/editor'
import { useSlotsStore, MAX_SLOTS, SLOT_BODY_KEY_PREFIX } from '@/stores/slots'
import { useSlotPickerStore } from '@/stores/slotPicker'
import { useConfirmStore } from '@/stores/confirm'
import { fromJSON } from '@/utils/serialize'
import blankTemplate from '@/templates/blank.json'
import landingTemplate from '@/templates/landing.json'
import portfolioTemplate from '@/templates/portfolio.json'
import type { Project } from '@/types/project'

interface TemplateOption {
  id: string
  name: string
  description: string
  /** 카드 상단 색상 블록 */
  accent: string
  /** accent 위에 올릴 이니셜 글자색 (accent가 어두우면 cream, 밝으면 navy) */
  letter: string
  data: Project
}

/**
 * 정적 JSON 템플릿 카탈로그.
 * 새 템플릿 추가는 `src/templates/<name>.json` 작성 후 이 배열에 등록만 하면 된다.
 */
const templates: TemplateOption[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: '빈 캔버스에서 시작',
    accent: '#eae2b7', // cream
    letter: '#003049', // navy on cream
    data: blankTemplate as unknown as Project,
  },
  {
    id: 'landing',
    name: 'Landing',
    description: '헤더 + 히어로 + CTA',
    accent: '#f77f00', // orange
    letter: '#ffffff',
    data: landingTemplate as unknown as Project,
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: '카드 그리드 3개',
    accent: '#003049', // navy
    letter: '#eae2b7', // cream on navy
    data: portfolioTemplate as unknown as Project,
  },
]

const router = useRouter()
const editor = useEditorStore()
const slots = useSlotsStore()
const picker = useSlotPickerStore()
const confirm = useConfirmStore()

/**
 * 지정된 슬롯의 본문(Project JSON)을 editor에 로드한다.
 * 본문이 없거나 손상된 경우 false를 반환하고 editor는 건드리지 않는다.
 * (존재하지 않는 슬롯을 이어받으려 할 때의 안전장치)
 */
const loadSlotBody = (slotId: string): boolean => {
  const raw = localStorage.getItem(SLOT_BODY_KEY_PREFIX + slotId)
  if (!raw) return false
  const project = fromJSON(raw)
  if (!project) return false
  editor.loadProject(project)
  return true
}

/**
 * 새 슬롯을 만들고 템플릿 데이터를 로드한 뒤 에디터로 이동.
 * limit 도달 시 호출 금지 (호출자가 canCreate 확인 후 호출).
 */
const startNewSlot = (template: TemplateOption): void => {
  slots.createSlot(template.name)
  editor.loadProject(template.data)
  router.push({ name: 'editor' })
}

/**
 * 기존 슬롯을 활성화하고 본문을 로드한 뒤 에디터로 이동.
 * 본문이 없으면 /editor로는 이동하되 editor는 이전 상태 유지 (복구 실패는 조용히).
 */
const resumeSlot = (slotId: string): void => {
  slots.selectSlot(slotId)
  loadSlotBody(slotId)
  router.push({ name: 'editor' })
}

/**
 * SlotPicker를 열어 하나를 선택받아 이어받는다.
 * 사용자가 선택 없이 닫으면 아무 일도 일어나지 않는다.
 */
const pickAndResume = async (): Promise<void> => {
  const picked = await picker.open()
  if (picked) resumeSlot(picked)
}

/**
 * limit 도달 시 "작업 목록 열기" follow-up을 띄워 사용자가 삭제를 선택할 수 있게 한다.
 */
const showLimitReached = async (): Promise<void> => {
  const next = await confirm.confirm({
    title: '작업이 가득 찼습니다',
    message: `최대 ${MAX_SLOTS}개까지 저장할 수 있습니다.\n작업 목록에서 하나를 삭제한 뒤 다시 시도해 주세요.`,
    actions: [
      { id: 'open', label: '작업 목록 열기', variant: 'primary' },
      { id: 'cancel', label: '취소' },
    ],
  })
  if (next === 'open') await picker.open()
}

/**
 * 템플릿 카드 클릭 진입점.
 *
 * 분기:
 * 1. 슬롯 0개 → 바로 새 슬롯 생성 + 템플릿 로드 + /editor
 * 2. 슬롯 1개+ → 4 버튼 Confirm
 *    - 이어하기: 1개면 즉시 resume, 2개+면 SlotPicker
 *    - 새 작업: canCreate면 생성, 아니면 limit 안내
 *    - 다른 작업 선택: SlotPicker
 *    - 취소: no-op
 */
const useTemplate = async (template: TemplateOption): Promise<void> => {
  if (slots.slots.length === 0) {
    startNewSlot(template)
    return
  }

  const action = await confirm.confirm({
    title: '작업 시작',
    message: '어떻게 시작할까요?',
    actions: [
      { id: 'continue', label: '이어하기', variant: 'primary' },
      { id: 'new', label: '새 작업' },
      { id: 'switch', label: '다른 작업 선택' },
      { id: 'cancel', label: '취소' },
    ],
  })

  if (action === 'continue') {
    if (slots.slots.length === 1) {
      resumeSlot(slots.slots[0]!.id)
    } else {
      await pickAndResume()
    }
  } else if (action === 'new') {
    if (!slots.canCreate) {
      await showLimitReached()
      return
    }
    startNewSlot(template)
  } else if (action === 'switch') {
    await pickAndResume()
  }
  // cancel / null → no-op
}
</script>

<template>
  <main class="templates-view">
    <header class="templates-view__header">
      <h1>Framer Lite</h1>
      <p>템플릿을 선택해서 시작하세요</p>
    </header>

    <div class="templates-view__grid">
      <button
        v-for="t in templates"
        :key="t.id"
        type="button"
        class="template-card"
        @click="useTemplate(t)"
      >
        <div
          class="template-card__preview"
          :style="{ background: t.accent, color: t.letter }"
        >
          {{ t.name[0] }}
        </div>
        <h3 class="template-card__name">{{ t.name }}</h3>
        <p class="template-card__desc">{{ t.description }}</p>
      </button>
    </div>

    <footer v-if="slots.slots.length > 0" class="templates-view__footer">
      <button
        type="button"
        class="templates-view__my-works"
        @click="pickAndResume"
      >
        내 작업 {{ slots.slots.length }} / {{ MAX_SLOTS }}
      </button>
    </footer>
  </main>
</template>

<style lang="scss" scoped>
@use '@/styles/common/variables' as *;

.templates-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64px $space-xl 80px;
  gap: $space-xl;
}

.templates-view__header {
  text-align: center;

  h1 {
    margin: 0 0 $space-xs;
    font-size: 32px;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: $text-muted;
    font-size: 15px;
  }
}

.templates-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 280px));
  gap: $space-lg;
  max-width: 960px;
  width: 100%;
  justify-content: center;
}

.template-card {
  display: flex;
  flex-direction: column;
  text-align: left;
  background: $bg-panel;
  border: 1px solid $border;
  border-radius: 12px;
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  font-family: inherit;
  transition: border-color 0.15s, transform 0.15s;

  &:hover {
    border-color: $primary;
    transform: translateY(-2px);
  }
}

.template-card__preview {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 700;
  // 색상은 인라인 :style 바인딩으로 카드별 letter 색을 지정한다
}

.template-card__name {
  margin: $space-md $space-md $space-xs;
  font-size: 16px;
}

.template-card__desc {
  margin: 0 $space-md $space-md;
  color: $text-muted;
  font-size: 13px;
}

.templates-view__footer {
  margin-top: auto;
}

.templates-view__my-works {
  background: transparent;
  border: 1px solid $border;
  border-radius: 8px;
  padding: $space-sm $space-lg;
  font: inherit;
  color: $text-muted;
  cursor: pointer;
  transition: border-color 0.12s, color 0.12s;

  &:hover {
    border-color: $primary;
    color: $text-primary;
  }
}
</style>
