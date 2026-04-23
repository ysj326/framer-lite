# GitHub Actions CI/CD 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** feature 브랜치 → PR → main 머지 → GitHub Pages 자동 배포 파이프라인을 구축한다.

**Architecture:** 워크플로우 2개로 분리 — `ci.yml`(PR 검증), `deploy.yml`(main 머지 시 Pages 배포). `vite.config.ts`에 `base` 경로를 설정하고, 브랜치/PR 규약을 `CONTRIBUTING.md`로 문서화한다. 이 작업 자체를 설계한 워크플로우(feature 브랜치 → PR → merge)로 실행해 self-referential하게 검증한다.

**Tech Stack:** GitHub Actions, Vite 8.x, Node 22.x, `actions/deploy-pages@v4`, `actions/upload-pages-artifact@v3`.

**Spec:** [docs/superpowers/specs/2026-04-23-github-actions-ci-cd-design.md](../specs/2026-04-23-github-actions-ci-cd-design.md)

## 파일 구조

| 파일 | 변경 유형 | 책임 |
|---|---|---|
| `.github/workflows/ci.yml` | 신규 | PR 검증 (type-check · test · build) |
| `.github/workflows/deploy.yml` | 신규 | main → Pages 배포 |
| `vite.config.ts` | 수정 | `base: '/framer-lite/'` 추가 |
| `CONTRIBUTING.md` | 신규 | 브랜치/PR 컨벤션 + Repo Settings 가이드 |

## 검증 전략 (TDD 대체)

YAML 워크플로우는 단위 테스트가 의미 없다. 대신 각 단계마다:

1. **로컬 검증**: `npm run build` 성공, `dist/` 내 경로 prefix 확인
2. **원격 검증**: 실제 PR 생성 → CI 통과 확인 → merge → Deploy 완료 확인
3. **시각 검증**: 배포 URL 접속 → 404 없이 렌더링

---

### Task 1: 작업 브랜치 생성

**Files:**
- N/A (git 조작만)

- [ ] **Step 1: 현재 상태 확인**

```bash
git status
git branch --show-current
```

Expected: `main` 브랜치, clean working tree

- [ ] **Step 2: feature 브랜치 생성 및 체크아웃**

```bash
git checkout -b feat_github-actions-setup
```

Expected: `Switched to a new branch 'feat_github-actions-setup'`

---

### Task 2: Vite base 경로 설정

**Files:**
- Modify: [vite.config.ts](vite.config.ts)

- [ ] **Step 1: 현재 `vite.config.ts` 확인**

Read: [vite.config.ts:8-22](vite.config.ts)

현재 `defineConfig({...})` 객체에 `base` 키가 없어야 한다.

- [ ] **Step 2: `base` 옵션 추가**

`plugins` 위에 한 줄 추가:

```ts
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  base: '/framer-lite/',
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
})
```

- [ ] **Step 3: 빌드 검증**

```bash
npm run build
```

Expected: 빌드 성공, `dist/` 디렉토리 생성

- [ ] **Step 4: asset 경로 prefix 확인**

```bash
grep -o '/framer-lite/assets/[^"]*' dist/index.html | head -3
```

Expected: `/framer-lite/assets/index-xxx.js` 형태 출력 (prefix가 적용됨)

- [ ] **Step 5: 로컬 dev 서버 정상 동작 확인 (선택)**

```bash
npm run dev
```

Expected: dev 서버 기동. 브라우저 `http://localhost:5173/framer-lite/` 또는 redirect 후 접속 확인. Ctrl+C로 종료.

- [ ] **Step 6: 커밋**

```bash
git add vite.config.ts
git commit -m ":wrench: chore(vite): GitHub Pages 배포용 base 경로 설정

base: '/framer-lite/' 추가. Pages subpath에서 asset 경로 정상 동작.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: CI 워크플로우 작성

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: `ci.yml` 작성**

Create `.github/workflows/ci.yml` with exact content:

```yaml
name: CI

on:
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build-and-test:
    name: build-and-test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run type-check

      - name: Unit test
        run: npm run test:run

      - name: Build
        run: npm run build
```

- [ ] **Step 3: YAML 문법 간이 검증**

```bash
node -e "const yaml=require('js-yaml');const fs=require('fs');yaml.load(fs.readFileSync('.github/workflows/ci.yml','utf8'));console.log('OK')" 2>/dev/null || python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo "YAML OK"
```

Expected: `YAML OK` 출력 (문법 에러 없음). 둘 다 없으면 건너뛰고 Step 4로.

- [ ] **Step 4: 커밋**

```bash
git add .github/workflows/ci.yml
git commit -m ":construction_worker: ci: PR 검증 워크플로우 추가

pull_request 트리거로 type-check + test:run + build 실행.
동시성 그룹으로 동일 ref 진행 중 job은 취소.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Deploy 워크플로우 작성

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: `deploy.yml` 작성**

