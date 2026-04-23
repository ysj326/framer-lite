import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import TemplatesView from './TemplatesView.vue'
import { useEditorStore } from '@/stores/editor'

const makeRouter = (): Router =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'templates', component: { template: '<div />' } },
      { path: '/editor', name: 'editor', component: { template: '<div />' } },
    ],
  })

const mountView = async () => {
  const router = makeRouter()
  router.push('/')
  await router.isReady()
  return {
    wrapper: mount(TemplatesView, { global: { plugins: [router] } }),
    router,
  }
}

describe('TemplatesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('3개의 템플릿 카드를 렌더한다', async () => {
    const { wrapper } = await mountView()
    const cards = wrapper.findAll('.template-card')
    expect(cards).toHaveLength(3)
    const labels = cards.map((c) => c.text())
    expect(labels.some((t) => t.includes('Blank'))).toBe(true)
    expect(labels.some((t) => t.includes('Landing'))).toBe(true)
    expect(labels.some((t) => t.includes('Portfolio'))).toBe(true)
  })

  it('Blank 카드 클릭 → editor가 빈 페이지로 로드되고 /editor로 이동', async () => {
    const editor = useEditorStore()
    const { wrapper, router } = await mountView()
    const blankCard = wrapper
      .findAll('.template-card')
      .find((c) => c.text().includes('Blank'))!
    await blankCard.trigger('click')
    await flushPromises()
    expect(editor.page.name).toBe('Blank')
    expect(editor.page.rootIds).toEqual([])
    expect(router.currentRoute.value.name).toBe('editor')
  })

  it('Landing 카드 클릭 → editor에 Landing 노드들이 로드된다', async () => {
    const editor = useEditorStore()
    const { wrapper } = await mountView()
    const landingCard = wrapper
      .findAll('.template-card')
      .find((c) => c.text().includes('Landing'))!
    await landingCard.trigger('click')
    await flushPromises()
    expect(editor.page.name).toBe('Landing')
    expect(Object.keys(editor.nodes).length).toBeGreaterThan(0)
  })
})
