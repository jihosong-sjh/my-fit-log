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

## Phase 4 — Frontend / Design System (2026-09-27)

- App Router/Strict TypeScript/Tailwind 4/shadcn·Radix, ESLint/Prettier, 공용 UI 패키지 구성. Pretendard variable은 로컬 파일로 제공하며 라이선스 보존.
- PRD Light/Dark 색상, CSS 토큰, 글자 크기, desktop sidebar/header와 mobile header/bottom navigation/Quick Add 구성.
- Button/Input/NumberInput/Card/Dialog/BottomSheet/Dropdown/Tabs/SearchInput/ProgressBar/ProgressCircle/StatCard/DatePicker/Toast/Skeleton/EmptyState 제공.
- 실제 기능 전의 빈 화면과 `/design-system`의 명시적 데모를 구분. 테마 로컬 유지, 서버 사용자 설정 동기화는 Phase 6.
- `pnpm test:web` 8개 통과. Chromium 375/390/430/768/1024/1440px의 가로 넘침·테마·내비게이션, Dialog focus trap/Escape/복귀, Sheet, 탭 방향키, 숫자 입력, 검색, Toast 검증. 각 폭 light/dark 스크린샷 생성 및 desktop/mobile 육안 확인.
- 스크린샷 검토에서 Tailwind 공용 소스 경로 누락 발견·수정. 버튼 높이 44px 회귀 검증 추가.
- 최신 Docker 이미지 재빌드 후 healthy, `pnpm test:dev` HMR·Nest reload와 `pnpm test:web` 재검증 통과. `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm format:check` 성공.
- 실제 스마트폰 검증/성능은 Phase 28이며 이 기록은 로컬 Chromium 검증이다.

## Phase 5 — Authentication (2026-09-27)

