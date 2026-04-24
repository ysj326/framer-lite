import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConfirmStore } from './confirm'

describe('confirm store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('초기 상태: visible=false, actions 비어있음', () => {
    const s = useConfirmStore()
    expect(s.visible).toBe(false)
    expect(s.actions).toEqual([])
  })

  it('confirm() 호출 시 visible=true이고 title/message/actions 반영', () => {
    const s = useConfirmStore()
    s.confirm({
      title: '확인',
      message: '진행할까요?',
      actions: [
        { id: 'ok', label: '확인', variant: 'primary' },
        { id: 'cancel', label: '취소' },
      ],
    })
    expect(s.visible).toBe(true)
    expect(s.title).toBe('확인')
    expect(s.message).toBe('진행할까요?')
    expect(s.actions).toHaveLength(2)
  })

  it('resolveAction(id)로 promise가 해당 id로 resolve되고 visible=false', async () => {
    const s = useConfirmStore()
    const promise = s.confirm({
      title: 't',
      message: 'm',
      actions: [{ id: 'yes', label: 'Yes' }],
    })
    s.resolveAction('yes')
    await expect(promise).resolves.toBe('yes')
    expect(s.visible).toBe(false)
  })

  it('resolveAction(null)로 취소 시 promise가 null로 resolve', async () => {
    const s = useConfirmStore()
    const promise = s.confirm({ title: 't', message: 'm', actions: [] })
    s.resolveAction(null)
    await expect(promise).resolves.toBe(null)
    expect(s.visible).toBe(false)
  })

  it('이미 열려있는 dialog가 있는 상태에서 confirm 재호출 → 이전 promise는 null로 resolve, 새 상태로 교체', async () => {
    const s = useConfirmStore()
    const first = s.confirm({ title: '첫번째', message: 'm1', actions: [] })
    const second = s.confirm({ title: '두번째', message: 'm2', actions: [] })
    // 첫번째는 즉시 null로 끝남
    await expect(first).resolves.toBe(null)
    expect(s.title).toBe('두번째')
    // 두번째는 아직 대기중
    s.resolveAction('x')
    await expect(second).resolves.toBe('x')
  })
})
