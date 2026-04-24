import type { Project } from '@/types/project'

/**
 * 현재 직렬화 스키마 버전.
 * 데이터 모델이 변경되면 이 값을 올리고 `migrate()`에 분기를 추가한다.
 */
export const CURRENT_VERSION = 1 as const

/**
 * Project를 JSON 문자열로 직렬화한다.
 * `version` 필드는 항상 CURRENT_VERSION으로 강제 설정한다.
 * @param project 직렬화할 프로젝트
 * @returns JSON 문자열
 */
export const toJSON = (project: Project): string => {
  const normalized = { ...project, version: CURRENT_VERSION }
  return JSON.stringify(normalized)
}

/**
 * JSON 문자열을 Project로 역직렬화한다.
 * 잘못된 형식이거나 필수 필드가 없으면 null을 반환한다.
 * 향후 구버전 데이터는 `migrate()`에서 처리된다.
 * @param raw JSON 문자열
 * @returns Project 또는 null
 */
export const fromJSON = (raw: string): Project | null => {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isProjectShape(parsed)) return null
  return migrate(parsed)
}

/**
 * 파싱된 객체가 Project의 최소 골격을 갖는지 검증한다.
 * 깊은 검증은 하지 않는다(개별 노드 형태는 호출자/렌더가 방어).
 * @param value 임의 값
 * @returns 골격 일치 여부
 */
const isProjectShape = (value: unknown): value is Project => {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.version === 'number' &&
    typeof obj.name === 'string' &&
    typeof obj.page === 'object' && obj.page !== null &&
    typeof obj.nodes === 'object' && obj.nodes !== null &&
    typeof obj.updatedAt === 'number'
  )
}

/**
 * 구버전 Project 데이터를 현재 스키마에 맞게 변환한다.
 * 향후 마이그레이션이 필요해지면 version별 분기를 여기에 추가한다.
 * @param project 파싱된 프로젝트(어떤 버전이어도 무방)
 * @returns 현재 스키마에 부합하는 Project
 */
const migrate = (project: Project): Project => {
  const raw = project as unknown as Record<string, unknown>
  return {
    ...project,
    version: CURRENT_VERSION,
    masters: (raw.masters && typeof raw.masters === 'object') ? project.masters ?? {} : {},
  }
}
