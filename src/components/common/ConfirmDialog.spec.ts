import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ConfirmDialog from './ConfirmDialog.vue'
import { useConfirmStore } from '@/stores/confirm'

describe('ConfirmDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('visible=false면 모달 root가 렌더되지 않음', () => {
    const w = mount(ConfirmDialog)
    expect(w.find('.confirm-dialog').exists()).toBe(false)
  })

  it('confirm() 호출 후 title/message와 각 action 버튼이 렌더됨', async () => {
    const s = useConfirmStore()
    s.confirm({
      title: '확인',
      message: '정말 삭제할까요?',
      actions: [
        { id: 'ok', label: '삭제', variant: 'danger' },
        { id: 'cancel', label: '취소' },
      ],
    })
    const w = mount(ConfirmDialog)
    await w.vm.$nextTick()
    expect(w.text()).toContain('확인')
    expect(w.text()).toContain('정말 삭제할까요?')
    const buttons = w.findAll('.confirm-dialog__action')
    expect(buttons).toHaveLength(2)
    expect(buttons[0]!.text()).toBe('삭제')
    expect(buttons[1]!.text()).toBe('취소')
  })

  it('action 버튼 클릭 시 해당 id로 Promise resolve', async () => {
    const s = useConfirmStore()
    const promise = s.confirm({
      title: 't',
      message: 'm',
      actions: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
    })
    const w = mount(ConfirmDialog)
    await w.vm.$nextTick()
    await w.findAll('.confirm-dialog__action')[1]!.trigger('click')
    await expect(promise).resolves.toBe('b')
  })

  it('backdrop 클릭 시 null로 resolve', async () => {
    const s = useConfirmStore()
    const promise = s.confirm({ title: 't', message: 'm', actions: [] })
    const w = mount(ConfirmDialog, { attachTo: document.body })
    await w.vm.$nextTick()
    await w.find('.confirm-dialog').trigger('click')
    await expect(promise).resolves.toBe(null)
    w.unmount()
  })

  it('패널 내부 클릭은 backdrop close를 트리거하지 않음', async () => {
    const s = useConfirmStore()
    s.confirm({ title: 't', message: 'm', actions: [{ id: 'a', label: 'A' }] })
    const w = mount(ConfirmDialog)
    await w.vm.$nextTick()
    await w.find('.confirm-dialog__panel').trigger('click')
    expect(s.visible).toBe(true)
  })

  it('ESC 키 → null로 resolve', async () => {
    const s = useConfirmStore()
    const promise = s.confirm({ title: 't', message: 'm', actions: [] })
    const w = mount(ConfirmDialog, { attachTo: document.body })
    await w.vm.$nextTick()
    const evt = new KeyboardEvent('keydown', { key: 'Escape' })
    window.dispatchEvent(evt)
    await expect(promise).resolves.toBe(null)
    w.unmount()
  })

  it('action.variant가 버튼 class에 반영', async () => {
    const s = useConfirmStore()
    s.confirm({
      title: 't',
      message: 'm',
      actions: [
        { id: 'p', label: 'P', variant: 'primary' },
        { id: 'd', label: 'D', variant: 'danger' },
      ],
    })
    const w = mount(ConfirmDialog)
    await w.vm.$nextTick()
    const buttons = w.findAll('.confirm-dialog__action')
    expect(buttons[0]!.classes()).toContain('confirm-dialog__action--primary')
    expect(buttons[1]!.classes()).toContain('confirm-dialog__action--danger')
  })
})
