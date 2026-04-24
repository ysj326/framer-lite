import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent, h, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { useInlineEdit } from './useInlineEdit'
import { useEditorStore } from '@/stores/editor'

/**
 * useInlineEdit을 사용하는 작은 테스트용 컴포넌트.
 * 외부에서 nodeId, getValue, setValue, multiline을 주입할 수 있다.
 */
const makeHarness = (opts: {
  nodeId: () => string
  getValue: () => string
  setValue: (v: string) => void
  multiline?: boolean
}) =>
  defineComponent({
    setup() {
      return useInlineEdit(opts)
    },
    render() {
      return h('div', {
        contenteditable: this.isEditing,
        ref: 'editRef',
        onKeydown: this.onKeydown,
        onBlur: this.onBlur,
      })
    },
    mounted() {
      // vue-test-utils에서 ref 바인딩
      const ref = this.$refs.editRef as HTMLElement | undefined
      if (ref) this.editRef = ref
    },
  })

describe('useInlineEdit', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('편집 진입 시 현재 값을 내부에 스냅샷으로 저장 (cancel 복구용)', async () => {
    const editor = useEditorStore()
    const current = ref('원본')
    const Harness = makeHarness({
      nodeId: () => 'n1',
      getValue: () => current.value,
      setValue: (v) => {
        current.value = v
      },
    })
    const w = mount(Harness, { attachTo: document.body })
    // 노드 등록은 생략 (useInlineEdit은 store의 editingId만 본다)
    editor.editingId = 'n1'
    await nextTick()

    // 편집 중 DOM을 바꾸고 cancel → 원본 복구
    const el = w.element as HTMLElement
    el.innerText = '수정중'
    w.vm.cancel()
    expect(current.value).toBe('원본')
    expect(editor.editingId).toBe(null)
    w.unmount()
  })

  it('commit()은 setValue 호출 + editor.endEdit', async () => {
    const editor = useEditorStore()
    const setValue = vi.fn()
    const Harness = makeHarness({
      nodeId: () => 'n1',
      getValue: () => '원본',
      setValue,
    })
    const w = mount(Harness, { attachTo: document.body })
    editor.editingId = 'n1'
    await nextTick()
    const el = w.element as HTMLElement
    el.innerText = '새 값'
    w.vm.commit()
    expect(setValue).toHaveBeenCalledWith('새 값')
    expect(editor.editingId).toBe(null)
    w.unmount()
  })

  it('Escape 키 → cancel', async () => {
    const editor = useEditorStore()
    const setValue = vi.fn()
    const Harness = makeHarness({
      nodeId: () => 'n1',
      getValue: () => '원본',
      setValue,
    })
    const w = mount(Harness, { attachTo: document.body })
    editor.editingId = 'n1'
    await nextTick()
    await w.trigger('keydown', { key: 'Escape' })
    expect(setValue).not.toHaveBeenCalled()
    expect(editor.editingId).toBe(null)
    w.unmount()
  })

  it('multiline=false: Enter → commit', async () => {
    const editor = useEditorStore()
    const setValue = vi.fn()
    const Harness = makeHarness({
      nodeId: () => 'n1',
      getValue: () => '원본',
      setValue,
      multiline: false,
    })
    const w = mount(Harness, { attachTo: document.body })
    editor.editingId = 'n1'
    await nextTick()
    const el = w.element as HTMLElement
    el.innerText = '새값'
    await w.trigger('keydown', { key: 'Enter' })
    expect(setValue).toHaveBeenCalledWith('새값')
    expect(editor.editingId).toBe(null)
    w.unmount()
  })

  it('multiline=true: Enter → commit 안 함 (개행 허용)', async () => {
    const editor = useEditorStore()
    const setValue = vi.fn()
    const Harness = makeHarness({
      nodeId: () => 'n1',
      getValue: () => '원본',
      setValue,
      multiline: true,
    })
    const w = mount(Harness, { attachTo: document.body })
    editor.editingId = 'n1'
    await nextTick()
    await w.trigger('keydown', { key: 'Enter' })
    expect(setValue).not.toHaveBeenCalled()
    expect(editor.editingId).toBe('n1')
    w.unmount()
  })

  it('multiline=true: Cmd+Enter → commit', async () => {
    const editor = useEditorStore()
    const setValue = vi.fn()
    const Harness = makeHarness({
      nodeId: () => 'n1',
      getValue: () => '원본',
      setValue,
      multiline: true,
    })
    const w = mount(Harness, { attachTo: document.body })
    editor.editingId = 'n1'
    await nextTick()
    // happy-dom의 innerText는 개행 보존이 완전하지 않으므로 값 자체는 검증하지 않고
    // commit이 호출되었고 편집이 종료되었는지만 확인한다.
    await w.trigger('keydown', { key: 'Enter', metaKey: true })
    expect(setValue).toHaveBeenCalled()
    expect(editor.editingId).toBe(null)
    w.unmount()
  })

  it('blur 이벤트 → 편집 중이면 commit', async () => {
    const editor = useEditorStore()
    const setValue = vi.fn()
    const Harness = makeHarness({
      nodeId: () => 'n1',
      getValue: () => '원본',
      setValue,
    })
    const w = mount(Harness, { attachTo: document.body })
    editor.editingId = 'n1'
    await nextTick()
    const el = w.element as HTMLElement
    el.innerText = 'blurred'
    await w.trigger('blur')
    expect(setValue).toHaveBeenCalledWith('blurred')
    expect(editor.editingId).toBe(null)
    w.unmount()
  })

  it('편집 중이 아닐 때의 blur는 아무 동작 없음', async () => {
    const editor = useEditorStore()
    const setValue = vi.fn()
    const Harness = makeHarness({
      nodeId: () => 'n1',
      getValue: () => '원본',
      setValue,
    })
    const w = mount(Harness, { attachTo: document.body })
    // editingId는 여전히 null
    await w.trigger('blur')
    expect(setValue).not.toHaveBeenCalled()
    expect(editor.editingId).toBe(null)
    w.unmount()
  })
})
