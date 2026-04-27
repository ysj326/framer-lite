# Framer-Lite 작업 체크리스트

> 본 문서는 git에 추적되는 **ground truth**입니다. Phase 완료 시 `[x]`로 토글하고 commit하세요.
> 세션 단위 진행 상황은 별도로 TodoWrite를 사용합니다.

## Phase 0 — 프로젝트 정리 & 기반 설치 ✅
- [x] starter 제거 (`HelloWorld.vue`, `TheWelcome.vue`, `WelcomeItem.vue`, `components/icons/`, `assets/*`)
- [x] Tailwind 제거 (`@tailwindcss/vite`, `tailwindcss`, `postcss`, `autoprefixer`)
- [x] `pinia`, `vue-router@4`, `sass-embedded` 설치
- [x] `src/styles/` 구조 생성 + `app.scss` + `common/_variables.scss`
- [x] 폴더 구조 생성 (stores/composables/components/editor{,/nodes}/preview/templates/types/utils/views/templates)
- [x] `router/index.ts` placeholder
- [x] `main.ts`: Pinia + Router + `app.scss` import
- [x] `App.vue`: `<RouterView />` 골격
- [x] `index.html` 타이틀 "Framer Lite"
- [x] `vite.config.ts`: vitest config 추가 (`vitest/config`의 `defineConfig` 사용)
- [x] `package.json scripts`: `test`, `test:run`
- [x] smoke test (`src/utils/sanity.spec.ts`)
- [x] `docs/CHECKLIST.md`, `docs/ARCHITECTURE.md` 생성
- **검증:** `npm run dev` placeholder 정상, `npm run test:run` 통과, `npm run type-check` 통과

## Phase 1 — 데이터 모델 & 기본 Store (TDD) ✅
- [x] `types/node.ts`, `types/project.ts`
- [x] `utils/nodeTree.ts` (`findById`, `getChildren`, `walk`, `addNode`, `removeNode`, `moveNode`, `cloneSubtree`)
- [x] `composables/useNodeFactory.ts` (Text/Image/Button/Frame/Shape 팩토리)
- [x] `stores/editor.ts` (Pinia setup store: 10 actions + 2 getters)
- **검증:** 4 test files / 50 tests passed, type-check 통과

## Phase 2 — Undo/Redo (history) (TDD) ✅
- [x] `stores/history.ts` (snapshot 기반 + coalesce 윈도우 500ms)
- [x] editor store 액션 ↔ history 연동 (mutating action에 commit, undo/redo/canUndo/canRedo 노출)
- [x] 연쇄 액션 coalesce 정책 (`updateNode`는 자동 `update-${id}` key)
- **검증:** 5 test files / 71 tests passed, type-check 통과 (+ `@types/lodash-es` devDep 추가)

## Phase 3 — 직렬화 / 자동 저장 / 파일 IO (TDD) ✅
- [x] `utils/serialize.ts` (`toJSON`, `fromJSON`, `CURRENT_VERSION`, migration 자리)
- [x] `utils/projectFile.ts` (`buildProjectBlob`, `downloadProject`, `readProjectFile`)
- [x] `composables/useAutoSave.ts` (debounce localStorage + restore + clear)
- [ ] 부팅 시 localStorage 복구 (App.vue 통합 — Phase 4에서 layout과 함께)
- [ ] Toolbar에 "JSON 다운로드"/"JSON 불러오기" (Phase 8에서 UI 연결)
- **검증:** 8 test files / 86 tests passed, type-check 통과

## Phase 4 — 라우팅 & 페이지 골격 ✅
- [x] `router/index.ts` 실제 View 컴포넌트로 교체 (`TemplatesView`/`EditorView`/`PreviewView`)
- [x] `EditorLayout.vue`: Topbar / Layers / Canvas / Properties 3-column 그리드 (placeholder 영역)
- [x] `EditorView`에서 `useAutoSave().restore()` 호출
- [x] `styles/structure/_layouts.scss` 도입 + `app.scss`에 `@use`
- **검증:** type-check 통과, 86 tests 유지, dev 서버 HMR 정상**

> 영역 컴포넌트(Toolbar/LayersPanel/Canvas/PropertiesPanel)는 후속 Phase에서 placeholder를 실제 컴포넌트로 교체

