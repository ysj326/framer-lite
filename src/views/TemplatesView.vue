<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useEditorStore } from '@/stores/editor'
import blankTemplate from '@/templates/blank.json'
import landingTemplate from '@/templates/landing.json'
import portfolioTemplate from '@/templates/portfolio.json'
import type { Project } from '@/types/project'

interface TemplateOption {
  id: string
  name: string
  description: string
  accent: string
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
    accent: '#e5e5ea',
    data: blankTemplate as unknown as Project,
  },
  {
    id: 'landing',
    name: 'Landing',
    description: '헤더 + 히어로 + CTA',
    accent: '#0066ff',
    data: landingTemplate as unknown as Project,
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    description: '카드 그리드 3개',
    accent: '#ff3366',
    data: portfolioTemplate as unknown as Project,
  },
]

const router = useRouter()
const editor = useEditorStore()

/**
 * 선택한 템플릿을 editor에 로드한 뒤 에디터 화면으로 이동한다.
 * loadProject가 history도 비우므로 깨끗한 상태에서 시작된다.
 */
const useTemplate = (template: TemplateOption): void => {
  editor.loadProject(template.data)
  router.push({ name: 'editor' })
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
        <div class="template-card__preview" :style="{ background: t.accent }">
          {{ t.name[0] }}
        </div>
        <h3 class="template-card__name">{{ t.name }}</h3>
        <p class="template-card__desc">{{ t.description }}</p>
      </button>
    </div>
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
  color: rgba(255, 255, 255, 0.85);
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
</style>