- Argon2id(64 MiB, 3 iterations), 서버 관리 계정 생성/재설정/만료 세션 정리 명령. 비밀번호는 숨김 프롬프트 또는 stdin으로 입력하며 인자/로그에 남기지 않는다.
- User/Goal/Preference 동시 생성. 세션은 256-bit 무작위 토큰의 HMAC만 DB에 저장, 고정 30일 만료. 재설정과 로그인의 row lock으로 재설정 경합 시 이전 비밀번호로 새 세션 생성 방지.
- 기본 거부 인증 가드, 공개 health/system/login/logout 명시, 쓰기 Origin 검사, IP/계정 로그인 제한. 보호 페이지 서버 인증과 `/login`, 로그인 실패 안내, refresh 유지, logout 연결.
- `pnpm test:api` 9개 통과: Argon2id/defaults/Origin/로그인 실패, DB 세션/API 재시작, secret 교체, 만료/logout, 비밀번호 재설정, rate limit, 실제 CLI stdin 계정 생성 및 기반 회귀.
- `pnpm test:web`: 기존 기반 8개 통과. 인증 테스트의 alert 선택자를 Next route announcer와 구분하도록 수정 후 `--grep 'unauthorized redirect'` 재실행 통과(실패 입력 유지→로그인→refresh→logout→접근 차단).
- 브라우저 테스트 서버 3100/4100과 myfit_test DB를 자동으로 기동/종료, 개발 DB와 분리. API dev/build 출력도 분리하여 watch와 검증 간 충돌 방지.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` 성공. Secure cookie는 production 설정에서 헤더 속성 검증; 실제 HTTPS/Tailscale은 Phase 24.

## Phase 6 — Settings / Goals (2026-09-27)

- `/api/v1/settings` 조회·부분 수정, `/settings` 이름/체중/열량/영양/주간 운동일/테마 저장. 빈 목표는 null, weeklyWorkoutGoal 1~7, Decimal 문자열 계약 적용.
- Light/Dark/System 서버 저장과 로그인 시 복원. 헤더 테마 변경도 서버에 저장.
- TanStack Query의 사용자별 query key, 로그아웃 시 cache clear, 저장 후 공통 invalidation을 구성. Dashboard/Analytics 실제 갱신 체크는 Phase 10~11까지 미완료 유지.
- `pnpm test:api` 총 10개 통과: 초기 null, 부분 수정, theme 유지, 다른 계정 격리, 범위·타입·userId 주입 거부 포함.
- 격리 브라우저 테스트 `settings persist` 통과: 이름/열량/주간 목표/다크 저장→reload→logout→login 후 유지, 초기 미설정 목표 빈칸.
- `pnpm lint`, `pnpm typecheck`, `pnpm format:check` 통과. 이후 단계에서도 공통 조회·오류·loading 컴포넌트를 재사용한다.

## Phase 7-A — 운동 저장 API (2026-09-27)

- Exercise 검색/최근/즐겨찾기/커스텀/archive/이전 기록, Workout 전체 스냅샷 저장/목록/조회/삭제, Routine CRUD, Cardio CRUD와 pace를 구현.
- 운동 수정은 advisory transaction lock + revision + canonical payload hash + mutationId. 마지막 동일 요청 재전송은 재적용하지 않으며 충돌 409, 삭제된 기존 기록 404, 타 사용자 조회·연결 404.
- 종목/세트 순서 재배치 시 임시 순번을 사용하고 기존 ID·이름 snapshot을 유지한다. 완료 시 완료 세트 최소 1개, 서버 duration 계산, 완료 세트 volume 적용.
- 최소 `/dashboard?date=`에 완료 웨이트/유산소 시간·세트·volume 연결. 전체 Dashboard 완료 판정은 Phase 10.
- `pnpm test:api` 총 15개 통과. 운동 replay/canonical 순서/동시 수정/rollback/타 사용자 ID/순서·삭제/루틴 독립성/보관 이력/러닝 pace/줄넘기 유형 검증 추가.
- 발견·수정: native upsert의 BEFORE INSERT trigger가 보관된 기존 종목 수정도 막음. 기존 WorkoutExercise는 명시적 UPDATE로 처리해 보관 후 이력 수정 검증 통과.
- lint/typecheck 통과. UI 연결과 브라우저 기록 흐름은 다음 작업 단위에서 완료한다.

## Phase 7-B — 운동·루틴·유산소 화면 (2026-09-27)

- `/workout`, `/workout/new`, `/workout/[id]`, `/workout/history`, `/routines`, `/workout/cardio/new`·상세/수정 연결.
- 종목 검색/최근순/즐겨찾기/개인 종목 추가·보관, 이전 완료 기록과 입력값 복사, 세트 추가·복사·삭제·완료, 종목 순서, 운동 저장/완료/삭제, 루틴 생성·편집·삭제·복사.
- 유산소 시간/거리 또는 횟수/열량/심박/메모, 수영 m→km 변환, 러닝 pace·줄넘기 이력 수정, 날짜별 이력과 최소 Dashboard 연결.
- 격리 Chromium 3개 흐름 통과: 390px 80kg×8→세트 복사/삭제→완료→Dashboard 640kg→reload 유지, 루틴 변경 후 기존 3세트 보존, 줄넘기 500→600회 수정 및 러닝 5km/25분 pace 확인.
- 운동 모바일 스크린샷 육안 확인, 가로 넘침 없음. 최소 Dashboard와 첫 기록 흐름 완료.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` 통과. 전체 집계·Calendar·Quick Add 반영은 Phase 10~13 체크를 남겼으며 Draft 자동 저장은 Phase 14에서 구현한다.

## Phase 8-A — 음식·식사·프리셋 API (2026-09-27)

- Food CRUD/archive, 소유권, 즐겨찾기, 최근/빈도순 검색. Meal CRUD는 서버 snapshot과 servings를 사용하며 같은 일자/식사 구분 여러 건을 허용한다.
- MealPreset CRUD/최신 영양 미리보기/원자적 적용. 보관된 항목이 있으면 전체 적용을 rollback한다. 기존 식사는 프리셋 변경·삭제와 독립적이다.
- 식사 수정 시 기존 행을 직접 갱신해 archive 후에도 양 수정과 영양 snapshot 보존을 지원. 클라이언트 영양정보 주입과 마지막 음식 제거는 거부한다.
- `pnpm test:api` 총 18개 통과. 음식 수치·계정 격리·즐겨찾기·빈도·중복 식사, 165×2=330→카탈로그 수정/보관 후 165×3=495, 프리셋 최신 365kcal/실패 rollback/과거 기록 보존 검증.
- lint/typecheck 통과. 식단 화면은 다음 작업 단위에서 연결한다.

## Phase 8-B — 식단 화면 (2026-09-27)

