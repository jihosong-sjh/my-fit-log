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