## Phase 5 — 캔버스 렌더링 ✅
- [x] `utils/nodePresentation.ts` (노드 → CSS 매핑)
- [x] 노드 타입별 컴포넌트 (`TextNode`/`ImageNode`/`ButtonNode`/`FrameNode`/`ShapeNode`)
- [x] `NodeRenderer.vue` (v-if 분기 + Frame slot 재귀 + self-recursive)
- [x] `Canvas.vue` (페이지 크기/배경 + 루트 노드 렌더)
- [x] `EditorLayout.vue` placeholder → Canvas 교체
- **검증:** 10 test files / 94 tests (Canvas 통합 4 추가), type-check 통과

## Phase 6 — 선택 / 드래그 / 리사이즈 (moveable) ✅
- [x] `composables/useNodeInteraction.ts` (isSelected + onClick)
- [x] 5개 노드 SFC에 data-node-id, @click, `.node--selected` 클래스
- [x] Canvas 빈 영역 클릭 → `select(null)`
- [x] `.node--selected` outline SCSS
- [x] `MoveableWrapper.vue` (moveable 인스턴스, target 갱신, drag/resize → `updateNode`)
- [x] drag/resize 중 history는 `update-${id}` coalesce로 1 history 단위 자동 묶임
- **검증:** 11 test files / 99 tests (선택 시나리오 5 추가), type-check 통과. moveable 런타임은 수동 브라우저 검증 필요

## Phase 7 — Layers 패널 & Properties 패널 ✅
- [x] `editor.reorder(id, delta)` 액션 (history commit + 5 tests)
- [x] `LayerItem.vue` (재귀, 트리 표시, 가시성 토글, ▲/▼ z-order)
- [x] `LayersPanel.vue` (페이지 루트 reverse 표시 — 위=z 위)
- [x] `composables/useNodeField.ts` (양방향 바인딩 helper)
- [x] `properties/CommonProperties.vue` (x/y/w/h/z/visible/bgColor/opacity)
- [x] `properties/TextProperties.vue` (content/color/fontSize/fontWeight)
- [x] `properties/ImageProperties.vue` (src/alt)
- [x] `properties/ButtonProperties.vue` (label/href)
- [x] `properties/ShapeProperties.vue` (variant/borderRadius)
- [x] `PropertiesPanel.vue` (선택 타입별 분기)
- [x] `EditorLayout` placeholder → LayersPanel/PropertiesPanel 교체
- **검증:** 12 test files / 112 tests, type-check 통과

## Phase 8 — Toolbar & 단축키 ✅ (순서 재조정으로 Phase 7보다 먼저 완료)
- [x] `editor.buildProject()` 메서드 (Save/AutoSave/Export 공유)
- [x] `composables/useShortcuts.ts` (Delete/Backspace, Cmd+D, Cmd+Z, Shift+Cmd+Z, Cmd↔Ctrl 호환)
- [x] 입력 포커스 중 단축키 무시 (input/textarea/contentEditable)
- [x] `Toolbar.vue` — 추가 5종 / Undo·Redo (canUndo/canRedo disabled) / Preview / Save JSON / Load JSON / Export HTML(disabled, Phase 11 예정)
- [x] EditorLayout placeholder Topbar → Toolbar 교체
- [x] EditorView setup에서 `useShortcuts()` 호출
- **검증:** 12 test files / 107 tests (단축키 8 추가), type-check 통과, dev 서버 HMR 정상

## Phase 9 — 템플릿 시스템 ✅
- [x] `templates/blank.json` (빈 페이지)
- [x] `templates/landing.json` (헤더 + 히어로 + CTA, 5 노드)
- [x] `templates/portfolio.json` (제목 + 카드 3개, 10 노드)
- [x] `TemplatesView.vue` 갤러리 카드 (preview/이름/설명, 클릭 → loadProject + /editor)
- **검증:** type-check 통과, 12 files / 112 tests 유지

