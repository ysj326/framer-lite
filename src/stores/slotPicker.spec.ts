import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSlotPickerStore } from './slotPicker'

describe('slotPicker store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('초기 상태: visible=false', () => {
    const s = useSlotPickerStore()
    expect(s.visible).toBe(false)
  })

  it('open() 호출 시 visible=true, Promise 반환', () => {
    const s = useSlotPickerStore()
    const p = s.open()
    expect(s.visible).toBe(true)
    expect(p).toBeInstanceOf(Promise)
  })

  it('pick(id)로 Promise가 해당 id로 resolve되고 visible=false', async () => {
    const s = useSlotPickerStore()
    const p = s.open()
    s.pick('slot-1')
    await expect(p).resolves.toBe('slot-1')
    expect(s.visible).toBe(false)
  })

  it('close()로 Promise가 null로 resolve', async () => {
    const s = useSlotPickerStore()
    const p = s.open()
    s.close()
    await expect(p).resolves.toBe(null)
    expect(s.visible).toBe(false)
  })

  it('open 재호출 시 이전 Promise는 null로 resolve되고 새 Promise로 교체', async () => {
    const s = useSlotPickerStore()
    const first = s.open()
    const second = s.open()
    await expect(first).resolves.toBe(null)
    s.pick('x')
    await expect(second).resolves.toBe('x')
  })
})
