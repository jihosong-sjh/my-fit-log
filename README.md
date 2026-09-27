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
pnpm dev
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
