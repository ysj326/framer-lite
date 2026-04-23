# Framer-Lite 아키텍처

## 목적

Framer(framer.com) 스타일 노드 기반 자유 배치 비주얼 웹 에디터. **블록 에디터가 아닌** 노드 캔버스 에디터.

흐름: 템플릿 선택 → 캔버스 → 요소 추가/이동/리사이즈/속성 편집 → 미리보기 → HTML export.

## 핵심 결정

| 항목 | 결정 |
|---|---|
| 빌드/런타임 | Vue 3.5 + Vite 8 + TypeScript 6 |
| 상태 관리 | Pinia |
| 라우팅 | Vue Router 4 |
| 스타일 | SCSS만 사용 (Tailwind 제거) |
| 드래그/리사이즈 | moveable |
| ID 생성 | nanoid |
| 저장 | localStorage 자동 + JSON 파일 수동 |
| Undo/Redo | 포함 (history store) |
| Mobile 미리보기 | Viewport 축소 프레임 (375px) |
| HTML export | `<style>` 블록 + class 방식 |
| 테스트 | TDD 전면 적용 (vitest + @vue/test-utils + happy-dom) |

## 데이터 모델

```ts
type NodeType = 'text' | 'image' | 'button' | 'frame' | 'shape'

interface BaseNode {
  id: string                 // nanoid
  type: NodeType
  name: string               // Layers 패널 표시용
  parentId: string | null    // null = 페이지 직속
  childIds: string[]         // Frame만 의미 있음
  x: number; y: number       // 부모 기준 좌표
  width: number; height: number
  zIndex: number
  visible: boolean
  locked: boolean
  style: Partial<NodeStyle>  // 폰트 크기, 글자색, 배경색 등
  data: NodeTypeData         // 타입별: text, src, href 등
}

interface Page {
  id: string
  name: string
  width: number              // desktop canvas width
  height: number
  background: string
  rootIds: string[]          // 페이지 루트 노드들
}

interface Project {
  version: 1
  name: string
  page: Page                 // MVP: 단일 페이지
  nodes: Record<string, BaseNode>
  updatedAt: number
}
```

> 노드는 **`Record<id, Node>` 평면 저장 + `parentId`/`childIds` 트리 참조**.
> 평면화는 history(undo/redo) 스냅샷·patch와 Layers 트리 렌더 모두에 유리.

## 폴더 구조

```
src/
  main.ts                    # 진입점
  App.vue                    # RouterView 래퍼
  router/index.ts
  stores/
    editor.ts                # nodes, selection, viewport, page meta
    history.ts               # undo/redo 스택
    project.ts               # 메타데이터, save/load 트리거
  composables/
    useAutoSave.ts           # debounce localStorage 저장
    useShortcuts.ts          # Delete, Cmd+D, Cmd+Z 등
    useNodeFactory.ts        # 타입별 기본 노드 생성
  components/
    editor/
      EditorLayout.vue
      Toolbar.vue
      Canvas.vue
      LayersPanel.vue
      PropertiesPanel.vue
      MoveableWrapper.vue
      nodes/
        TextNode.vue
        ImageNode.vue
        ButtonNode.vue
        FrameNode.vue
        ShapeNode.vue
    preview/
      PreviewView.vue
      ViewportFrame.vue
    templates/
      TemplateGallery.vue
      TemplateCard.vue
  views/
    TemplatesView.vue
    EditorView.vue
    PreviewView.vue
  templates/                 # 정적 JSON
    blank.json
    landing.json
    portfolio.json
  types/
    node.ts
    project.ts
  utils/
    serialize.ts             # JSON ↔ Project + version migration
    htmlExport.ts            # 트리 → HTML 문자열
    nodeTree.ts              # 트리 순회/조작 헬퍼
  styles/
    app.scss                 # entry, 전역
    common/
      _variables.scss        # 색상, theme, spacing, z-index, header/footer 높이
      components/
        _forms.scss
        _nav.scss
        _progress.scss
    pages/
      <페이지명>.scss        # 페이지별 커스텀
    plugins/                 # 플러그인 스타일 오버라이드
    structure/
      _layouts.scss
      _topbar.scss
      _footer.scss
```

## 스타일 가이드

- 컴포넌트 SFC는 `<style lang="scss" scoped>` + 필요 시 `@use '@/styles/common/variables' as *;` 명시 import
- 변수/믹스인 자동 주입(`additionalData`) **사용하지 않음** (Sass 모듈 시스템 권장 방식)
- 캔버스 위 사용자 노드 스타일은 데이터 모델(`style` 객체)로 보관 → export 시 CSS class로 변환

## 테스트 계층

| 계층 | 도구 | 대상 |
|---|---|---|
| 유닛 | vitest | `utils/*`, `composables/*`, `stores/*` |
| 컴포넌트 | @vue/test-utils + happy-dom | `PropertiesPanel`, `LayersPanel` 등 |
| 통합 | vitest | "add → drag → undo → redo", "JSON 왕복" 등 시나리오 |
| 수동 | — | moveable 인터랙션, export HTML 시각 |

TDD: **Red → Green → Refactor** 사이클로 모든 신규 기능 구현.

## 코드 스타일 규칙

별도 사용자 메모리에 정의되어 있다. 핵심:
- ES6+, `const` 우선
- 함수는 단일 책임, 50줄 이하
- 모든 함수·변수 선언에 **JSDoc 주석**
- 변경 시 기존 코드 최대한 유지, 변경 범위 최소화
- 출력은 변경된 코드만(가능하면 diff)
