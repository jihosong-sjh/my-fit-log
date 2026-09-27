# MyFit Log

개인 운동·식단·신체 기록 앱. Next.js / NestJS / PostgreSQL / Prisma / pnpm workspace로 구성합니다.
현재 Phase 0~15 구현·로컬 검증을 완료했습니다. [체크리스트](<docs/MyFit Log 구현 계획 및 개발 체크리스트.md>)와 [검증 기록](docs/development-log.md)을 기준으로 진행합니다.

## 처음 실행

Node **22.23.3**, pnpm **10.34.5**, Docker Desktop(Compose 지원)이 필요합니다.

```sh
nvm install
nvm use
npm install --global pnpm@10.34.5
pnpm install --frozen-lockfile
pnpm setup:dev
pnpm dev:up
pnpm build:packages
pnpm db:migrate
pnpm db:seed
pnpm account:create --email you@example.com --name 사용자
```

http://localhost:3000/login 에서 생성한 계정으로 로그인합니다.
비밀번호는 숨김 프롬프트로 입력합니다(12~128자). 공개 회원가입과 기본 계정은 없습니다.
자동화에는 `--password-stdin`을 사용하며 비밀번호를 명령 인자로 넘기지 않습니다.

`setup:dev`는 임의 DB 비밀번호·SESSION_SECRET을 포함하는 `.env.development`를 생성하고 0600 권한으로 Git에서 제외합니다. 기존 파일은 보존합니다.

## 개발 환경

| 서비스            | 주소           | 저장 영역                               |
| ----------------- | -------------- | --------------------------------------- |
| Web               | localhost:3000 | Next App Router / 동일 origin API proxy |
| API               | localhost:4000 | `/api/v1`                               |
| 개발 PostgreSQL   | localhost:5432 | myfit_dev / myfit-dev-postgres          |
| 테스트 PostgreSQL | localhost:5433 | myfit_test / myfit-test-postgres        |

개발 포트는 127.0.0.1에만 bind합니다. 개발 브라우저 접속은 `localhost`와 `127.0.0.1`의 동일 포트를 지원합니다.
쿠키와 IndexedDB Draft는 주소별로 분리되므로 한 주소를 계속 사용하세요. 운영 API는 지정한 APP_URL origin만 허용합니다. Web/API 소스는 bind mount하며 Next HMR / Nest watch로 반영됩니다.
의존성·설정 변경 후 `pnpm dev:up`으로 이미지를 다시 빌드합니다.

```sh
# 이미지가 준비되면 세 서비스 기동
docker compose --env-file .env.development -f compose.dev.yml up -d
# 중지 (DB volume 보존)
pnpm dev:down
# 컨테이너 대신 호스트 앱으로 개발
docker compose --env-file .env.development -f compose.dev.yml stop web api
pnpm dev
```

`pnpm dev`는 개발 env를 읽고 Web/API를 함께 실행합니다. 별도 실행은 `pnpm dev:web`, `pnpm dev:api`입니다.
`down -v`는 DB volume을 삭제합니다. 운영 이미지·배포·백업은 Phase 19 이후 별도 작업입니다.

## DB와 계정 관리

```sh
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:migrate:dev --name describe_change
pnpm account:reset --email you@example.com
pnpm sessions:prune
```

Prisma 명령은 `.env.development`를 읽으며 이미 설정한 `DATABASE_URL`은 덮어쓰지 않습니다.
공용 운동 seed는 웨이트 13종·유산소 7종이며 재실행해도 중복되지 않습니다.
계정 생성 시 목표·설정을 함께 생성하고, 비밀번호 재설정 시 기존 세션을 모두 폐기합니다.

DB trigger는 카탈로그 소유권·유형·archive·snapshot을 보호합니다. API는 세션 사용자 ID로 모든 개인 기록을 제한하며 클라이언트의 userId를 받지 않습니다.

## 검증

```sh
docker compose --env-file .env.development -f compose.dev.yml --profile test up -d --wait db-test
pnpm exec playwright install chromium
pnpm verify
```

`verify`는 lint → typecheck → 날짜/집계 단위 테스트 → Draft 엔진 → DB → API → 브라우저 → production build → formatting 순서로 검사합니다.
개별 명령은 `pnpm test:unit`, `pnpm test:draft`, `pnpm test:db`, `pnpm test:api`, `pnpm test:web`입니다.

DB/API/브라우저 검증은 **localhost:5433/myfit_test**만 사용합니다. 브라우저 테스트 서버 3100/4100을 자동 기동·종료하고 생성한 테스트 계정을 정리합니다.
375/390/430/768/1024/1440px 및 테마·키보드·기록 저장·실패 복구를 검증하며 스크린샷은 `test-results`에 생성합니다.

개발 컨테이너가 실행 중일 때 추가 확인:

```sh
pnpm test:dev
pnpm test:api:smoke
```

`test:dev`는 소스를 잠시 변경·복원해 실제 HMR과 Nest reload를 확인합니다.
`test:api:smoke`는 개발 DB를 잠시 중지했다 재시작해 live/ready 분리와 복구를 검증합니다.

## 사용 화면과 동작

- `/dashboard`: 하루·주간 운동/영양/체중/목표와 빠른 체중 입력
- `/workout`, `/routines`: 웨이트·유산소·루틴·이력·운동 Draft
- `/diet`, `/diet/presets`: 음식·식사·즐겨찾기·프리셋
- `/body`, `/analytics`, `/calendar`, `/settings`: 신체 기록·추세·캘린더·목표/테마
- `/design-system`: 저장하지 않는 UI 예제
- `/api/docs`: 개발 전용 OpenAPI; `/health/live`, `/health/ready`는 API 직접 접근

운동은 IndexedDB에 먼저 보존하고 약 800ms 후 서버로 전송합니다. 응답 유실 시 동일 요청으로 재시도하며 전송 중 편집도 유지합니다. 401은 재로그인, 404는 삭제된 기록 재생성 방지, 409는 서버/기기 비교 후 사용자 선택으로 처리합니다.
완료 ACK를 확인한 Draft만 정리하고, 로그아웃 시 미동기화 확인 후 해당 계정 Draft를 정리합니다. 앱 전체 오프라인 실행·자동 다중 기기 병합은 후속 범위입니다.

## 구조와 문서

- `apps/web`, `apps/api`: 화면과 API
- `packages/types`, `packages/config`, `packages/ui`: 계약·설정·공통 UI
- `prisma`: 19개 데이터 모델·migration·seed·DB 검증
- `scripts`, `compose.dev.yml`: 개발·관리·검증 명령
- `docs`: [문서 안내](docs/README.md), [디자인 시스템](docs/design-system.md), [개발 작업 기록](docs/development-log.md)

Pretendard와 shadcn/ui 라이선스는 해당 소스 디렉터리에 보존했습니다. 실제 Tailscale/스마트폰/장시간 운영 검증은 후속 Phase에서 수행합니다.
