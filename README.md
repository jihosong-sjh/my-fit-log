# MyFit Log

개인 운동·식단·신체 기록. Next.js + NestJS + PostgreSQL / Prisma 모노레포입니다.
진행 범위와 완료 기준은 [개발 체크리스트](<docs/MyFit Log 구현 계획 및 개발 체크리스트.md>)를 따릅니다.

## 로컬 개발

Node **22.23.3**, pnpm **10.34.5**, Docker Desktop(Compose v2)을 사용합니다.

```sh
nvm install
nvm use
npm install --global pnpm@10.34.5
pnpm install --frozen-lockfile
pnpm setup:dev
pnpm dev:up
```

Web: http://localhost:3000 / API liveness: http://localhost:4000/health/live
각 앱만 실행하려면 `pnpm dev:web`, `pnpm dev:api`를 사용합니다.

```sh
pnpm typecheck
pnpm build
pnpm format:check
```

## 구조

- `apps/web`: Next.js App Router, 동일 origin API proxy
- `apps/api`: NestJS API
- `packages/types`, `packages/config`, `packages/ui`: 공통 계약·설정·UI
- `prisma`, `infra`, `scripts`: DB와 개발 인프라
- `docs`: 기존 기획·설계 문서(경로 보존)

운영 이미지·배포·계정 생성·백업은 Phase 19 이후 및 해당 기능 단계에서 제공합니다.
현재 개발 환경을 운영에 사용하지 않습니다.

## Docker 개발 환경

`pnpm setup:dev`는 Git에서 제외한 `.env.development`를 생성합니다(기존 파일 보존).
`pnpm dev:up` 또는 다음 명령으로 Web/API/DB가 함께 시작됩니다.

```sh
docker compose --env-file .env.development -f compose.dev.yml up -d
```

소스는 bind mount하며 Next HMR / Nest watch로 반영됩니다. 의존성·Dockerfile 변경 후에는 `pnpm dev:up`으로 다시 빌드합니다.
DB는 localhost:5432, 개발 전용 `myfit_dev` / `myfit-dev-postgres` volume을 사용합니다.
테스트 DB는 `--profile test up -d db-test`로 실행하며 localhost:5433, `myfit_test` / `myfit-test-postgres`로 분리합니다.
모든 개발 포트는 127.0.0.1에만 노출합니다. 운영 DB/volume은 향후 별도 구성하며 개발 비밀번호를 재사용하지 않습니다.
`pnpm dev:down`은 volume을 보존합니다. `down -v`는 기록을 삭제하므로 사용에 주의합니다.

컨테이너 대신 호스트에서 앱을 실행하려면 DB만 켜고 `.env.development`를 셸에 로드한 후 `pnpm dev`를 실행합니다.
`/health/live`는 API 프로세스, `/health/ready`는 DB 연결, Web `/api/v1`은 같은 origin의 API proxy를 확인합니다.

개발 환경 회귀 검증: `pnpm exec playwright install chromium` 후 `pnpm test:dev`.
이 명령은 실행 중인 개발 컨테이너와 소스 변경 권한이 필요하며 Web/API 파일을 잠시 수정했다가 복원합니다.

## Database / Prisma

```sh
pnpm build:packages   # Prisma Client와 공통 패키지 생성
pnpm db:migrate       # 개발 DB에 커밋된 migration 적용
pnpm db:seed          # 공용 운동 20종, 재실행 가능
pnpm db:migrate:dev --name describe_change  # schema 변경 시 개발 migration 작성
pnpm test:unit
# 테스트 DB는 개발/운영 DB와 분리됩니다.
docker compose --env-file .env.development -f compose.dev.yml --profile test up -d --wait db-test
pnpm test:db
```

Prisma 명령은 `.env.development`를 읽습니다. 이미 설정한 `DATABASE_URL`은 덮어쓰지 않습니다.
`test:db`는 localhost:5433/myfit_test만 허용하고 테스트에서 만든 사용자 데이터만 정리합니다.
원시 Prisma Client는 서버 전용입니다. 인증된 사용자 ID로 `UserStore`를 생성하며 클라이언트의 userId나 Prisma 입력을 그대로 전달하지 않습니다.
DB trigger는 카탈로그 소유권·유형·archive·snapshot·소유자 변경을 추가로 보호합니다. 인증 가드는 Phase 5에서 연결합니다.

호스트 앱 실행은 `pnpm dev`가 개발 env를 로드합니다. Docker 앱과 같은 포트를 쓰므로 먼저 `docker compose --env-file .env.development -f compose.dev.yml stop web api`로 앱 컨테이너만 중지합니다.

## API 기반 검증

- API: `http://localhost:4000/api/v1`, 브라우저는 `http://localhost:3000/api/v1` 사용
- OpenAPI: `http://localhost:3000/api/docs` (개발 전용)
- `pnpm test:api`: DTO·응답·오류·로그·설정 테스트
- `pnpm test:api:smoke`: 실행 중인 개발 DB를 잠시 중단하고 반드시 재시작하여 readiness 복구 확인

인증 및 도메인 모듈은 경계만 마련했으며 실제 개인 기록 API는 Phase 5 이후 구현합니다.

## UI / 브라우저 검증

`http://localhost:3000/design-system`에서 공통 입력·모달·시트·탭·진행률·알림을 확인합니다.
예제 값은 저장되지 않습니다. 디자인 토큰·배치는 [디자인 시스템](docs/design-system.md)에 정리했습니다.

```sh
pnpm exec playwright install chromium
pnpm test:web
pnpm lint
pnpm typecheck
pnpm format:check
pnpm build
```

브라우저 테스트는 375/390/430/768/1024/1440px, Light/Dark/System,
키보드 포커스·다이얼로그·시트·탭·입력·Toast를 검증합니다. 스크린샷은 `test-results`에 생성합니다.
Pretendard와 shadcn/ui의 라이선스는 해당 소스 디렉터리에 보존했습니다.

## 개인 계정과 세션

```sh
pnpm account:create --email you@example.com --name 사용자
pnpm account:reset --email you@example.com
pnpm sessions:prune
```

계정 명령은 화면에 표시되지 않는 비밀번호 프롬프트를 사용합니다(12~128자).
자동화에서는 `--password-stdin`을 사용하고 비밀번호를 명령 인자에 넣지 않습니다.
공개 회원가입은 없으며 `/login`에서 로그인합니다. 계정 재설정은 기존 세션을 모두 폐기합니다.
`.env.development`에는 최소 32자의 `SESSION_SECRET`이 필요하며 `pnpm setup:dev`가 새 파일 생성 시 이를 만듭니다.

`pnpm test:api`와 `pnpm test:web`는 실행 중인 격리 테스트 DB(5433/myfit_test)가 필요합니다.
브라우저 검증은 전용 서버 3100/4100을 자동 기동·종료합니다. 테스트 계정은 생성 후 삭제합니다.
`pnpm dev`는 호스트 Web/API, Docker의 개발 DB를 함께 사용합니다.