Create `.github/workflows/deploy.yml` with exact content:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: YAML 문법 간이 검증**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))" && echo "YAML OK"
```

Expected: `YAML OK`

- [ ] **Step 3: 커밋**

```bash
git add .github/workflows/deploy.yml
git commit -m ":rocket: ci: main 머지 시 GitHub Pages 자동 배포

push to main 또는 workflow_dispatch 트리거로 vite build → upload-pages-artifact → deploy-pages.
concurrency 'pages' 그룹으로 진행 중 배포 보호.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: CONTRIBUTING.md 작성

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: `CONTRIBUTING.md` 작성**

Create `CONTRIBUTING.md` with exact content:

````markdown
# Contributing to framer-lite

이 문서는 framer-lite 저장소에서 작업할 때 따르는 브랜치·PR·배포 규약을 정리한다.

## 1. 브랜치 전략

- 기본 브랜치: `main` (보호됨, 직접 push 금지)
- 작업은 항상 **feature 브랜치**에서 수행한 뒤 PR로 `main`에 합친다.

### 브랜치 네이밍

`<prefix>_<작업명-kebab-case>` 형식을 사용한다.

| Prefix | 용도 | 예시 |
|---|---|---|
| `feat_` | 새 기능 | `feat_add-login` |
| `fix_` | 버그 수정 | `fix_button-crash` |
| `refactor_` | 리팩토링 | `refactor_store-split` |
| `docs_` | 문서 | `docs_readme-update` |
| `test_` | 테스트 | `test_auth-spec` |
| `chore_` | 기타(의존성·설정 등) | `chore_deps-upgrade` |

## 2. 커밋 메시지

gitmoji + 한국어 요약 스타일을 유지한다.

```
:sparkles: feat: 로그인 기능 추가

- 이메일/비밀번호 입력 폼
- Pinia store에 authState 추가
```

주요 gitmoji: `:sparkles:`(feat) `:bug:`(fix) `:recycle:`(refactor) `:memo:`(docs) `:white_check_mark:`(test) `:wrench:`(chore) `:construction_worker:`(ci) `:rocket:`(deploy)

## 3. PR 규칙

- **Base**: `main`
- **제목**: 커밋 메시지 스타일과 동일
- **머지 방식**: **Squash and merge** 권장 (히스토리 단순화)
- **필수 통과**: CI (`build-and-test`) — type-check · test · build

## 4. CI/CD

| 워크플로우 | 트리거 | 동작 |
|---|---|---|
| [`ci.yml`](.github/workflows/ci.yml) | `pull_request` → `main` | type-check + test:run + build |
| [`deploy.yml`](.github/workflows/deploy.yml) | `push` → `main`, 수동 | vite build → GitHub Pages 배포 |

배포 URL: https://ysj326.github.io/framer-lite/

## 5. 저장소 초기 설정 (관리자 1회 수행)

### 5.1 GitHub Pages Source

1. Repo → **Settings** → **Pages**
2. **Source** 드롭다운: **GitHub Actions** 선택
3. Save

### 5.2 main 브랜치 보호 규칙

1. Repo → **Settings** → **Branches** → **Add branch protection rule**
2. **Branch name pattern**: `main`
3. 다음 항목 체크:
   - ✅ **Require a pull request before merging**
   - ✅ **Require status checks to pass before merging**
     - Add check: `build-and-test`
   - ✅ **Require branches to be up to date before merging**
   - ✅ **Do not allow bypassing the above settings**
4. Create

## 6. 로컬 개발

```bash
npm ci              # 의존성 설치
npm run dev         # dev 서버 (localhost:5173/framer-lite/)
npm run type-check  # 타입 체크
npm run test:run    # 테스트 1회 실행
npm run build       # 프로덕션 빌드
```
````

- [ ] **Step 2: 커밋**

```bash
git add CONTRIBUTING.md
git commit -m ":memo: docs: CONTRIBUTING.md 추가 — 브랜치/PR/배포 규약 정리

- 브랜치 prefix 규약 (feat_/fix_/refactor_ 등)
- gitmoji 커밋 컨벤션
- CI/CD 워크플로우 개요
- Pages Source + main 보호 규칙 설정 가이드

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Push 및 PR 생성 — 첫 실제 CI 검증

**Files:** N/A

- [ ] **Step 1: 원격으로 push**

```bash
git push -u origin feat_github-actions-setup
```

Expected: 원격 브랜치 생성, `feat_github-actions-setup` upstream 설정

- [ ] **Step 2: PR 생성**

```bash
gh pr create --base main --head feat_github-actions-setup \
  --title ":construction_worker: ci: GitHub Actions CI/CD 자동화 도입" \
  --body "$(cat <<'EOF'
