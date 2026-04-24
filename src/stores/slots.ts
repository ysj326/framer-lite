import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'

/**
 * 한 사용자(브라우저)가 동시에 가질 수 있는 최대 작업 슬롯 수.
 * 추후 회원 시스템 도입 시 서버 정책으로 대체될 예정이라 상수로 분리.
 */
export const MAX_SLOTS = 5

/** 슬롯 인덱스를 저장하는 localStorage 키. 각 슬롯 내용은 별도 키에 저장된다. */
export const SLOTS_STORAGE_KEY = 'framer-lite:slots'

/**
 * 작업 슬롯 메타데이터.
 * 프로젝트 본문(`Project` JSON)은 별도 키(`framer-lite:slot:{id}`)에 저장되고,
 * 이 store는 "어떤 슬롯들이 있는지 / 지금 어느 슬롯을 보고 있는지"만 관리한다.
 */
export interface SlotMeta {
  /** nanoid */
  id: string
  /** 사용자 표시용 이름 (예: "Landing 초안") */
  name: string
  /** 마지막 수정 시각 (epoch ms) — 목록 정렬/표시용 */
  updatedAt: number
}

/** localStorage에 직렬화되는 인덱스 형태 */
interface SlotsIndex {
  activeId: string | null
  slots: SlotMeta[]
}

/**
 * 저장된 JSON이 SlotsIndex 형태인지 런타임 검사.
 * 손상·구버전·타인이 덮어쓴 경우를 조용히 걸러낸다.
 */
const isSlotsIndex = (value: unknown): value is SlotsIndex => {
  if (value == null || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (!('activeId' in v) || !('slots' in v)) return false
  if (v.activeId !== null && typeof v.activeId !== 'string') return false
  if (!Array.isArray(v.slots)) return false
  return v.slots.every(
    (s) =>
      s != null &&
      typeof s === 'object' &&
      typeof (s as SlotMeta).id === 'string' &&
      typeof (s as SlotMeta).name === 'string' &&
      typeof (s as SlotMeta).updatedAt === 'number',
  )
}

/**
 * 다중 작업 슬롯 인덱스 스토어.
 *
 * 책임 범위:
 * - 슬롯 목록 / 활성 슬롯 id 관리
 * - 생성·삭제·선택·이름 변경·updatedAt 갱신
 * - localStorage 영속화 (mutation 직후 즉시 기록)
 *
 * 책임 범위 밖 (의도적):
 * - 슬롯 본문(`Project` JSON) 저장 — `useAutoSave`가 활성 슬롯 키로 관리
 * - 옛 단일 키 → 슬롯 1개 마이그레이션 — `useAutoSave`에서 처리
 */
export const useSlotsStore = defineStore('slots', () => {
  const activeId = ref<string | null>(null)
  const slots = ref<SlotMeta[]>([])

  /** 새 슬롯을 더 만들 수 있는지 (limit 기준) */
  const canCreate = computed<boolean>(() => slots.value.length < MAX_SLOTS)
  /** 현재 선택된 슬롯 메타 (없으면 null) */
  const activeSlot = computed<SlotMeta | null>(
    () => slots.value.find((s) => s.id === activeId.value) ?? null,
  )

  /**
   * 현재 상태를 localStorage에 기록한다.
   * 용량 초과 등 실패는 조용히 무시 (호출자 UI 책임).
   */
  const persist = (): void => {
    try {
      const payload: SlotsIndex = {
        activeId: activeId.value,
        slots: slots.value,
      }
      localStorage.setItem(SLOTS_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      /* QuotaExceeded 등 — 무시 */
    }
  }

  /**
   * localStorage에서 인덱스를 읽어 state에 반영한다.
   * 저장본이 없거나 손상되면 초기 상태를 유지한다 (에러 throw 없음).
   */
  const hydrate = (): void => {
    const raw = localStorage.getItem(SLOTS_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as unknown
      if (!isSlotsIndex(parsed)) return
      slots.value = parsed.slots
      activeId.value = parsed.activeId
    } catch {
      /* 손상 JSON — 초기 상태 유지 */
    }
  }

  /**
   * 새 슬롯을 만들고 바로 활성 슬롯으로 지정한다.
   * @param name 사용자 표시 이름
   * @throws limit(MAX_SLOTS) 도달 시
   */
  const createSlot = (name: string): SlotMeta => {
    if (!canCreate.value) {
      throw new Error(`슬롯이 가득 찼습니다 (최대 ${MAX_SLOTS}개).`)
    }
    const slot: SlotMeta = {
      id: nanoid(),
      name,
      updatedAt: Date.now(),
    }
    slots.value.push(slot)
    activeId.value = slot.id
    persist()
    return slot
  }

  /**
   * 슬롯을 목록에서 제거한다. 활성 슬롯을 제거하면 activeId는 null이 된다.
   * (호출자는 해당 슬롯의 본문 키도 별도로 지워야 한다.)
   */
  const removeSlot = (id: string): void => {
    slots.value = slots.value.filter((s) => s.id !== id)
    if (activeId.value === id) {
      activeId.value = null
    }
    persist()
  }

  /**
   * 활성 슬롯을 변경한다. 존재하지 않는 id는 조용히 무시.
   */
  const selectSlot = (id: string): void => {
    if (!slots.value.some((s) => s.id === id)) return
    activeId.value = id
    persist()
  }

  /**
   * 슬롯 이름을 변경하고 updatedAt을 현재 시각으로 갱신한다.
   * 존재하지 않는 id는 no-op.
   */
  const renameSlot = (id: string, name: string): void => {
    const slot = slots.value.find((s) => s.id === id)
    if (!slot) return
    slot.name = name
    slot.updatedAt = Date.now()
    persist()
  }

  /**
   * 활성 슬롯의 updatedAt을 현재 시각으로 갱신한다 (autoSave에서 호출).
   * 활성 슬롯이 없으면 no-op.
   */
  const touchActive = (): void => {
    const slot = slots.value.find((s) => s.id === activeId.value)
    if (!slot) return
    slot.updatedAt = Date.now()
    persist()
  }

  return {
    activeId,
    slots,
    canCreate,
    activeSlot,
    createSlot,
    removeSlot,
    selectSlot,
    renameSlot,
    touchActive,
    hydrate,
  }
})
