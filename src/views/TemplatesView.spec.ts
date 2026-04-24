import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import TemplatesView from './TemplatesView.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import SlotPickerDialog from '@/components/common/SlotPickerDialog.vue'
import { useEditorStore } from '@/stores/editor'
import { useSlotsStore, MAX_SLOTS, SLOT_BODY_KEY_PREFIX } from '@/stores/slots'
import { toJSON } from '@/utils/serialize'
import type { Project } from '@/types/project'

const makeRouter = (): Router =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'templates', component: { template: '<div />' } },
      { path: '/editor', name: 'editor', component: { template: '<div />' } },
    ],
  })

/**
 * TemplatesView + 모달 2종(Confirm/SlotPicker)을 함께 마운트.
 * 카드 클릭 후 나타나는 다이얼로그에 실제로 클릭할 수 있도록 attachTo: body.
 */
const mountView = async () => {
  const router = makeRouter()
  router.push('/')
  await router.isReady()
  const wrapper = mount(
    {
      components: { TemplatesView, ConfirmDialog, SlotPickerDialog },
      template: '<div><TemplatesView /><ConfirmDialog /><SlotPickerDialog /></div>',
    },
    { global: { plugins: [router] }, attachTo: document.body },
  )
  return { wrapper, router }
}

const findCard = (wrapper: ReturnType<typeof mount>, name: string) =>
  wrapper.findAll('.template-card').find((c) => c.text().includes(name))!

const findConfirmBtn = (wrapper: ReturnType<typeof mount>, label: string) =>
  wrapper
    .findAll('.confirm-dialog__action')
    .find((b) => b.text().includes(label))!

/** 테스트용 최소 Project */
const makeSavedProject = (pageName: string): Project => ({
  version: 1,
  name: pageName,
  page: {
    id: 'p1',
    name: pageName,
    width: 1280,
    height: 800,
    background: '#fff',
    rootIds: [],
  },
  nodes: {},
  updatedAt: 0,
})

describe('TemplatesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('3개의 템플릿 카드를 렌더한다', async () => {
    const { wrapper } = await mountView()
    const cards = wrapper.findAll('.template-card')
    expect(cards).toHaveLength(3)
    const labels = cards.map((c) => c.text())
    expect(labels.some((t) => t.includes('Blank'))).toBe(true)
    expect(labels.some((t) => t.includes('Landing'))).toBe(true)
    expect(labels.some((t) => t.includes('Portfolio'))).toBe(true)
    wrapper.unmount()
  })

  it('슬롯이 0개일 때 Blank 카드 클릭 → 새 슬롯 생성 + editor 로드 + /editor 이동', async () => {
    const editor = useEditorStore()
    const slots = useSlotsStore()
    const { wrapper, router } = await mountView()
    await findCard(wrapper, 'Blank').trigger('click')
    await flushPromises()
    expect(slots.slots).toHaveLength(1)
    expect(editor.page.name).toBe('Blank')
    expect(editor.page.rootIds).toEqual([])
    expect(router.currentRoute.value.name).toBe('editor')
    wrapper.unmount()
  })

  it('슬롯이 0개일 때 Landing 카드 클릭 → editor에 Landing 노드들이 로드된다', async () => {
    const editor = useEditorStore()
    const { wrapper } = await mountView()
    await findCard(wrapper, 'Landing').trigger('click')
    await flushPromises()
    expect(editor.page.name).toBe('Landing')
    expect(Object.keys(editor.nodes).length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('슬롯이 1개 이상 있을 때 카드 클릭 → ConfirmDialog 4 버튼 등장', async () => {
    const slots = useSlotsStore()
    slots.createSlot('기존')
    const { wrapper } = await mountView()
    await findCard(wrapper, 'Blank').trigger('click')
    await flushPromises()
    expect(wrapper.find('.confirm-dialog').exists()).toBe(true)
    const buttons = wrapper.findAll('.confirm-dialog__action')
    const labels = buttons.map((b) => b.text())
    expect(labels.some((l) => l.includes('이어하기'))).toBe(true)
    expect(labels.some((l) => l.includes('새 작업'))).toBe(true)
    expect(labels.some((l) => l.includes('다른 작업'))).toBe(true)
    expect(labels.some((l) => l.includes('취소'))).toBe(true)
    wrapper.unmount()
  })

  it('Confirm "새 작업" → 새 슬롯 생성 + 템플릿 로드 + /editor', async () => {
    const editor = useEditorStore()
    const slots = useSlotsStore()
    slots.createSlot('기존')
    const { wrapper, router } = await mountView()
    await findCard(wrapper, 'Blank').trigger('click')
    await flushPromises()
    await findConfirmBtn(wrapper, '새 작업').trigger('click')
    await flushPromises()
    expect(slots.slots).toHaveLength(2)
    expect(editor.page.name).toBe('Blank')
    expect(router.currentRoute.value.name).toBe('editor')
    wrapper.unmount()
  })

  it('Confirm "이어하기" + 슬롯 1개 → 해당 슬롯 본문 로드 + /editor', async () => {
    const editor = useEditorStore()
    const slots = useSlotsStore()
    const existing = slots.createSlot('기존')
    localStorage.setItem(
      SLOT_BODY_KEY_PREFIX + existing.id,
      toJSON(makeSavedProject('저장된 페이지')),
    )
    const { wrapper, router } = await mountView()
    await findCard(wrapper, 'Blank').trigger('click')
    await flushPromises()
    await findConfirmBtn(wrapper, '이어하기').trigger('click')
    await flushPromises()
    expect(slots.activeId).toBe(existing.id)
    expect(editor.page.name).toBe('저장된 페이지')
    expect(router.currentRoute.value.name).toBe('editor')
    wrapper.unmount()
  })

  it('Confirm "새 작업" + limit 도달 → follow-up Confirm("작업 목록 열기") 안내', async () => {
    const slots = useSlotsStore()
    for (let i = 0; i < MAX_SLOTS; i++) slots.createSlot(`slot${i}`)
    const { wrapper } = await mountView()
    await findCard(wrapper, 'Blank').trigger('click')
    await flushPromises()
    await findConfirmBtn(wrapper, '새 작업').trigger('click')
    await flushPromises()
    // follow-up Confirm
    expect(wrapper.find('.confirm-dialog').exists()).toBe(true)
    const labels = wrapper
      .findAll('.confirm-dialog__action')
      .map((b) => b.text())
    expect(labels.some((l) => l.includes('작업 목록 열기'))).toBe(true)
    // 새 슬롯은 생성되지 않음
    expect(slots.slots).toHaveLength(MAX_SLOTS)
    wrapper.unmount()
  })

  it('Confirm "취소" → 아무 변화 없이 / 유지', async () => {
    const slots = useSlotsStore()
    slots.createSlot('기존')
    const { wrapper, router } = await mountView()
    await findCard(wrapper, 'Blank').trigger('click')
    await flushPromises()
    await findConfirmBtn(wrapper, '취소').trigger('click')
    await flushPromises()
    expect(slots.slots).toHaveLength(1)
    expect(router.currentRoute.value.name).toBe('templates')
    wrapper.unmount()
  })
})
