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

## Phase 2 — Database / Prisma (2026-09-27)

- Prisma 7.10.0 + PostgreSQL driver adapter, 19개 모델, 날짜/UTC/Decimal/FK/unique/index/CHECK와 삭제 정책을 구현.
- DB trigger로 카탈로그 소유권·입력 유형·archive·snapshot·불변 소유자/부모 경계 추가. `UserStore`는 인증된 userId를 받는 읽기·archive·루틴 복사 저장 기반이며 인증 엔드포인트는 Phase 5 범위.
- 공용 catalogKey seed 13 strength + 7 cardio. 계정·비밀번호·개인정보 seed 없음.
- `pnpm db:generate`, 빈 개발 DB `pnpm db:migrate`, `pnpm db:seed` 반복 성공. `pnpm db:migrate:dev --name verify_initial`은 drift·추가 migration 없이 in sync.
- 새 `myfit-test-postgres` volume / myfit_test DB에서 migration 후 `pnpm test:db` 6개 통합 테스트 통과. 제약 거부, 기본 설정, 타 사용자 카탈로그 차단, archive, snapshot 유지, 루틴 복사, cascade/Restrict/SetNull 검증.
- `pnpm test:unit` 3개 통과: Seoul 날짜 경계, 월요일 주간, Decimal 합산, 기록일 평균, 미설정 목표, 완료 세트 volume, 중복 운동일, 영양 snapshot/pace.
- `pnpm typecheck` 성공. 운영·인증·도메인 CRUD·Draft는 완료 처리하지 않음.

## Phase 3 — API 기반 구조 (2026-09-27)

- ConfigModule 검증, PrismaModule 연결·종료 처리, 전역 ValidationPipe/filter/interceptor, URI versioning, Swagger 구성.
- 요구한 15개 Nest 모듈 등록. Health와 시스템 정보만 엔드포인트를 제공하며 인증·도메인 모듈의 기능 구현은 Phase 5 이후다.
- `/api/v1` 성공 `{data}`, 오류 `{error:{code,message}}`. 검증 400, 인증 401, 권한 403, 조회 404, 충돌 409, 제한 429, 내부 500, 준비 실패 503 계약.
- API 로그는 requestId/method/status/duration/code만 허용. 예외 원문·URL/query/body/header/cookie를 기록하지 않음. Next 개발 요청·서버 함수·브라우저 로그 전달도 비활성화.
- `pnpm test:api` 5개 통과: HTTP envelope/version/OpenAPI/DTO/상태코드, DB 장애 모사, 오류·로그의 비밀정보 제거, 잘못된 config 거부.
- `pnpm test:api:smoke`에서 실제 개발 PostgreSQL 중단 시 live 200 / ready 503, DB 재시작 후 ready 200 및 Next 동일 origin API/OpenAPI 통신 확인.
- `pnpm test:dev`의 실제 HMR/Nest watch 회귀 통과. `pnpm typecheck`, `pnpm build` 성공.
- Swagger는 개발 환경에서 `http://localhost:3000/api/docs`, JSON은 `/api/docs-json`. 운영에서는 비활성화.
