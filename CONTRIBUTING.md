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
