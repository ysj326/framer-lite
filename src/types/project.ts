import type { AppNode } from './node'
import type { Master } from './master'

/**
 * 단일 페이지 메타데이터.
 * MVP에서는 프로젝트당 페이지 하나만 존재한다.
 */
export interface Page {
  /** 페이지 id (nanoid) */
  id: string
  /** 표시 이름 */
  name: string
  /** Desktop 캔버스 가로 (px) */
  width: number
  /** Desktop 캔버스 세로 (px) */
  height: number
  /** 페이지 배경색 (CSS color) */
  background: string
  /**
   * 페이지 직속 노드 id 목록.
   * 배열 순서가 z-order의 진실(source of truth)이며,
   * `BaseNode.zIndex`는 동일 부모 내 보조/캐시값으로 사용된다.
   */
  rootIds: string[]
}

/**
 * 직렬화·저장 단위가 되는 프로젝트 전체 스냅샷.
 * `version`은 향후 스키마 마이그레이션 분기에 사용된다.
 */
export interface Project {
  /** 스키마 버전 (현재 1) */
  version: 1
  /** 프로젝트 이름 (저장 시 파일명에도 사용) */
  name: string
  /** 페이지 메타 (MVP는 1개) */
  page: Page
  /** 모든 노드의 평면 저장소 (id 기반 조회) */
  nodes: Record<string, AppNode>
  /** 재사용 컴포넌트 정의 맵. 구버전 JSON 로드 시 빈 객체로 기본값 주입 */
  masters: Record<string, Master>
  /** 마지막 갱신 시각 (Date.now()) */
  updatedAt: number
}