## Phase 10 — 미리보기 (Desktop / Mobile Viewport) ✅
- [x] `components/preview/PreviewCanvas.vue` (NodeRenderer 재사용 + pointer-events 차단 + selection outline 제거)
- [x] `components/preview/ViewportFrame.vue` (지정 폭 + 가로 스크롤)
- [x] `views/PreviewView.vue` (Back 버튼 + Desktop/Mobile 토글, onMounted에 select(null))
- **검증:** type-check 통과, 12 files / 112 tests 유지

## Phase 11 — HTML Export ✅
- [x] `utils/download.ts` (downloadBlob/safeFilename 공통)
- [x] `utils/projectFile.ts` 리팩터 — downloadBlob 재사용
- [x] `utils/htmlExport.ts` (`<style>` + `.node-<id>` class, type별 마크업, HTML/Attr escape, ellipse → 50% radius)
- [x] `htmlExport.spec.ts` 11 tests (Frame nesting, escape, button href 분기, image src/alt, visible→display none 등)
- [x] Toolbar "Export HTML" 활성화 → `downloadHtml`
- **검증:** 13 test files / 123 tests passed, type-check 통과

## Phase 12 — 마무리 & 문서 ✅
- [x] 빈 상태 메시지 (LayersPanel/PropertiesPanel/TemplatesView 이미 보유)
- [x] 단축키 헬프 모달 (`ShortcutsHelp.vue`, Toolbar `?` 버튼, ESC/backdrop 닫기)
- [x] `README.md` 갱신 (소개·시작·단축키·구조·데이터 모델·Export·MVP 외 한계)
- [x] SCSS deprecation 정리 (`lighten()` → `rgba($primary, 0.1)`)
- [ ] 전체 회귀 수동 시나리오 (사용자 검증)
- **에러 토스트**: 후순위로 미루고 README 한계 섹션에 명시
- **검증:** 13 test files / 123 tests, type-check 통과, **production build 성공** (HTML 0.43 KB / CSS 10.35 KB / JS 384 KB · 130 KB gzip)

## Phase 13–18 (별도 commit으로 진행된 작업 — 역반영)
- [x] Phase 13–14: TDD 보강 (초기 커밋에 포함)
- [x] Phase 15: 다중 슬롯 시스템 (프로젝트 저장 공간 최대 5개) + Confirm/SlotPicker 모달
- [x] Phase 16: Text/Button 더블클릭 인플레이스 편집
- [x] Phase 17: 키보드 nudge + z-order 단축키
- [x] Phase 18: 노드 회전(rotation) 지원

## Phase 19a — 컴포넌트 심볼 시스템 (핵심 모델)
- [x] `Master` 타입 + `Project.masters` 필드 + `InstanceNode` NodeType
- [x] `masterFactory` 순수 헬퍼 (uniqueMasterName, collectSubtree, buildMasterFromFrame)
- [x] `EditorSnapshot`에 masters 포함 → undo/redo 대응
- [x] `editor.createComponent(frameId)` 액션 (history 단일 단위 커밋)
- [x] 직렬화 masters 왕복 + 구버전 JSON 마이그레이션 + 손상 master 드롭 (sanitizeMasters)
- [x] HTML export — Instance inline expand + master 하위 노드 CSS 방출 + rootFrame style 계승 + missing master 주석 fallback
- [x] `InstanceNode.vue` + `MasterSubtree.vue` 렌더 (master.nodes scope 주입)
- [x] `NodeRenderer`에 instance 분기
- [x] `LayerItem` Instance leaf 표시 + ◆ 아이콘
- [x] `PropertiesPanel` "Create Component" 버튼 (Frame 한정)
- [x] `useShortcuts` `Cmd/Ctrl+Alt+K`
- [x] tsc --noEmit PASS / vitest 전체 PASS / production build 성공
- [ ] 수동 회귀 (사용자 브라우저 확인) — Frame 생성 → Create Component → 시각 동일 → undo/redo → drag/resize → save/load → HTML export

> **스펙 문서:** `docs/superpowers/specs/2026-04-24-phase-19a-component-symbol-core-design.md`
> **플랜 문서:** `docs/superpowers/plans/2026-04-24-phase-19a-component-symbol-core.md`
> **범위 밖 (후속 Phase):** override (19b), 다중 선택 심볼화 (19c), Assets 패널 + 우클릭 메뉴 (19d), Variants (19e, 선택), Nesting (19f, 선택)