- 날짜별 열량/단백질/탄수화물/지방 합계, 같은 식사 구분 묶음, 식사 작성·수정·삭제와 마지막 음식 삭제 확인.
- 음식 검색/최근/빈도/즐겨찾기, 개인 음식 생성·정보 수정·보관. 제공량 배수와 실제 섭취량을 함께 표시하며 예: 100g×2회=200g.
- 프리셋 생성·편집·삭제, 최신 양/영양을 다시 읽은 적용 미리보기, 날짜/식사 구분 선택 후 실제 식사 생성.
- 격리 Chromium 2개 통과: 375px 음식 생성→2회 330kcal→3회 495kcal와 일일 합계, 즐겨찾기/프리셋 최신 120kcal 적용→카탈로그 변경 후 기존 식사 120kcal/이름 snapshot 유지.
- 모바일 스크린샷 확인, 가로 넘침 없음. lint/typecheck 통과. 상세 집계 화면 갱신은 Phase 10~12에서 최종 연결한다.

## Phase 9 — 신체 기록과 체중 차트 (2026-09-27)

- `/body` 날짜별 체중/체지방/근육량/허리/메모 입력·조회·수정·삭제, 날짜당 upsert. 생략 필드는 유지, 명시적 null은 비우기.
- Dashboard 빠른 체중 입력은 weight만 전송해 나머지 필드를 보존한다.
- Recharts 체중/7일 평균, 7D/30D/3M/6M/1Y·조회 기준일, 기간 변화와 실제 최근 측정일. 7일 평균은 달력일이며 lookback을 포함하고 미기록일 제외. 빈 기간은 null.
- `pnpm test:unit` 4개 통과(윤년 기간 처리 추가), `pnpm test:api` 총 20개 통과(부분 갱신/null/소유권/유효성/평균 경계/빈 기간/삭제 추가).
- 격리 390px 브라우저: 전체 신체 입력→Dashboard 체중만 갱신→선택 필드 유지→7D 차트·이력 확인. 가로 넘침 없음, 스크린샷 육안 확인.
- lint/typecheck 통과. 차트는 표로도 조회할 수 있으며 자동 애니메이션을 사용하지 않는다.

## Phase 10 — Dashboard 통합 (2026-09-27)

- `/dashboard?date=` 단일 집계 API에서 today/nutrition/body/weekly/recentWorkout/goals 제공. 읽기 transaction은 RepeatableRead로 일관된 snapshot을 사용한다.
- 운동·열량·단백질·현재 체중, 영양/운동일 목표, 최근 7일 체중/평균/직전 7일 비교, 주간 운동일/웨이트 횟수/시간/평균 영양/체중 변화와 최근 운동 연결.
- 같은 날 웨이트+유산소는 운동일 1일, 미완료 웨이트/세트는 집계 제외, 영양 평균은 식사 기록일만, 현재 체중은 조회일 이하의 실제 측정일, 목표 미설정·빈 기록은 별도 안내.
- `pnpm test:api` 총 21개 통과. 운동일 2일/웨이트 1회/2100초/640kg, 중복 식사 300kcal, 기록일 평균 200kcal, 200% 비율 유지, 체중 평균81/직전대비-9, 타 사용자 빈 결과 확인.
- 격리 브라우저에서 Dashboard GET이 단일 데이터 API만 사용함을 확인. 설정 화면 저장 후 client navigation으로 돌아와 진행률 50% 재조회, 390px 넘침 없음·스크린샷 검토.
- lint/typecheck 통과. Phase 6의 Analytics 갱신과 Phase 7의 Analytics/Calendar 연결 체크는 후속 단계까지 유지한다.

## Phase 11 — Analytics (2026-09-27)

- 체중/7일 평균/시작·최근·변화, 주간 웨이트 횟수/운동시간/volume, 종목별 완료 세트 최대 중량, 영양 일별값/기록일 평균/현재 목표 달성률.
- 유산소 종목별 시간·거리 또는 횟수 추세와 최근 기록. 기간 pace는 거리 있는 기록의 시간 합계÷거리 합계; 줄넘기에 거리/pace를 표시하지 않는다.
- LineChart/BarChart/ResponsiveContainer/Tooltip/표/빈 상태, 7D~1Y 기간과 조회 기준일, 반올림은 표시 경계에서만 수행.
- `pnpm test:api` 총 22개 통과. 완료 세트 최대 90kg/volume1090, 시간만 입력한 러닝을 pace에서 제외(300초/km), 줄넘기 같은 날 150회/90초, 미기록 null·평균/현재 목표200→100%·보관 이력·계정 격리 확인.
- 격리 Chromium: 체중·웨이트·영양·유산소 차트, Settings 저장 후 Analytics 비율 40% 갱신, 줄넘기 거리/pace 미노출, 390px 가로 넘침·브라우저 오류 없음, 스크린샷 확인.
- lint/typecheck 통과. Phase 6의 Dashboard/Analytics 캐시 갱신 체크 완료.
