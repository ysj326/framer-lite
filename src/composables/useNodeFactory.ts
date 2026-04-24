import { nanoid } from 'nanoid'
import type {
  ButtonNode,
  FrameNode,
  ImageNode,
  NodeStyle,
  ShapeNode,
  TextNode,
} from '@/types/node'

/**
 * 모든 노드 팩토리에 공통으로 적용되는 옵션.
 * 미지정 필드는 노드 타입별 기본값으로 채워진다.
 */
export interface BaseNodeOptions {
  /** Layers 패널 표시 이름. 미지정 시 타입별 기본값 사용 */
  name?: string
  /** 부모 노드 id 또는 null(페이지 직속). 기본 null */
  parentId?: string | null
  /** 부모 기준 x 좌표 (px). 기본 0 */
  x?: number
  /** 부모 기준 y 좌표 (px). 기본 0 */
  y?: number
  /** 가로 크기 (px). 미지정 시 타입별 기본값 사용 */
  width?: number
  /** 세로 크기 (px). 미지정 시 타입별 기본값 사용 */
  height?: number
  /** 회전 각도(도). 기본 0 */
  rotation?: number
  /** z-order. 기본 0 */
  zIndex?: number
  /** 시각 스타일. 기본 빈 객체 */
  style?: NodeStyle
}

/** 노드 타입별 기본 크기/이름 */
interface TypeDefaults {
  name: string
  width: number
  height: number
}

/**
 * 모든 노드의 공통 필드를 채운 객체를 만든다.
 * 호출자가 노드 타입 고유 필드(`type`, `data`)를 덧붙여 완성한다.
 * @param opts 사용자 옵션
 * @param defaults 노드 타입별 기본값(이름·크기)
 * @returns BaseNode 형태의 공통 필드
 */
const createBaseFields = (opts: BaseNodeOptions, defaults: TypeDefaults) => ({
  id: nanoid(),
  name: opts.name ?? defaults.name,
  parentId: opts.parentId ?? null,
  childIds: [] as string[],
  x: opts.x ?? 0,
  y: opts.y ?? 0,
  width: opts.width ?? defaults.width,
  height: opts.height ?? defaults.height,
  rotation: opts.rotation ?? 0,
  zIndex: opts.zIndex ?? 0,
  visible: true,
  locked: false,
  style: opts.style ?? {},
})

/** Text 노드 옵션 */
export interface TextNodeOptions extends BaseNodeOptions {
  /** 표시 텍스트 (기본 'Text') */
  content?: string
}

/**
 * Text 노드 생성.
 * @param opts 옵션
 * @returns TextNode
 */
export const createTextNode = (opts: TextNodeOptions = {}): TextNode => ({
  ...createBaseFields(opts, { name: 'Text', width: 200, height: 32 }),
  type: 'text',
  data: { content: opts.content ?? 'Text' },
})

/** Image 노드 옵션 */
export interface ImageNodeOptions extends BaseNodeOptions {
  /** 이미지 src (기본 빈 문자열) */
  src?: string
  /** 대체 텍스트 (기본 빈 문자열) */
  alt?: string
}

/**
 * Image 노드 생성.
 * @param opts 옵션
 * @returns ImageNode
 */
export const createImageNode = (opts: ImageNodeOptions = {}): ImageNode => ({
  ...createBaseFields(opts, { name: 'Image', width: 240, height: 160 }),
  type: 'image',
  data: { src: opts.src ?? '', alt: opts.alt ?? '' },
})

/** Button 노드 옵션 */
export interface ButtonNodeOptions extends BaseNodeOptions {
  /** 버튼 라벨 (기본 'Button') */
  label?: string
  /** 링크 URL (기본 빈 문자열 = 링크 없음) */
  href?: string
}

/**
 * Button 노드 생성.
 * @param opts 옵션
 * @returns ButtonNode
 */
export const createButtonNode = (opts: ButtonNodeOptions = {}): ButtonNode => ({
  ...createBaseFields(opts, { name: 'Button', width: 120, height: 40 }),
  type: 'button',
  data: { label: opts.label ?? 'Button', href: opts.href ?? '' },
})

/**
 * Frame 노드 생성. 자식 컨테이너 역할.
 * @param opts 옵션
 * @returns FrameNode
 */
export const createFrameNode = (opts: BaseNodeOptions = {}): FrameNode => ({
  ...createBaseFields(opts, { name: 'Frame', width: 320, height: 240 }),
  type: 'frame',
  data: {},
})

/** Shape 노드 옵션 */
export interface ShapeNodeOptions extends BaseNodeOptions {
  /** 도형 종류 (기본 'rect') */
  variant?: 'rect' | 'ellipse'
}

/**
 * Shape 노드 생성.
 * @param opts 옵션
 * @returns ShapeNode
 */
export const createShapeNode = (opts: ShapeNodeOptions = {}): ShapeNode => ({
  ...createBaseFields(opts, { name: 'Shape', width: 120, height: 120 }),
  type: 'shape',
  data: { variant: opts.variant ?? 'rect' },
})
