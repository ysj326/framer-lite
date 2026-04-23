/**
 * 노드의 시각 스타일 속성 (공통).
 * 모든 필드는 선택적이며, 미지정 시 기본 렌더 동작을 따른다.
 */
export interface NodeStyle {
  /** 배경색 (CSS color) */
  backgroundColor?: string
  /** 글자색 (CSS color) */
  color?: string
  /** 폰트 크기 (px) */
  fontSize?: number
  /** 폰트 두께 (예: 400, 700, 'bold') */
  fontWeight?: number | string
  /** 모서리 둥글기 (px) */
  borderRadius?: number
  /** 투명도 (0~1) */
  opacity?: number
}

/**
 * 모든 노드가 공유하는 공통 필드.
 * 좌표/크기는 부모 기준이며, 페이지 직속 노드는 페이지 좌표계를 사용한다.
 */
export interface BaseNode {
  /** nanoid로 생성된 고유 식별자 */
  id: string
  /** Layers 패널에 표시될 이름 */
  name: string
  /** 부모 노드 id. null이면 페이지 루트 직속 */
  parentId: string | null
  /** Frame 노드만 의미를 가진다. 그 외 타입은 항상 빈 배열 */
  childIds: string[]
  /** 부모 기준 x 좌표 (px) */
  x: number
  /** 부모 기준 y 좌표 (px) */
  y: number
  /** 가로 크기 (px) */
  width: number
  /** 세로 크기 (px) */
  height: number
  /** 같은 부모 안에서의 쌓임 순서 (배열 순서 보조) */
  zIndex: number
  /** 캔버스/미리보기에서 보일지 여부 */
  visible: boolean
  /** 잠금 상태 (true면 선택/이동 불가) */
  locked: boolean
  /** 시각 스타일 */
  style: NodeStyle
}

/** Text 노드 — 본문 텍스트 표시 */
export interface TextNode extends BaseNode {
  type: 'text'
  data: {
    /** 표시할 텍스트 (줄바꿈은 \n) */
    content: string
  }
}

/** Image 노드 — 이미지 표시 */
export interface ImageNode extends BaseNode {
  type: 'image'
  data: {
    /** 이미지 src (URL 또는 data URI) */
    src: string
    /** 대체 텍스트 */
    alt: string
  }
}

/** Button 노드 — 클릭 시 링크로 이동 */
export interface ButtonNode extends BaseNode {
  type: 'button'
  data: {
    /** 버튼 라벨 */
    label: string
    /** 이동할 URL (빈 문자열이면 링크 없음) */
    href: string
  }
}

/** Frame 노드 — 자식 노드를 담는 컨테이너 */
export interface FrameNode extends BaseNode {
  type: 'frame'
  data: Record<string, never>
}

/** Shape 노드 — 사각형/타원 등 단색 도형 */
export interface ShapeNode extends BaseNode {
  type: 'shape'
  data: {
    /** 도형 종류 */
    variant: 'rect' | 'ellipse'
  }
}

/**
 * 애플리케이션에서 다루는 모든 노드의 합집합 타입.
 * `type` 필드로 narrowing 가능하다.
 */
export type AppNode = TextNode | ImageNode | ButtonNode | FrameNode | ShapeNode

/** 노드 타입 리터럴 */
export type NodeType = AppNode['type']
