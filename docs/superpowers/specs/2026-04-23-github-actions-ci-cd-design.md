# GitHub Actions CI/CD 자동화 설계 문서

- **작성일**: 2026-04-23
- **대상 저장소**: [ysj326/framer-lite](https://github.com/ysj326/framer-lite)
- **배포 URL**: https://ysj326.github.io/framer-lite/
- **상태**: 설계 승인됨 (구현 계획 작성 대기)

## 1. 목표

feature 브랜치 기반 개발 워크플로우를 GitHub Actions로 자동화한다.

- feature 브랜치에서 작업 후 `main` 브랜치로 Pull Request 생성
- PR 생성·업데이트 시: 타입 체크 · 테스트 · 빌드 자동 실행 (머지 차단 게이트)
- PR이 `main`으로 머지되면: Vite 빌드 산출물을 GitHub Pages로 자동 배포

## 2. 결정 사항 요약

| 항목 | 결정 | 근거 |
|---|---|---|
| 빌드 도구 | **Vite 유지** | 이미 Vite 8.x 기반 (`vite.config.ts`). Webpack 마이그레이션은 이득 없음 |
| Pages 배포 방식 | **GitHub Actions 공식** (`actions/deploy-pages`) | 공식 권장, 별도 `gh-pages` 브랜치 불필요 |
| PR CI 범위 | type-check + test:run + build | ESLint는 후속 과제로 별도 추가 |
| 브랜치 네이밍 | **Conventional prefix**: `feat_`, `fix_`, `refactor_`, `docs_`, `test_`, `chore_` | 이모지 입력 번거로움 회피, 업계 표준 |
| main 보호 | 보호 규칙 **설정 안내만** 문서화 | 레포 Settings은 코드로 관리 불가 → 절차 문서화 |

## 3. 아키텍처

```
┌─────────────────┐     push     ┌─────────────────┐
│ feature 브랜치  │ ───────────► │  원격 브랜치    │
│ (feat_xxx 등)   │              └────────┬────────┘
└─────────────────┘                       │
                                          │ PR 생성
                                          ▼
                              ┌───────────────────────┐
                              │  ci.yml 자동 실행     │
                              │  - type-check         │
                              │  - test:run           │
                              │  - build              │
                              └───────────┬───────────┘
                                          │ 통과 + 리뷰 승인
                                          ▼
                              ┌───────────────────────┐
                              │   main 머지 (squash)  │
                              └───────────┬───────────┘
                                          │ push 이벤트
                                          ▼
                              ┌───────────────────────┐
                              │  deploy.yml 자동 실행 │
                              │  - vite build         │
                              │  - upload artifact    │
                              │  - deploy-pages       │
                              └───────────┬───────────┘
                                          ▼
                           https://ysj326.github.io/framer-lite/
```

### 워크플로우를 2개로 분리한 이유
- **관심사 분리**: CI(검증)와 CD(배포)는 트리거 · 권한 · 실패 시 영향 범위가 다름
- **권한 최소화**: CI는 read-only, Deploy만 `pages: write`, `id-token: write` 부여
- **실패 추적성**: 실패 원인이 검증인지 배포인지 한눈에 구분

## 4. 산출물

| # | 파일 | 종류 | 설명 |
|---|---|---|---|
| 1 | `.github/workflows/ci.yml` | 신규 | PR 시 type-check + test + build |
| 2 | `.github/workflows/deploy.yml` | 신규 | main merge 시 Pages 배포 |
| 3 | `vite.config.ts` | 수정 | `base: '/framer-lite/'` 추가 |
| 4 | `CONTRIBUTING.md` | 신규 | 브랜치 · PR 컨벤션 + Repo Settings 가이드 |

## 5. 워크플로우 상세 명세

### 5.1 `.github/workflows/ci.yml`

- **이름**: `CI`
- **트리거**: `pull_request`, branches: `[main]`
- **permissions**: `contents: read` (기본 최소 권한)
- **동시성**: `group: ci-${{ github.ref }}`, `cancel-in-progress: true`
- **Job: `build-and-test`**
  - runs-on: `ubuntu-latest`
  - steps:
    1. `actions/checkout@v4`
    2. `actions/setup-node@v4` — `node-version: 22`, `cache: 'npm'`
    3. `npm ci`
    4. `npm run type-check`
    5. `npm run test:run`
    6. `npm run build`

### 5.2 `.github/workflows/deploy.yml`

- **이름**: `Deploy to GitHub Pages`
- **트리거**: `push` to `main`, `workflow_dispatch`
- **permissions**: `contents: read`, `pages: write`, `id-token: write`
- **동시성**: `group: pages`, `cancel-in-progress: false` (진행 중 배포 보호)
- **Job 1: `build`**
  - steps:
    1. checkout
    2. setup-node (v22, npm cache)
    3. `npm ci`
    4. `npm run build`
    5. `actions/configure-pages@v5`
    6. `actions/upload-pages-artifact@v3` with `path: ./dist`
- **Job 2: `deploy`**
  - `needs: build`
  - environment: `github-pages` (URL: `${{ steps.deployment.outputs.page_url }}`)
  - steps: `actions/deploy-pages@v4`

### 5.3 `vite.config.ts` 수정

```ts
export default defineConfig({
  base: '/framer-lite/',  // GitHub Pages subpath
  plugins: [ ... ],
  // ... 기존 설정 유지
})
```

> ⚠️ 로컬 `npm run dev`에는 영향이 있을 수 있으니 검증 필요 (`dev` 스크립트가 base 경로를 적용하는지 확인).

## 6. CONTRIBUTING.md 구성

1. **개요** — 이 문서의 목적
2. **브랜치 전략**
   - 브랜치 prefix 표 (feat / fix / refactor / docs / test / chore)
   - 네이밍 예시
3. **PR 규칙**
   - base: `main`
   - CI 통과 필수 (type-check · test · build)
   - 머지 방식: Squash 권장
4. **커밋 메시지 컨벤션** (선택) — 기존 `:tada:` gitmoji 스타일 유지 시 간단 가이드
5. **Repo Settings 초기 설정 가이드**
   - GitHub Pages Source: `GitHub Actions`
   - Branch protection rule (`main`):
     - Require pull request before merging
     - Require status checks to pass: `build-and-test`
     - Require branches to be up to date
     - Do not allow bypassing

## 7. 에러 처리 · 엣지 케이스

| 시나리오 | 동작 |
|---|---|
| CI 단계 실패 | PR 상태 체크 실패 → 머지 차단 |
| 배포 빌드 실패 | 이전 Pages 버전 유지 (`deploy-pages` 기본 동작) |
| 동시 배포 충돌 | `concurrency: pages` 그룹으로 직렬화 |
| Node 버전 불일치 | `package.json` engines (`^22.12.0`)와 workflow `node-version: 22` 정합 |
| `base` 경로 미설정 시 | Pages에서 asset 404 발생 — 반드시 `vite.config.ts` 수정 필요 |

## 8. 테스트 전략

- **사전 검증**: 로컬에서 `npm run build` 성공 확인 후 커밋
- **CI 검증**: 실제 PR을 띄워 두 워크플로우가 실패 없이 통과하는지 확인
- **배포 검증**: main 머지 후 `https://ysj326.github.io/framer-lite/` 접속하여
  - index.html 로드
  - JS · CSS 자산 404 없음
  - 라우터 동작 (SPA의 경우 404 처리 고려 — 후속 과제)

## 9. 범위 외 (YAGNI / 후속 과제)

- ESLint 설정 및 CI 통합 — 사용자가 별도로 설정 예정
- Vue Router history 모드에서 SPA fallback (404.html 트릭) — 필요 시 후속 작업
- Lighthouse / 성능 체크 자동화
- PR 라벨링, Auto-merge, Dependabot 연동
- Preview 배포 (PR별 임시 URL)

## 10. 참고 자료

- [GitHub Actions: Deploying to GitHub Pages](https://docs.github.com/ko/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [actions/deploy-pages](https://github.com/actions/deploy-pages)
- [Vite: `base` 옵션](https://vite.dev/config/shared-options.html#base)