## Summary
- feature 브랜치 → PR → main → GitHub Pages 배포 파이프라인 구축
- `ci.yml`: PR 시 type-check + test:run + build
- `deploy.yml`: main 머지 시 vite build → Pages 배포
- `vite.config.ts`: GitHub Pages subpath 대응 (`base: '/framer-lite/'`)
- `CONTRIBUTING.md`: 브랜치/PR/배포 규약 문서화

## Design
- Spec: `docs/superpowers/specs/2026-04-23-github-actions-ci-cd-design.md`
- Plan: `docs/superpowers/plans/2026-04-23-github-actions-ci-cd.md`

## Test plan
- [ ] CI 워크플로우(`build-and-test`) 통과 확인
- [ ] 머지 후 Deploy 워크플로우 완료 확인
- [ ] https://ysj326.github.io/framer-lite/ 접속 시 404 없이 렌더링

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL 출력

- [ ] **Step 3: CI 실행 감시**

```bash
gh pr checks --watch
```

Expected: `build-and-test` PASS

만약 실패하면: `gh run view --log-failed` 로 로그 확인 → 원인 수정 → `git commit --amend` 대신 신규 커밋 + `git push`로 반영.

---

### Task 7: 사용자 수동 — GitHub Repo Settings

> ⚠️ 이 Task는 **사용자가 브라우저에서 직접** 수행한다. CLI로는 불가능.

- [ ] **Step 1: Pages Source를 GitHub Actions로 전환**

1. https://github.com/ysj326/framer-lite/settings/pages 접속
2. **Source** 드롭다운 → **GitHub Actions** 선택
3. 저장

- [ ] **Step 2: main 브랜치 보호 규칙 추가**

1. https://github.com/ysj326/framer-lite/settings/branches 접속
2. **Add branch protection rule** 클릭
3. **Branch name pattern**: `main`
4. 체크:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging → Search: `build-and-test` 추가
   - ✅ Require branches to be up to date before merging
   - ✅ Do not allow bypassing the above settings
5. **Create** 클릭

- [ ] **Step 3: 완료 보고**

"Settings 설정 완료"라고 사용자가 응답.

---

### Task 8: PR 머지 및 배포 검증

**Files:** N/A

- [ ] **Step 1: Squash merge로 PR 머지**

```bash
gh pr merge --squash --delete-branch
```

Expected: main에 squash 커밋 추가, feature 브랜치 삭제

- [ ] **Step 2: Deploy 워크플로우 감시**

```bash
gh run watch
```

Expected: `Deploy to GitHub Pages` 워크플로우의 `build` → `deploy` 모두 성공

- [ ] **Step 3: 로컬 main 동기화**

```bash
git checkout main
git pull origin main
git branch -d feat_github-actions-setup
```

Expected: 로컬 main이 원격과 동일, 로컬 feature 브랜치 삭제

- [ ] **Step 4: 배포 URL 확인**

브라우저에서 https://ysj326.github.io/framer-lite/ 접속.

Expected:
- 페이지 정상 렌더링
- 브라우저 DevTools Network 탭에서 `/framer-lite/assets/*.js` 200 OK
- 404 없음

초기 배포는 수 분 걸릴 수 있음. 즉시 404라면 5분 후 재접속.

- [ ] **Step 5: 완료 검증 — 실제 워크플로우 동작 확인**

```bash
gh run list --workflow=deploy.yml --limit 1
```

Expected: 최신 실행 상태가 `completed` / `success`

---

## Self-Review

### Spec 커버리지 체크

| Spec 항목 | 대응 Task |
|---|---|
| Vite base 경로 설정 | Task 2 |
| ci.yml (type-check + test + build) | Task 3 |
| deploy.yml (configure-pages → upload-artifact → deploy-pages) | Task 4 |
| CONTRIBUTING.md (컨벤션 + Settings 가이드) | Task 5 |
| main 보호 규칙 설정 안내 | Task 7 (수동) |
| 실제 PR로 self-referential 검증 | Task 1, 6, 8 |

### 타입/이름 일관성

- Job 이름: `build-and-test` — ci.yml(Task 3), CONTRIBUTING.md(Task 5), branch protection(Task 7)에서 동일하게 참조 ✅
- Concurrency group: `ci-*`(CI) / `pages`(Deploy) — 중복 없음 ✅
- `base` 경로: `/framer-lite/` — vite.config.ts(Task 2), 배포 URL(Task 8)에서 일치 ✅
- Node 버전: `22` — 양 workflow에서 동일 ✅
- Action 버전: `checkout@v4`, `setup-node@v4`, `configure-pages@v5`, `upload-pages-artifact@v3`, `deploy-pages@v4` — 메이저 고정 ✅

### Placeholder 스캔

- TBD/TODO 없음 ✅
- "적절히 처리" 같은 모호한 표현 없음 ✅
- 모든 코드 블록 완전 ✅
