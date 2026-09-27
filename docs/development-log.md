# 개발 작업 기록

## Phase 0 — 프로젝트 초기화 (2026-09-27)

- 기존 main / origin과 깨끗한 작업 트리 확인, docs 경로 보존.
- Node 22.23.3 / pnpm 10.34.5, Next.js 16.3.6 / React 19.3.0 / NestJS 11.2.6 / TypeScript 5.9.3 고정. 릴리스 후보 대신 검증할 안정 메이저 선택.
- pnpm workspace, 공통 config/types/ui 경계, ignore/editorconfig, README 작성.
- 검증 환경: macOS arm64, Docker Desktop 4.57.0 / Engine 29.1.3.
- `pnpm install`, `pnpm typecheck`, `pnpm build` 성공. `pnpm dev`에서 Web 3000의 MyFit Log 문구와 API 4000 `/health/live` HTTP 200 확인.
- README의 Node/pnpm 설치와 의존성·개별 앱 실행 절차를 실제 수행. 후속 단계에서 Docker 신규 환경 검증 추가.
- 인증·도메인 기능·운영 배포는 아직 구현 범위 밖.
