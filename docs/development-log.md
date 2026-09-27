# 개발 작업 기록

## Phase 0 — 프로젝트 초기화 (2026-09-27)

- 기존 main / origin과 깨끗한 작업 트리 확인, docs 경로 보존.
- Node 22.23.3 / pnpm 10.34.5, Next.js 16.3.6 / React 19.3.0 / NestJS 11.2.6 / TypeScript 5.9.3 고정. 릴리스 후보 대신 검증할 안정 메이저 선택.
- pnpm workspace, 공통 config/types/ui 경계, ignore/editorconfig, README 작성.
- 검증 환경: macOS arm64, Docker Desktop 4.57.0 / Engine 29.1.3.
- `pnpm install`, `pnpm typecheck`, `pnpm build` 성공. `pnpm dev`에서 Web 3000의 MyFit Log 문구와 API 4000 `/health/live` HTTP 200 확인.
- README의 Node/pnpm 설치와 의존성·개별 앱 실행 절차를 실제 수행. 후속 단계에서 Docker 신규 환경 검증 추가.
- 인증·도메인 기능·운영 배포는 아직 구현 범위 밖.

## Phase 1 — Docker 개발 환경 (2026-09-27)

- Web/API Node 22.23.3 slim 이미지, PostgreSQL 17.9, 전용 network, restart 정책, source bind mount, healthcheck 구성.
- `.env.development`는 임의 비밀번호로 생성하며 Git 제외·0600 적용. 개발/테스트 DB·volume 분리, 포트 3000/4000/5432는 loopback bind.
- `pnpm dev:up`으로 신규 이미지·volume 생성 후 3개 컨테이너 healthy. `pg_isready` 성공.
- `pnpm test:dev` 실제 Chromium에서 소스 변경 후 페이지 재탐색 없이 HMR 반영·원복, Nest 소스 변경 후 새 API 응답·원복 확인. 같은 origin `/api/v1` 200, DB readiness 200.
- 발견·수정: slim 이미지에서 셸 하위 프로세스 정리가 누락되어 Nest watch가 EADDRINUSE 발생. `nest start --watch --no-shell` 적용 후 전체 재검증 통과.
- `pnpm typecheck` 성공. HMR 검증은 원본 파일을 finally에서 복원한다.
