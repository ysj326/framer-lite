import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SlotPickerDialog from './SlotPickerDialog.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { useSlotsStore } from '@/stores/slots'
import { useSlotPickerStore } from '@/stores/slotPicker'
import { useConfirmStore } from '@/stores/confirm'

/**
 * SlotPicker는 내부 삭제 흐름이 ConfirmDialog와 상호작용하므로
 * 두 컴포넌트를 한 뷰에 함께 마운트해서 테스트한다.
 */
const mountWithConfirm = () =>
  mount(
    {
      components: { SlotPickerDialog, ConfirmDialog },
      template: '<div><SlotPickerDialog /><ConfirmDialog /></div>',
    },
    { attachTo: document.body },
  )

describe('SlotPickerDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('visible=false면 모달 root가 렌더되지 않음', () => {
    const w = mountWithConfirm()
    expect(w.find('.slot-picker').exists()).toBe(false)
    w.unmount()
  })

  it('visible=true + 슬롯 2개면 updatedAt 내림차순으로 목록 2행 렌더', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1, 10))
    const slots = useSlotsStore()
    slots.createSlot('오래된')
    vi.advanceTimersByTime(60_000)
    slots.createSlot('최근')
    useSlotPickerStore().open()
    const w = mountWithConfirm()
    await w.vm.$nextTick()
    const rows = w.findAll('.slot-picker__row')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('최근')
    expect(rows[1]!.text()).toContain('오래된')
    vi.useRealTimers()
    w.unmount()
  })

  it('행 클릭 시 picker.pick(id) 호출 → Promise가 id로 resolve', async () => {
    const slots = useSlotsStore()
    const a = slots.createSlot('A')
    const picker = useSlotPickerStore()
    const promise = picker.open()
    const w = mountWithConfirm()
    await w.vm.$nextTick()
    await w.find('.slot-picker__row').trigger('click')
    await expect(promise).resolves.toBe(a.id)
    w.unmount()
  })

  it('삭제 버튼 클릭 → ConfirmDialog 등장, 확인 누르면 slot 제거', async () => {
    const slots = useSlotsStore()
    const a = slots.createSlot('A')
    slots.createSlot('B')
    useSlotPickerStore().open()
    const w = mountWithConfirm()
    await w.vm.$nextTick()
    // A의 삭제 버튼 클릭 (정렬: updatedAt desc → 최신이 먼저. createSlot 순서상 B가 더 최신)
    const rows = w.findAll('.slot-picker__row')
    const aRow = rows.find((r) => r.text().includes('A'))!
    await aRow.find('.slot-picker__delete').trigger('click')
    await flushPromises()
    // ConfirmDialog 등장
    expect(w.find('.confirm-dialog').exists()).toBe(true)
    // 확인(danger 버튼) 클릭
    const deleteBtn = w
      .findAll('.confirm-dialog__action')
      .find((b) => b.text().includes('삭제'))!
    await deleteBtn.trigger('click')
    await flushPromises()
    expect(slots.slots.some((s) => s.id === a.id)).toBe(false)
    expect(slots.slots).toHaveLength(1)
    w.unmount()
  })

  it('삭제 Confirm에서 취소하면 slot 유지', async () => {
    const slots = useSlotsStore()
    slots.createSlot('A')
    useSlotPickerStore().open()
    const w = mountWithConfirm()
    await w.vm.$nextTick()
    await w.find('.slot-picker__delete').trigger('click')
    await flushPromises()
    const cancelBtn = w
      .findAll('.confirm-dialog__action')
      .find((b) => b.text().includes('취소'))!
    await cancelBtn.trigger('click')
    await flushPromises()
    expect(slots.slots).toHaveLength(1)
    w.unmount()
  })

  it('슬롯 0개면 빈 상태 메시지 표시', async () => {
    useSlotPickerStore().open()
    const w = mountWithConfirm()
    await w.vm.$nextTick()
    expect(w.find('.slot-picker__empty').exists()).toBe(true)
    w.unmount()
  })

  it('backdrop 클릭 → picker.close (null resolve)', async () => {
    const picker = useSlotPickerStore()
    const promise = picker.open()
    const w = mountWithConfirm()
    await w.vm.$nextTick()
    await w.find('.slot-picker').trigger('click')
    await expect(promise).resolves.toBe(null)
    w.unmount()
  })
})
