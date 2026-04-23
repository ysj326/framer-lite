import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import Toolbar from './Toolbar.vue'
import { useEditorStore } from '@/stores/editor'
import { createTextNode } from '@/composables/useNodeFactory'

/**
 * Toolbar는 useRouter()를 사용하므로 메모리 히스토리 router를 주입한다.
 */
const makeRouter = (): Router =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'templates', component: { template: '<div />' } },
      { path: '/editor', name: 'editor', component: { template: '<div />' } },
      { path: '/preview', name: 'preview', component: { template: '<div />' } },
    ],
  })

const mountToolbar = async () => {
  const router = makeRouter()
  router.push('/editor')
  await router.isReady()
  return {
    wrapper: mount(Toolbar, { global: { plugins: [router] } }),
    router,
  }
}

const findButton = (wrapper: ReturnType<typeof mount>, label: string) =>
  wrapper.findAll('button').find((b) => b.text().trim() === label)

describe('Toolbar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('노드 추가 버튼', () => {
    it.each([
      ['+ Text', 'text'],
      ['+ Image', 'image'],
      ['+ Button', 'button'],
      ['+ Frame', 'frame'],
      ['+ Shape', 'shape'],
    ])('%s 클릭 시 해당 타입 노드 추가 + 자동 선택', async (label, type) => {
      const editor = useEditorStore()
      const { wrapper } = await mountToolbar()
      const btn = findButton(wrapper, label)!
      await btn.trigger('click')
      const ids = Object.keys(editor.nodes)
      expect(ids).toHaveLength(1)
      expect(editor.nodes[ids[0]!]!.type).toBe(type)
      expect(editor.selectedId).toBe(ids[0])
    })

    it('연속 추가 시 위치가 누적 offset 된다', async () => {
      const editor = useEditorStore()
      const { wrapper } = await mountToolbar()
      const btn = findButton(wrapper, '+ Text')!
      await btn.trigger('click')
      await btn.trigger('click')
      const xs = Object.values(editor.nodes).map((n) => n.x)
      expect(xs[0]).not.toBe(xs[1])
    })
  })

  describe('Undo / Redo', () => {
    it('canUndo=false일 때 Undo 버튼 disabled', async () => {
      const { wrapper } = await mountToolbar()
      const undo = findButton(wrapper, '↶ Undo')!
      expect(undo.attributes('disabled')).toBeDefined()
    })

    it('노드 추가 후 Undo 클릭 → 빈 상태 복원', async () => {
      const editor = useEditorStore()
      const { wrapper } = await mountToolbar()
      await findButton(wrapper, '+ Text')!.trigger('click')
      expect(Object.keys(editor.nodes)).toHaveLength(1)
      await wrapper.vm.$nextTick()
      const undo = findButton(wrapper, '↶ Undo')!
      await undo.trigger('click')
      expect(Object.keys(editor.nodes)).toHaveLength(0)
    })

    it('Undo 후 Redo로 복구', async () => {
      const editor = useEditorStore()
      const { wrapper } = await mountToolbar()
      await findButton(wrapper, '+ Text')!.trigger('click')
      await wrapper.vm.$nextTick()
      await findButton(wrapper, '↶ Undo')!.trigger('click')
      await wrapper.vm.$nextTick()
      await findButton(wrapper, '↷ Redo')!.trigger('click')
      expect(Object.keys(editor.nodes)).toHaveLength(1)
    })
  })

  describe('Preview 라우팅', () => {
    it('Preview 클릭 → /preview로 이동', async () => {
      const { wrapper, router } = await mountToolbar()
      await findButton(wrapper, 'Preview')!.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.name).toBe('preview')
    })
  })

  describe('Help 모달', () => {
    it('? 버튼 클릭 시 ShortcutsHelp가 마운트된다', async () => {
      const { wrapper } = await mountToolbar()
      expect(wrapper.find('.shortcuts-help').exists()).toBe(false)
      await findButton(wrapper, '?')!.trigger('click')
      expect(wrapper.find('.shortcuts-help').exists()).toBe(true)
    })
  })

  describe('Export HTML 버튼', () => {
    it('비어있어도 disabled가 아니다(클릭 가능)', async () => {
      const { wrapper } = await mountToolbar()
      const btn = findButton(wrapper, 'Export HTML')!
      expect(btn.attributes('disabled')).toBeUndefined()
    })
  })
})
