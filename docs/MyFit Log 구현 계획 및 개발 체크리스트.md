# MyFit Log 구현 계획 및 개발 체크리스트

정리 기준일: 2026-09-27. **본 문서의 Phase 0~29가 유일한 구현 번호다.** 기존 상세 Phase 0~36의 대응은 부록 A에 보존한다. 일반 문서 장 번호·후속 릴리스와 구분한다.

## 문서 기준과 MVP 범위

- 제품 범위: [PRD](<개인 운동·식단 관리 웹페이지 PRD.md>)
- 기술 구조: [아키텍처](<MyFit Log 기술 아키텍처 설계서.md>)
- 필드·관계·제약·집계·Draft 계약: [데이터 모델](<MyFit Log 데이터 모델 명세.md>)
- 문서 사용법과 결정: [문서 안내](README.md)

기술 스택은 Next.js / NestJS / PostgreSQL / Prisma / pnpm workspace / Docker Compose다. 운영 목표는 MacBook + Tailscale이며 공개 클라우드 배포는 MVP 필수가 아니다.

| 우선순위 | 포함 범위 | 완료 의미 |
|---|---|---|
| P0 | 인증, 목표 설정, 웨이트·식단·신체 CRUD, Dashboard, 데이터 보존, 기본 보안, 개발·운영 환경 | 중간 시연과 핵심 사용 흐름 |
| P1 | 루틴, 운동·음식 즐겨찾기, 식단 프리셋, 유산소, History, Analytics, Calendar, Draft, UX·접근성·품질 검증 | **P0와 함께 최종 MVP에 포함** |
| P2 | 걸음수·물·독립 메모·Streak, PR/1RM, 추가 신체 치수, 사진, PWA·범용 오프라인 동기화, AI·헬스 플랫폼 연동 | 후속 릴리스; 이번 완료 조건에 포함하지 않음 |

공개 회원가입 대신 서버 관리 명령으로 개인 계정을 생성한다. 운동 Draft의 네트워크 재시도는 MVP이며, 앱 전체 오프라인 실행·다중 기기 자동 병합은 P2다.

## 실행 기록

2026-09-27: Phase 0~6, 8~11 완료. Phase 7 기능 검증 완료, Calendar·Quick Add 연동은 Phase 12~13에서 확인한다. Phase 15까지 진행 중이며 상세 증거는 [개발 작업 기록](development-log.md)을 참조한다.

## 작업 구간과 완료 상태

| 구간 | 수행 범위 | 담당 / 필요한 환경 |
|---|---|---|
| Phase 0~18 | 앱 구현과 로컬 API·통합·E2E·성능 검증 | 개발 담당; Node·Docker·브라우저 실행 환경 |
| Phase 19~22 | 운영 이미지·설정 계약·스크립트·복구 리허설 | 개발 담당; 격리 DB/volume 사용 |
| Phase 23~25 | 실제 서버·운영 값·Tailscale·배포·백업 적용 | 운영자 + 개발 담당; 장비·계정 접근 |
| Phase 26~29 | 물리 장비·외부 기기·장시간·실사용 검증 | 운영자 중심, 개발 담당 진단·수정 지원 |

**Phase 22 = 개발 완료**, **Phase 28 = 운영 준비 완료**, **Phase 29 = 실사용을 포함한 MVP 완료**로 구분한다. 환경변수 생성·설정 파일 작성은 자동화할 수 있다. 사용자 참여는 실제 주소·경로 확정, 계정 인증, 장비 조작·접속, 실사용 평가에 필요하다.

각 체크는 실제 증거가 있을 때만 완료 처리한다. 구현됨 / 로컬 검증됨 / 운영 검증됨을 구분하고 명령·결과·환경·미검증 항목을 작업 기록에 남긴다. 도구가 없어서 실행하지 못한 테스트는 완료로 표시하지 않는다.

## 전체 Phase와 선행 조건

아래 숫자는 개발·검증의 완료 순서다. 관련 테스트와 보안 처리는 기능 구현과 함께 작성하며 테스트 Phase까지 미루지 않는다. 같은 기반을 공유하는 기능은 필요에 따라 함께 구현할 수 있다.

| Phase | 작업 | 선행 Phase |
|---|---|---|
| 0 | 프로젝트 초기화 | 없음 |
| 1 | Docker 개발 환경 | 0 |
| 2 | Database / Prisma | 0~1 |
| 3 | API 기반 구조 | 0~2 |
| 4 | Frontend / Design System | 0~1 |
| 5 | Authentication | 2~4 |
| 6 | Settings / Goals | 5 |
| 7 | Workout / Routine / Cardio | 2~6 |
| 8 | Diet / Food / Preset | 2~6 |
| 9 | Body | 2~6 |
| 10 | Dashboard | 6~9 |
| 11 | Analytics | 7~10 |
| 12 | Calendar | 7~10 |
| 13 | Quick Add | 7~9 |
| 14 | Draft / Auto Save | 5, 7 |
| 15 | UX / Keyboard | 4, 7~14 |
| 16 | Security / Accessibility | 5~15 |
| 17 | API / Unit / Integration Test | 2~16 |
| 18 | E2E / 로컬 성능 / URL 검증 | 17 |
| 19 | Production Docker / Logging | 18 |
| 20 | 환경변수 / 배포 / Migration 준비 | 19 |
| 21 | Backup / Restore 준비 | 19~20 |
| 22 | 개발 완료 판정 | 0~21 |
| 23 | MacBook 서버 / 운영 환경변수 적용 | 22 |
| 24 | Tailscale / 첫 운영 배포 | 23 |
| 25 | 운영 Backup / Migration / Restore 검증 | 24 |
| 26 | Lid Closed / Reboot Recovery | 25 |
| 27 | 장애 복구 / 운영 보안 검증 | 26 |
| 28 | 실제 Mobile / 운영 성능 검증 | 24~27 |
| 29 | MVP 최종 검증 / 실사용 | 0~28 |

첫 전체 흐름은 Phase 0~7과 Phase 10의 최소 Dashboard로 `로그인 → 운동 기록 → PostgreSQL 저장 → Dashboard 반영`을 완성한다. Phase 10 전체 완료는 식단·신체 기록까지 연결한 후 판정한다. 이후 8~14를 확장하고 15~22에서 개발 완료를 확인한다.

---

## Phase 0. 프로젝트 초기화

구간: **개발·로컬 검증** · 선행: 없음

### Repository

- [x] 기존 Git Repository와 main Branch 상태 확인
- [x] `.gitignore` 작성
- [x] `.editorconfig` 작성
- [x] README 생성
- [x] Node 버전 지정
- [x] pnpm 설치
- [x] pnpm workspace 구성

권장 구조:

```text
myfit-log/

├─ apps/
│  ├─ web/
│  └─ api/
│
├─ packages/
│  ├─ types/
│  ├─ config/
│  └─ ui/
│
├─ prisma/
│
├─ infra/
│
├─ scripts/
│
├─ docs/
│
├─ compose.dev.yml
├─ compose.prod.yml
├─ .env.example
├─ .env.production.example
└─ README.md
```

### 완료 조건

- [x] Root에서 dependency 설치 가능
- [x] Web/API 각각 실행 가능
- [x] Git clone 후 README만 보고 개발환경 구성 가능

### 추가 완료 조건

- [x] 기존 docs 이동 상태를 보존하고 개발·운영 명령을 README에 정리
- [x] 검증 가능한 Node/pnpm/패키지 버전과 lockfile 고정

---

## Phase 1. Docker 개발 환경

구간: **개발·로컬 검증** · 선행: 0

### Development Container

구성:

```text
myfit-web-dev

myfit-api-dev

myfit-db-dev
```

### 체크리스트

- [x] Web Dockerfile 생성
- [x] API Dockerfile 생성
- [x] PostgreSQL Container 추가
- [x] `compose.dev.yml` 생성
- [x] `myfit-network` 생성
- [x] PostgreSQL Volume 생성
- [x] `.env.development` 구성
- [x] Container 이름 정의
- [x] Container restart 정책 설정

---

### Local Port

```text
Web
localhost:3000

API
localhost:4000

PostgreSQL
localhost:5432
```

- [x] Web Port 확인
- [x] API Port 확인
- [x] PostgreSQL Port 확인

---

### Hot Reload

Frontend:

- [x] Next.js source volume mount
- [x] 파일 수정 시 HMR 확인

API:

- [x] NestJS watch mode
- [x] 파일 수정 시 자동 reload 확인

---

### Health Check

PostgreSQL:

- [x] `pg_isready`

API:

- [x] `/health/live`
- [x] `/health/ready`

Web:

- [x] Root HTTP health 확인

---

### 완료 조건

```text
docker compose --env-file .env.development -f compose.dev.yml up -d
```

한 번으로:

- [x] Web 실행
- [x] API 실행
- [x] DB 실행
- [x] Web → API 통신
- [x] API → DB 통신

가능해야 한다.

### 추가 완료 조건

- [x] 개발·테스트·운영 DB와 volume 이름 분리
- [x] 개발 포트도 필요 범위에만 bind하고 개발용 비밀번호를 운영에 재사용하지 않음

---

## Phase 2. Database / Prisma

구간: **개발·로컬 검증** · 선행: 0~1

### 모델과 Migration

필드 목록을 이 문서에 중복 정의하지 않는다. [데이터 모델 명세](<MyFit Log 데이터 모델 명세.md>)의 19개 엔티티를 기준으로 구현한다.

- [x] User / Session / UserGoal / UserPreference
- [x] Exercise / ExerciseFavorite
- [x] WorkoutSession / WorkoutExercise / WorkoutSet
- [x] WorkoutRoutine / RoutineExercise / CardioRecord
- [x] Food / FoodFavorite / Meal / MealFood
- [x] MealPreset / MealPresetFood / BodyRecord
- [x] Prisma 설치·Client 생성·DATABASE_URL 연결·개발 migration
- [x] FK / unique / index / CHECK / 삭제·archive 정책
- [x] 날짜·UTC·Decimal·단위·주간 집계 계약을 공통 코드로 정의
- [x] 일반 사용자에게 다른 사용자의 데이터·개인 카탈로그 연결을 허용하지 않는 저장 경계

### Seed

- [x] 고정 catalogKey로 멱등 공용 운동 seed
- [x] Bench Press / Squat / Deadlift / Shoulder Press / Lat Pulldown / Barbell Row / Pull Up
- [x] Leg Press / Leg Extension / Leg Curl / Lateral Raise / Biceps Curl / Triceps Pushdown
- [x] 유산소 7종: 러닝 / 줄넘기 / 걷기 / 사이클 / 계단 오르기 / 수영 / 기타 유산소
- [x] Exercise.trackingType / cardioInputMode와 고정 catalogKey 설정 (데이터 모델의 seed 표 준수)
- [x] seed 재실행 후 웨이트 13종·유산소 7종 중복 없음
- [x] 운영 seed에 기본 비밀번호·샘플 개인정보를 넣지 않음

### 완료 조건

- [x] 빈 DB에서 모든 migration 적용과 Client 생성 성공
- [x] seed 재실행 시 중복 없음
- [x] 유효하지 않은 수치·중복 순서·중복 일자 신체 기록·깨진 FK 거부
- [x] snapshot 보존, 루틴 복사, cascade/Restrict 정책 검증

---

## Phase 3. API 기반 구조

구간: **개발·로컬 검증** · 선행: 0~2

### NestJS 기본 구성

- [x] ConfigModule
- [x] PrismaModule
- [x] ValidationPipe
- [x] Global Exception Filter
- [x] Logging
- [x] API Versioning
- [x] OpenAPI / Swagger

Base URL:

```text
/api/v1
```

---

### Module

- [x] AuthModule
- [x] UserModule
- [x] GoalModule
- [x] SettingsModule
- [x] CardioModule
- [x] CalendarModule
- [x] WorkoutModule
- [x] ExerciseModule
- [x] RoutineModule
- [x] FoodModule
- [x] MealModule
- [x] BodyModule
- [x] DashboardModule
- [x] AnalyticsModule
- [x] HealthModule

---

### 공통 Response

성공:

```json
{
  "data": {}
}
```

실패:

```json
{
  "error": {
    "code": "WORKOUT_NOT_FOUND",
    "message": "Workout not found"
  }
}
```

- [x] Error Code 표준화
- [x] HTTP Status 표준화
- [x] Validation Error 형식 통일

### 추가 완료 조건

- [x] /api/v1은 Next.js를 통해 동일 origin으로 proxy
- [x] /health/live는 프로세스, /health/ready는 DB 연결까지 검사
- [x] 내부 오류·로그에 비밀번호·세션 토큰·연결 문자열을 노출하지 않음

---

## Phase 4. Frontend / Design System

구간: **개발·로컬 검증** · 선행: 0~1

### Next.js 초기 설정

- [x] App Router
- [x] TypeScript Strict
- [x] Tailwind
- [x] shadcn/ui
- [x] ESLint
- [x] Prettier

---

### Theme

- [x] Light Theme
- [x] Dark Theme
- [x] CSS Variable 구성

Color Token:

```text
background

surface

primary

secondary

muted

success

warning

danger

border
```

---

### Typography

- [x] Pretendard 적용
- [x] Font scale 정의
- [x] Heading 정의
- [x] Body 정의
- [x] Caption 정의

---

### Core Components

- [x] Button
- [x] Input
- [x] NumberInput
- [x] Card
- [x] Dialog
- [x] BottomSheet
- [x] Dropdown
- [x] Tabs
- [x] SearchInput
- [x] ProgressBar
- [x] ProgressCircle
- [x] StatCard
- [x] DatePicker
- [x] Toast
- [x] Skeleton
- [x] EmptyState

---

### Layout

Desktop:

- [x] Sidebar
- [x] Header
- [x] Main Content

Mobile:

- [x] Bottom Navigation
- [x] Floating Quick Add Button
- [x] Mobile Header

---

### Responsive

검증:

- [x] 375px
- [x] 390px
- [x] 430px
- [x] 768px
- [x] 1024px
- [x] 1440px

---

## Phase 5. Authentication

구간: **개발·로컬 검증** · 선행: 2~4

### Backend

- [x] 개인 계정 생성·비밀번호 재설정 관리 명령 (공개 회원가입 없음)
- [x] Login
- [x] Logout
- [x] Session 생성
- [x] HttpOnly Cookie
- [x] Secure Cookie
- [x] Password Argon2id Hash
- [x] Auth Guard

---

### Frontend

- [x] `/login`
- [x] Login Form
- [x] 인증 상태 조회
- [x] Unauthorized Redirect
- [x] Logout

---

### 완료 조건

- [x] 로그인하지 않으면 Dashboard 접근 불가
- [x] 로그인 후 Dashboard 이동
- [x] Browser refresh 후 로그인 유지
- [x] Logout 후 Session 제거

### 추가 완료 조건

- [x] DB Session tokenHash·만료·폐기와 서버 재시작 후 세션 유지
- [x] SameSite·Origin 검증·로그인 rate limit·소유권 검사 기본 적용
- [x] 개발 HTTP / 운영 HTTPS cookie 차이 검증
- [x] 비밀번호 재설정·SESSION_SECRET 변경 시 기존 세션 무효화
- [x] 만료·로그아웃·다른 사용자 접근·인증 실패 테스트

---

## Phase 6. Settings / Goals

구간: **개발·로컬 검증** · 선행: 5

### Profile

- [x] 이름

### Goal

- [x] 목표 체중
- [x] 일일 Calories
- [x] Protein
- [x] Carbs
- [x] Fat
- [x] Weekly Workout

### App

- [x] Light
- [x] Dark
- [x] System

### 추가 완료 조건

- [x] User.name, UserGoal, UserPreference를 저장하는 조회·수정 API와 /settings 연결
- [x] 초기 목표 null, 미설정 안내, theme 기본 SYSTEM
- [x] weeklyWorkoutGoal은 주간 운동일 1~7로 검증
- [x] 현재 목표 변경 후 Dashboard·Analytics 캐시 갱신
- [x] 목표·설정이 새로고침과 재로그인 후 유지

---

## Phase 7. Workout / Routine / Cardio

구간: **개발·로컬 검증** · 선행: 2~6

본 프로젝트에서 가장 먼저 완성할 핵심 도메인.

---

### 운동 목록

화면:

```text
/workout
```

- [x] 오늘 운동 상태
- [x] 최근 운동
- [x] Routine 목록
- [x] 운동 시작 버튼

---

### 운동 생성

```text
/workout/new
```

- [x] 빈 Workout 생성
- [x] Routine 기반 생성
- [x] 운동 시작시간 저장

---

### Exercise 추가

- [x] Exercise Search
- [x] Recent Exercise
- [x] Favorite Exercise
- [x] Custom Exercise 생성
- [x] Exercise 삭제
- [x] Exercise 순서 변경

---

### Set 기록

각 Set:

```text
Weight
Reps
RPE
Complete
```

- [x] Set 추가
- [x] Set 삭제
- [x] Set 복사
- [x] Set 완료
- [x] 이전 Set 값 자동 입력

---

### Previous Record

운동 선택 시:

```text
Last Workout

80kg × 8
80kg × 8
80kg × 7
```

표시.

- [x] 최근 Workout 조회 API
- [x] 이전 Weight 표시
- [x] 이전 Reps 표시

---

### Workout Complete

- [x] 운동 종료
- [x] 종료시간 기록
- [x] Duration 계산
- [x] 총 Sets
- [x] 총 Volume
- [x] 운동 Summary

---

### Workout History

```text
/workout/history
```

- [x] 날짜별 목록
- [x] Workout 상세보기
- [x] 수정
- [x] 삭제

---

### Routine

```text
/routines
```

- [x] Routine 생성
- [x] Routine 수정
- [x] Routine 삭제
- [x] Exercise 추가
- [x] Exercise 순서 변경
- [x] Routine으로 운동 시작

### 유산소 (MVP P1)

- [x] CardioRecord 생성·조회·수정·삭제를 /workout 및 History에서 제공
- [x] 공통 Exercise의 CARDIO seed에서 러닝 / 줄넘기 / 걷기 / 사이클 / 계단 오르기 / 수영 / 기타 유산소 선택
- [x] 웨이트·유산소 필터, 최근 사용·즐겨찾기·커스텀 유산소 생성
- [x] 날짜·운동시간 필수, 거리·칼로리·평균 심박·메모 선택
- [x] 러닝 등 DISTANCE 종목은 거리, 줄넘기는 repetitions 입력; 입력 방식에 맞지 않는 필드는 거부
- [x] 거리 입력 시 pace 계산, 거리 없음 처리
- [x] 줄넘기 시간·횟수 기록과 이력 수정·삭제, 거리·pace 요구 없음
- [ ] Quick Add에서 유산소 입력 연결 (Phase 13 연동 대기)
- [x] Dashboard 운동시간·주간 운동일·Analytics·Calendar에 반영

### 기록 보존과 완료 조건

- [x] ExerciseFavorite 저장·해제, 공용/개인 종목 소유권 검사
- [x] 카탈로그 삭제는 archive, 세션 내 Exercise 제거는 해당 하위 세트 삭제
- [x] 루틴 변경·삭제가 기존 세션을 바꾸지 않음
- [x] 완료 세트만 volume에 포함; 완료 세션만 주간 웨이트 집계
- [x] Workout revision과 mutationId 계약을 API부터 적용
- [x] 로그인 → 운동 시작 → 80kg × 8 → 완료 → DB 저장 → 최소 Dashboard 반영 검증

---

## Phase 8. Diet / Food / Preset

구간: **개발·로컬 검증** · 선행: 2~6

### Diet 화면

```text
/diet
```

상단:

- [x] Daily Calories
- [x] Protein
- [x] Carbs
- [x] Fat

---

### Meal

구분:

```text
아침
점심
저녁
간식
```

- [x] Meal 생성
- [x] Meal 수정
- [x] Meal 삭제

---

### Food

- [x] Food Search
- [x] Food 생성
- [x] 영양정보 입력
- [x] Serving Size
- [x] Amount 변경
- [x] Food 삭제

---

### Recent Food

- [x] 최근 음식 조회
- [x] 사용 횟수 기반 정렬
- [x] 빠른 추가

---

### Favorite Food

- [x] 즐겨찾기 등록
- [x] 즐겨찾기 해제
- [x] 상단 노출

---

### Meal Preset

MVP에 포함되는 P1 기능.

- [x] Preset 생성
- [x] 여러 Food 저장
- [x] One-click 추가

예:

```text
아침 기본식단

계란 3
밥 200g
두유 1
```

### 추가 완료 조건

- [x] FoodFavorite / MealPreset / MealPresetFood CRUD와 재로그인 후 유지
- [x] servings와 기준 제공량·단위의 의미를 UI/API/DB에 일치시킴
- [x] 영양 snapshot은 서버에서 생성; Food 수정·archive 후 과거 식사 불변
- [x] 프리셋 적용은 최신 음식 값으로 새 Meal 생성; 일부 실패 시 전체 rollback
- [x] 같은 날 같은 식사 구분 여러 건 허용, 화면에서 합산
- [x] 최근순·빈도순 조회, archive 음식 제외

---

## Phase 9. Body

구간: **개발·로컬 검증** · 선행: 2~6

URL:

```text
/body
```

---

### 기록

- [x] Weight
- [x] Body Fat
- [x] Muscle Mass
- [x] Waist
- [x] Memo

---

### 빠른 체중 입력

Dashboard에서도 가능하게 한다.

```text
82.4 kg
```

입력 후 바로 저장.

---

### Body History

- [x] 날짜별 기록
- [x] 수정
- [x] 삭제

---

### Weight Chart

- [x] Daily Weight
- [x] 7-day Moving Average
- [x] 기간 선택

기간:

```text
7D
30D
3M
6M
1Y
```

### 추가 완료 조건

- [x] 사용자·날짜당 1건, 당일 빠른 입력은 갱신
- [x] 체중만 수정해도 나머지 선택 필드 유지
- [x] 7일 평균은 달력일 기준, 미기록일 제외·빈 기간 null 처리

---

## Phase 10. Dashboard

구간: **개발·로컬 검증** · 선행: 6~9

URL:

```text
/dashboard
```

가장 높은 UI 완성도가 필요한 화면.

---

### Today Summary

Card:

- [x] Workout
- [x] Calories
- [x] Protein
- [x] Weight

---

### Goal Progress

- [x] Calories Progress
- [x] Protein Progress
- [x] Carb Progress
- [x] Fat Progress
- [x] Workout Progress

---

### Weight Trend

- [x] 최근 7일
- [x] 7일 평균
- [x] 이전 기간 대비 변화

---

### Weekly Summary

- [x] 주간 운동일 / 목표와 웨이트 완료 횟수 구분
- [x] 총 운동 시간
- [x] 평균 칼로리
- [x] 평균 단백질
- [x] 체중 변화

---

### Recent Workout

- [x] 최근 Workout
- [x] 주요 Exercise
- [x] 총 운동시간

---

### Dashboard API

Frontend에서 여러 API를 따로 호출하지 않는다.

구현:

```text
GET /api/v1/dashboard?date=YYYY-MM-DD
```

Response:

```text
today

nutrition

body

weekly

recentWorkout
```

- [x] 단일 Aggregation API 구현

### 추가 완료 조건

- [x] 운동·식단·신체·목표 변경 후 즉시 재조회/캐시 갱신
- [x] 유산소를 운동시간·운동일에 포함하고 같은 날 운동일 중복 집계 방지
- [x] 미설정 목표·빈 기록·현재 체중 측정일 표시

---

## Phase 11. Analytics

구간: **개발·로컬 검증** · 선행: 7~10

URL:

```text
/analytics
```

---

### Weight

- [x] 체중 Trend
- [x] 7 Day Average
- [x] Start Weight
- [x] Current Weight
- [x] Difference

---

### Workout

- [x] Weekly Workout Count
- [x] Duration
- [x] Volume
- [x] Exercise별 Weight Trend

---

### Nutrition

- [x] Daily Calories
- [x] Average Calories
- [x] Average Protein
- [x] Goal Achievement Rate

---

### Chart

Recharts 사용.

- [x] LineChart
- [x] BarChart
- [x] ResponsiveContainer
- [x] Tooltip
- [x] Empty State
- [x] Mobile 표시 검증

### 추가 완료 조건

- [x] 유산소 시간·거리 추세
- [x] 줄넘기 시간·횟수 및 종목별 이전 기록·기간별 추세
- [x] 누락 날짜·소수 합산·기간 경계는 데이터 모델 집계 규칙 준수
- [x] 목표 달성 비율은 현재 목표 기준이라고 표시; PR/1RM은 후속 범위

---

## Phase 12. Calendar

구간: **개발·로컬 검증** · 선행: 7~10

URL:

```text
/calendar
```

---

### Monthly Calendar

날짜별:

```text
Workout
Meal
Body
```

기록 여부를 보여준다.

- [x] Workout indicator
- [x] Diet indicator
- [x] Weight indicator

---

### 날짜 클릭

표시:

- [x] Workout Summary
- [x] Nutrition Summary
- [x] Body Record

### 추가 완료 조건

- [x] 유산소도 운동 indicator에 포함, 진행 중 웨이트는 별도 표시
- [x] 월 경계·날짜별 상세 조회·빈 날짜 검증

---

## Phase 13. Quick Add

구간: **개발·로컬 검증** · 선행: 7~9

모든 화면에서 접근할 수 있어야 한다.

```text
+
```

클릭:

```text
운동
식단
체중
유산소
```

---

### Desktop

- [ ] Header Quick Add

### Mobile

- [ ] Bottom Navigation 중앙 +

### 추가 완료 조건

- [ ] 운동·식단·체중·유산소 모두 실제 저장 흐름에 연결
- [ ] 물·독립 메모 버튼은 MVP에서 노출하지 않음

---

## Phase 14. Draft / Auto Save

구간: **개발·로컬 검증** · 선행: 5, 7

Workout UX에서 매우 중요.

---

### Local Draft

- [ ] IndexedDB 설정
- [ ] 현재 Workout 임시 저장
- [ ] Set 수정 시 즉시 저장
- [ ] Exercise 추가 시 저장

---

### 복구

Browser 종료 후:

```text
작성 중인 운동 기록이 있습니다.

계속하시겠습니까?
```

- [ ] Draft 탐지
- [ ] 복구 버튼
- [ ] 폐기 버튼

---

### 서버 동기화

```text
Local Update

↓

API

↓

Success

↓

Synced
```

- [ ] Retry
- [ ] Saving 상태
- [ ] Saved 상태
- [ ] Failed 상태

### 추가 완료 조건

- [ ] 데이터 모델의 IndexedDB schemaVersion·계정 격리·revision·mutationId 계약 적용
- [ ] 응답 유실 후 재시도 시 운동·세트 중복 없음
- [ ] 전송 중 후속 편집을 응답 처리로 덮어쓰지 않음
- [ ] 401 / 404 / 409 처리, 충돌 시 로컬 입력 보존
- [ ] 로그아웃 시 미동기화 안내와 계정별 정리
- [ ] IndexedDB 실패·브라우저 재시작·완료 요청 재시도 테스트
- [ ] 작성 중 보존·재시도와 범용 오프라인 동기화의 범위 구분

---

## Phase 15. UX / Keyboard

구간: **개발·로컬 검증** · 선행: 4, 7~14

### Loading

- [ ] Skeleton 적용
- [ ] Layout Shift 최소화

---

### Empty State

예:

```text
아직 운동 기록이 없습니다.

첫 운동을 기록해보세요.
```

- [ ] Dashboard
- [ ] Workout
- [ ] Diet
- [ ] Analytics

---

### Error

사용자 입력 유지.

- [ ] Toast Error
- [ ] Retry
- [ ] Form 데이터 유지

---

### Micro Interaction

- [ ] Set Complete
- [ ] Save Complete
- [ ] Workout Complete
- [ ] Quick Add

Animation:

```text
150 ~ 300ms
```

정도로 제한.

### 키보드 입력

Desktop 사용자용.

- [ ] Tab 이동
- [ ] 운동 세트 Enter는 다음 입력으로 이동, 일반 단일 입력 Form은 저장
- [ ] Cmd/Ctrl + Enter 저장
- [ ] Esc Modal 종료

Workout 입력에서는 키보드만으로 대부분 기록 가능하도록 한다.

### 추가 완료 조건

- [ ] Cmd/Ctrl+Enter 저장, Esc 닫기와 미저장 데이터 처리
- [ ] 375 / 390 / 430 / 768 / 1024 / 1440px에서 주요 화면 검증

---

## Phase 16. Security / Accessibility

구간: **개발·로컬 검증** · 선행: 5~15

### 코드·설정 보안

- [ ] DB Port 외부 노출 X
- [ ] API Port 외부 노출 X
- [ ] Docker Socket 노출 X
- [ ] Password Hash
- [ ] HttpOnly Cookie
- [ ] Secure Cookie
- [ ] CSRF 정책 확인
- [ ] Login Rate Limit
- [ ] Request Validation
- [ ] SQL Injection ORM 처리 확인

### 접근성

- [ ] Button aria-label
- [ ] Keyboard navigation
- [ ] Focus state
- [ ] Input label
- [ ] Color contrast
- [ ] Touch target 최소 크기

### 추가 완료 조건

- [ ] Phase 5부터 구현한 인증·CSRF·rate limit·소유권 처리를 전체 도메인에서 재검증
- [ ] 테스트 사용자 A/B로 소유권 우회·비공개 카탈로그 참조 차단
- [ ] Draft 계정 분리·로그 비밀값 마스킹·archive 정책 검증
- [ ] 실제 운영 포트·HTTPS 검증은 Phase 27에서 별도 수행

---

## Phase 17. API / Unit / Integration Test

구간: **개발·로컬 검증** · 선행: 2~16

각 Domain별 API 테스트.

---

### Auth

- [ ] Login
- [ ] Logout
- [ ] Unauthorized

---

### Workout

- [ ] Create
- [ ] Read
- [ ] Update
- [ ] Delete

---

### Diet

- [ ] Meal CRUD
- [ ] Food CRUD

---

### Body

- [ ] Body Record CRUD

---

### Dashboard

- [ ] Today aggregation

---

### Analytics

- [ ] 기간별 조회

### 단위·통합 테스트

### Backend

- [ ] Service Unit Test
- [ ] Prisma Repository Test
- [ ] API Integration Test

중점 대상:

```text
Workout Volume 계산

Calories 합산

Macro 합산

7일 체중 평균

Dashboard Aggregation
```

### 추가 완료 조건

- [ ] Settings / Goals / Routine / Favorites / Preset / Cardio / Calendar API 검증
- [ ] 실제 PostgreSQL 테스트 DB에서 migration·FK·unique·CHECK 검증
- [ ] session 만료·CSRF·소유권·로그인 제한 회귀 테스트
- [ ] snapshot 불변·cascade·archive·루틴/프리셋 transaction rollback
- [ ] 날짜 경계·미기록일·목표 미설정·Decimal 집계
- [ ] Draft 중복 재시도·revision 충돌·완료 경합 테스트

---

## Phase 18. E2E / 로컬 성능 / URL 검증

구간: **개발·로컬 검증** · 선행: 17

핵심 사용자 흐름 기준으로 테스트한다.

---

### Scenario 1

```text
로그인

↓

운동 시작

↓

Bench Press 추가

↓

80kg × 8 기록

↓

운동 완료

↓

Dashboard 확인
```

- [ ] 정상

---

### Scenario 2

```text
식단 추가

↓

닭가슴살

↓

밥

↓

계란

↓

Nutrition Summary 확인
```

- [ ] 정상

---

### Scenario 3

```text
체중 82.4 입력

↓

Dashboard 반영

↓

Weight Chart 반영
```

- [ ] 정상

---

### Scenario 4

```text
운동 중 Browser 종료

↓

다시 접속

↓

Draft 복구
```

- [ ] 정상

### 로컬 성능

목표:

```text
Initial Load
< 1.5 sec

UI Interaction
< 100 ms 체감

Record Save
< 500 ms 일반 환경
```

체크:

- [ ] Bundle size
- [ ] Dynamic Import
- [ ] Chart Lazy Load
- [ ] Query Cache
- [ ] Database Index

### 최종 URL·Navigation

검증:

```text
/login

/dashboard

/workout

/workout/new

/workout/history

/routines

/diet

/body

/analytics

/calendar

/settings
```

- [ ] 전 페이지 접근
- [ ] Navigation 연결
- [ ] Mobile navigation 연결

### 추가 완료 조건

- [ ] 목표 변경 → Dashboard 반영, 루틴 시작, 즐겨찾기·프리셋 재사용 E2E
- [ ] 유산소 입력 → 운동일·시간·Calendar 반영 E2E
- [ ] 러닝 30분/5km → pace 6분/km, 줄넘기 10분/1,000회 → 재조회·수정·삭제 E2E
- [ ] 375/390/430px 모바일 viewport와 1440px desktop에서 핵심 흐름
- [ ] API 끊김·Draft 복구·재로그인·동일 요청 재시도
- [ ] 성능 측정은 production build 사용, 장비·데이터량·네트워크·측정 횟수 기록
- [ ] 초기 로딩은 LCP, 저장은 요청~응답, 입력 반응은 사용자 입력~화면 갱신으로 구분
- [ ] 에뮬레이션 결과를 실기기 통과로 표시하지 않음

---

## Phase 19. Production Docker / Logging

구간: **배포 준비·격리 검증** · 선행: 18

### Production Dockerfile

Frontend:

- [ ] Multi-stage Build
- [ ] Next.js production build
- [ ] Dev dependency 제외

API:

- [ ] Multi-stage Build
- [ ] NestJS build
- [ ] Prisma Client 생성

---

### Production Compose

Container:

```text
myfit-web-prod

myfit-api-prod

myfit-db-prod
```

- [ ] `compose.prod.yml`
- [ ] Restart Policy
- [ ] Healthcheck
- [ ] Network
- [ ] Persistent Volume

---

### Production Port

Web:

```text
127.0.0.1:3000
```

- [ ] Host expose

API:

- [ ] Host Port 공개하지 않음

DB:

- [ ] Host Port 공개하지 않음

### Production Logging

- [ ] Web Log
- [ ] API Log
- [ ] DB Log

Docker:

```text
max-size

10m
```

```text
max-file

3
```

적용.

### 추가 완료 조건

- [ ] production image에 실행 파일과 Prisma migration 실행 경로 포함
- [ ] 운영 source mount 없이 build image로 실행
- [ ] 별도 Compose project·volume·host port로 로컬 운영 이미지 검증
- [ ] 재생성 후 DB 데이터 유지, 로그 rotation·비밀값 마스킹 확인
- [ ] 테스트와 운영 volume 분리; 실제 운영 DB에는 접근하지 않음

---

## Phase 20. 환경변수 / 배포 / Migration 준비

구간: **배포 준비·격리 검증** · 선행: 19

이 Phase는 **설정 계약·스크립트 작성과 격리 환경 리허설**이다. 실제 운영 값 적용은 Phase 23, 실제 운영 배포는 Phase 24다.

### 환경변수 계약

- [ ] .env.example 및 운영 예제 파일 작성; 실제 .env.production은 Git 제외
- [ ] POSTGRES_DB / POSTGRES_USER / POSTGRES_PASSWORD / DATABASE_URL
- [ ] SESSION_SECRET / APP_URL / INTERNAL_API_URL / NODE_ENV
- [ ] APP_TIMEZONE=Asia/Seoul, BACKUP_DIR, BACKUP_RETENTION_DAYS=7
- [ ] 각 변수의 소비 서비스·기본값·필수 여부·비밀 여부 문서화
- [ ] Compose 변수 치환과 서비스 env 주입을 구분하고 명시적 --env-file 사용
- [ ] 운영 APP_URL은 실제 HTTPS 주소; INTERNAL_API_URL은 Docker 내부 api 주소
- [ ] 필수값 누락·약한 기본 비밀값·잘못된 URL은 시작 전 검사
- [ ] 비밀값 생성 도구와 권한 제한 안내, 예제·로그·Git에 원문 비밀값 없음

### 배포와 Migration

- [ ] scripts/deploy.sh: 설정 검사 → 이미지 build → DB 준비 → backup → migrate deploy → 서비스 기동 → health
- [ ] 최초 빈 DB 배포와 데이터가 있는 DB 업데이트를 구분
- [ ] 첫 계정 생성·멱등 운동 seed 절차
- [ ] backup 또는 migration 실패 시 다음 배포 단계 중단
- [ ] 이전 이미지 식별자 보존, 코드 rollback과 DB restore를 구분
- [ ] migration이 이전 코드와 호환되는지 확인; 무조건 자동 역 migration하지 않음
- [ ] 격리 DB에서 빈 DB 설치·기존 데이터 업데이트·실패 경로 검증
- [ ] 실제 운영 실행·주소 확정은 완료로 표시하지 않음

---

## Phase 21. Backup / Restore 준비

구간: **배포 준비·격리 검증** · 선행: 19~20

### Backup Script

```text
scripts/backup.sh
```

- [ ] `pg_dump`
- [ ] gzip
- [ ] Timestamp filename

예:

```text
myfit-2026-09-27-0300.sql.gz
```

---

### Backup Retention

MVP:

- [ ] Daily Backup
- [ ] 7일 보관

향후:

```text
Daily 7
Weekly 4
Monthly 6
```

### Restore

```text
scripts/restore.sh
```

- [ ] DB Stop 여부 검토
- [ ] Backup 선택
- [ ] PostgreSQL Restore
- [ ] 데이터 검증

중요:

**백업 생성만 확인하면 안 된다. Restore가 실제 동작하는지 반드시 테스트한다.**

### 추가 완료 조건

- [ ] 이 단계의 모든 backup/restore 검증 대상은 격리된 테스트 DB
- [ ] dump 실패 검출, 임시 파일 후 완료 파일 확정, 보관 기간 정책
- [ ] scripts/backup.sh / scripts/restore.sh / 운영 스케줄 등록 예제 작성
- [ ] restore 대상 DB·백업 파일 확인, 기존 데이터 대체 여부를 명시
- [ ] 백업을 새 DB로 복원해 관계·행 수·대표 집계 비교
- [ ] 손상 파일·실패한 dump·잘못된 대상·부분 복구 실패 처리
- [ ] 실제 백업 경로·일일 스케줄 적용은 Phase 25에서 확인

---

## Phase 22. 개발 완료 판정

구간: **배포 준비·격리 검증** · 선행: 0~21

다음 항목이 모두 통과하면 **개발 완료·운영 적용 대기** 상태다. 실제 외부 접속·덮개·재부팅 검증은 아직 완료가 아니다.

- [ ] Phase 0~21의 체크리스트 완료 또는 미완료 사유를 명시 (필수 미완료가 있으면 통과 불가)
- [ ] P0/P1 모든 기능: 인증·설정·웨이트·유산소·식단·신체·루틴·즐겨찾기·프리셋·Dashboard·Analytics·Calendar·Draft
- [ ] lint / typecheck / production build / 단위·통합·E2E 통과
- [ ] 별도 운영 이미지 환경에서 login → record → aggregate smoke test 통과
- [ ] backup → 새 격리 DB restore → 데이터 비교 성공
- [ ] README에 개발·검증·배포·계정 생성·복구 명령 정리
- [ ] 운영자가 제공해야 할 계정·장비·APP_URL·백업 경로 목록 정리
- [ ] 실행 명령·측정 결과·잔여 운영 검증을 구분한 인수 기록

문서만 작성하거나 테스트 코드를 생성한 상태는 통과가 아니다. 실제 실행 결과가 필요하다.

---

## Phase 23. MacBook 서버 / 운영 환경변수 적용

구간: **실제 운영 적용·검증** · 선행: 22

MacBook Pro를 실제 서버로 구성한다.

---

### 기본 설정

- [ ] 전원 Adapter 상시 연결
- [ ] 안정적인 Wi-Fi 또는 Ethernet
- [ ] macOS 업데이트 상태 확인

---

### Sleep

- [ ] 화면 OFF 시 자동 Sleep 방지
- [ ] Wake for Network Access
- [ ] Lid Close 검증에 필요한 장비·설정 준비 (실제 검증은 Phase 26)

---

### Docker

- [ ] Docker 자동 시작
- [ ] 로그인 후 Docker Engine 시작
- [ ] Production Container 자동 시작 설정 확인 (실제 복구 검증은 Phase 26)

---

### Restart

Compose:

```text
restart: unless-stopped
```

- [ ] web
- [ ] api
- [ ] db

모두 적용.

### 실제 운영 값 적용

- [ ] 운영 MacBook에 repository/배포 파일과 Docker 실행 권한 확보
- [ ] 서버에 Tailscale 설치·로그인·장치 등록, 장치 DNS 이름으로 운영 HTTPS 주소 확정; 로그인은 운영자 참여
- [ ] 운영 .env.production 생성·파일 권한 제한·Git 제외 확인
- [ ] 실제 DB 비밀번호·SESSION_SECRET 생성, DATABASE_URL·APP_URL·INTERNAL_API_URL 확정
- [ ] 백업 저장 경로·용량·권한·보관 일수 확정
- [ ] 개발·운영 DB 이름·volume·Compose project 분리, host port 충돌 해소
- [ ] 물리 전원·네트워크·macOS 설정과 Docker 로그인 후 시작 동작 기록
- [ ] 이 단계의 설정만으로 장시간/덮개 운영이 검증됐다고 간주하지 않음

---

## Phase 24. Tailscale / 첫 운영 배포

구간: **실제 운영 적용·검증** · 선행: 23

### 연결 준비

- [ ] Phase 23에서 등록한 서버 Tailscale 연결·장치 상태 확인
- [ ] tailnet HTTPS 인증서 기능 활성화·접근 제어 확인
- [ ] 실제 Tailscale HTTPS 주소와 APP_URL 일치
- [ ] 스마트폰·다른 PC에 Tailscale 설치·로그인, 허용된 tailnet 접속

### 첫 운영 배포

- [ ] Phase 20의 검증된 deploy.sh로 초기 DB migration·공용 운동 seed·이미지 실행
- [ ] 관리 명령으로 개인 계정 생성 (비밀번호를 로그에 남기지 않음)
- [ ] web → api → db readiness와 로컬 운영 페이지 확인
- [ ] Tailscale Serve의 HTTPS → localhost:3000 연결 설정
- [ ] 터미널 종료 이후에도 Serve 설정이 유지되는 운영 실행 방식 확인
- [ ] 실제 HTTPS에서 Login·Secure cookie·동일 origin API proxy 확인

### 외부 네트워크 검증

같은 Wi-Fi에서만 테스트하지 않는다. 스마트폰 Wi-Fi OFF → LTE/5G → Tailscale → MyFit URL 순서로 접속한다.

- [ ] 실제 Dashboard 접속·Login·API 응답
- [ ] 운동·러닝·줄넘기·식단·체중 생성, 재접속 후 조회
- [ ] 다른 PC에서도 같은 기록 조회
- [ ] 일반 인터넷 공개가 아닌 허용된 tailnet 기기 접근 확인
- [ ] 실제 장치·네트워크·URL·검증 결과 기록

---

## Phase 25. 운영 Backup / Migration / Restore 검증

구간: **실제 운영 적용·검증** · 선행: 24

### 운영 백업과 스케줄

- [ ] 실제 운영 DB의 pg_dump가 운영 백업 경로에 생성됨
- [ ] 일일 실행 스케줄 등록, 7일 보관·권한·실패 로그 확인
- [ ] 스케줄에 의한 실행 결과를 확인 (스크립트 수동 성공만으로 완료하지 않음)
- [ ] Mac의 실제 DB volume과 백업 파일 위치를 인수 문서에 기록

### Migration / Restore 검증

- [ ] 운영 배포 명령이 migration 전 backup을 호출하는지 확인
- [ ] 현재 운영 백업을 별도 임시 DB/volume에 restore
- [ ] 대표 운동·영양·체중 조회 및 행 수·관계·집계 비교
- [ ] 검증용 restore로 운영 DB를 덮어쓰지 않음
- [ ] 운영 DB 교체 복구 절차: 쓰기 중단·대상 확인·복원·검증·서비스 재개 문서화
- [ ] 실제 schema 변경이 없으면 no-op migrate 상태 확인; 신규 변경의 실패 리허설은 Phase 20 격리 검증 증거 사용

---

## Phase 26. Lid Closed / Reboot Recovery

구간: **실제 운영 적용·검증** · 선행: 25

덮개를 닫은 뒤 실제 서버처럼 테스트한다.

---

### Test 1

```text
Lid Close

↓

5분

↓

외부 접속
```

- [ ] 정상

---

### Test 2

```text
30분
```

- [ ] 정상

---

### Test 3

```text
1시간
```

- [ ] 정상

---

### Test 4

```text
6시간
```

- [ ] 정상

---

### Test 5

```text
Overnight
```

- [ ] 정상

### 재부팅 복구

Mac 재부팅 테스트.

```text
Mac Reboot

↓

Docker

↓

Containers

↓

Tailscale

↓

Application
```

검증:

- [ ] DB 자동 시작
- [ ] API 자동 시작
- [ ] Web 자동 시작
- [ ] Tailscale 연결
- [ ] 기존 데이터 유지
- [ ] 외부 접속 성공

### 추가 완료 조건

- [ ] 전원·외장 장비·macOS 버전·덮개 상태·실제 대기 시간 기록
- [ ] Mac 재부팅 후 필요한 macOS 로그인과 Docker 시작 확인
- [ ] 로그인 전 자동 복구와 로그인 후 복구를 구분; 무인 복구가 확인되지 않으면 그렇게 명시
- [ ] 장시간 접속뿐 아니라 실제 기록 저장·기존 데이터 유지 확인
- [ ] 덮개 닫기 실패 시 해결·재검증 전 해당 항목 미완료 유지

---

## Phase 27. 장애 복구 / 운영 보안 검증

구간: **실제 운영 적용·검증** · 선행: 26

### 장애 복구

- [ ] API/Web 프로세스 비정상 종료를 재현하고 restart 정책·오류 UI·복구 확인
- [ ] DB 비정상 종료·복구 후 API 재연결과 기존 데이터 유지
- [ ] 명시적 docker stop은 수동 정지 시나리오로 분리하고 명시적 start/up으로 복구
- [ ] 네트워크 OFF → ON 후 Tailscale 재연결·서비스 복구
- [ ] DB 미준비·health 실패·디스크/백업 실패의 진단 로그 확인
- [ ] 쓰기 요청 실패 중 사용자 입력·Draft 유지

`restart: unless-stopped`는 수동으로 정지한 컨테이너를 자동 재시작하는 테스트와 구분해야 한다. [Docker restart 정책](https://docs.docker.com/engine/containers/start-containers-automatically/)에 따라 비정상 프로세스 종료와 수동 정지의 기대 결과를 분리한다.

### 운영 보안

- [ ] web만 127.0.0.1:3000에 bind, API·DB host port 비공개
- [ ] Docker socket·DB·API가 tailnet/외부에 직접 공개되지 않음
- [ ] 실제 HTTPS에서 Secure / HttpOnly / SameSite cookie·Origin 검증
- [ ] 실제 로그인 제한·인증 만료·잘못된 입력·비공개 데이터 접근 거부
- [ ] 로그에 cookie·비밀번호·SESSION_SECRET·DATABASE_URL 원문 없음
- [ ] 허용된 tailnet 기기 접근 범위와 앱 인증을 함께 확인

---

## Phase 28. 실제 Mobile / 운영 성능 검증

구간: **실제 운영 적용·검증** · 선행: 24~27

실제 스마트폰에서 테스트한다.

---

### Dashboard

- [ ] Scroll
- [ ] Cards
- [ ] Chart
- [ ] Bottom Navigation

---

### Workout

- [ ] Weight Input
- [ ] Reps Input
- [ ] Keyboard 올라왔을 때 UI
- [ ] Set 추가
- [ ] Exercise 추가

---

### Diet

- [ ] Food Search
- [ ] Amount 입력
- [ ] Bottom Sheet

---

### Body

- [ ] Weight Number Input

### 운영 성능과 실기기

- [ ] 유산소·목표 설정·프리셋·Draft 복구도 실제 스마트폰에서 검증
- [ ] 키보드 노출·스크롤·touch target·Bottom Sheet·focus·차트 확인
- [ ] 실제 LTE/5G와 운영 MacBook에서 LCP·저장 응답·입력 반응 측정
- [ ] 목표: 초기 LCP < 1.5초, UI 반응 < 100ms, 일반 환경 저장 응답 < 500ms
- [ ] 기기·브라우저·네트워크·데이터량·측정 횟수·결과 기록
- [ ] 목표 미달 원인과 수정·재측정 결과 기록; 로컬 수치를 운영 수치로 대체하지 않음

---

## Phase 29. MVP 최종 검증 / 실사용

구간: **실제 운영 적용·검증** · 선행: 0~28

다음 조건을 모두 충족하면 MVP 완료로 본다.

---

### Infrastructure

- [ ] Docker 개발환경 정상
- [ ] Docker 운영환경 정상
- [ ] PostgreSQL Persistence 정상

---

### Authentication

- [ ] Login
- [ ] Logout
- [ ] Session

---

### Workout

- [ ] 운동 생성
- [ ] Exercise 추가
- [ ] Set 기록
- [ ] 운동 완료
- [ ] History
- [ ] Routine

---

### Diet

- [ ] Meal 생성
- [ ] Food 생성
- [ ] 영양정보 계산
- [ ] 최근 음식

---

### Body

- [ ] 체중
- [ ] 체지방
- [ ] 근육량
- [ ] History

---

### Dashboard

- [ ] Today Summary
- [ ] Nutrition
- [ ] Workout
- [ ] Weight
- [ ] Weekly Summary

---

### Analytics

- [ ] Weight Chart
- [ ] Workout Chart
- [ ] Nutrition Chart

---

### UX

- [ ] Responsive
- [ ] Loading
- [ ] Empty State
- [ ] Error State
- [ ] Toast
- [ ] Draft

---

### Production

- [ ] MacBook 배포
- [ ] Lid Closed 작동
- [ ] Docker 자동 시작
- [ ] Tailscale HTTPS
- [ ] 스마트폰 외부 접속

---

### Data Safety

- [ ] Daily Backup
- [ ] Restore 검증
- [ ] DB Volume 유지

### 누락 없는 기능·운영 인수

- [ ] Settings / Goals / Theme, Cardio, Favorites, Meal Preset, Calendar 완료
- [ ] Phase 22 개발 완료 증거와 Phase 23~28 운영 검증 증거 확인
- [ ] 치명적 데이터 손실·인증·외부 접속·복구 미해결 항목 없음

### 1~2주 실사용 검증

- [ ] 실제 운동·식단·체중을 매일 기록하고 사용 기간 기록
- [ ] 운동 중 세트 입력과 이전 기록 확인이 편리함
- [ ] 자주 먹는 음식·프리셋 반복 입력이 빠름
- [ ] Dashboard에 필요한 상태가 바로 보이고 모바일 화면 이동이 과도하지 않음
- [ ] 체중 입력 5초, 운동 시작 5초, 세트 입력 3~5초 목표 평가
- [ ] 반복 식단 10초, 새 식단 30초 목표 평가
- [ ] 사용 중 발견한 문제 수정·회귀 검증 및 최종 인수 기록

모든 필수 항목을 충족한 시점을 MVP 완료로 기록한다. P2 기능은 이 판정에 포함하지 않는다.

---

## 부록 A. 기존 상세 Phase 번호 대응표

이 표의 “기존” 번호는 개정 전 상세 체크리스트 0~36을 의미한다. 과거 상단 요약 0~17과 아키텍처의 별도 1~6 번호는 폐기했다.

| 기존 번호 / 내용 | 새 Phase | 변경 |
|---|---|---|
| 0~5 기반·인증 | 0~5 | 동일, 세션·계정 생성 정책 보완 |
| 6 Workout | 7 | 유산소와 즐겨찾기 누락 보완 |
| 7 Diet | 8 | FoodFavorite·MealPreset 모델 연결 |
| 8 Body | 9 | 일자당 1건·부분 수정 정책 명시 |
| 9 Dashboard | 10 | Settings 이후 배치 |
| 10 Analytics | 11 | 집계 규칙 명시 |
| 11 Calendar | 12 | 유산소 포함 |
| 12 Quick Add | 13 | 네 기록 유형 연결 |
| 13 Draft | 14 | revision·재시도·충돌 계약 |
| 14 UX / 15 Keyboard | 15 | 통합 |
| 16 API / 17 Unit·Integration | 17 | 통합 |
| 18 E2E | 18 | URL·로컬 성능 검증 포함 |
| 19 Production Docker | 19 | 로컬 운영 이미지 검증 |
| 20 환경변수 | 20 / 23 | 계약·예제와 실환경 적용 분리 |
| 21 Migration | 20 / 24~25 | 격리 리허설과 운영 적용 분리 |
| 22 Backup / 23 Restore | 21 / 25 | 스크립트·격리 복구와 운영 검증 분리 |
| 24 MacBook | 23 | 실제 환경변수 적용 포함 |
| 25 Tailscale | 24 | 첫 배포와 외부 접속 포함 |
| 26 Lid / 27 Reboot | 26 | 실제 장비 검증 통합 |
| 28 장애 테스트 | 27 | 수동 정지와 crash 구분 |
| 29 Security | 16 / 27 | 코드 검증과 운영 검증 분리 |
| 30 Logging | 19 / 27 | 설정과 실환경 확인 분리 |
| 31 Mobile | 28 | 실제 스마트폰 검증 |
| 32 Performance | 18 / 28 | 로컬·운영 측정 분리 |
| 33 Accessibility | 16 / 28 | 구현·브라우저와 실기기 검증 |
| 34 URL | 18 | 개발 완료 전에 검증 |
| 35 Settings | 6 | Dashboard 이전으로 이동 |
| 36 DoD / 기존 실사용 절 | 22 / 29 | 개발 완료와 최종 MVP 완료 분리 |

## 부록 B. 구현 원칙

- 기능별로 UI → API → DB → 조회까지 완성하고 테스트한다. 모든 Backend를 먼저 완성하는 방식으로 진행하지 않는다.
- 처음에는 로그인·웨이트 기록·Dashboard 한 흐름을 완성한 뒤 식단·신체·유산소로 확장한다.
- Microservices·Kubernetes·Redis·Kafka·별도 Analytics DB·AI·Native App을 선도입하지 않는다.
- 개발·테스트·복구 리허설과 실제 운영 DB/volume을 분리한다.
- 코드 구현과 실제 운영 검증은 같은 체크로 합치지 않는다. 사용자 기기에서 관찰하지 않은 결과를 통과로 기록하지 않는다.
- 개발 완료부터 실제 운영까지: 검증된 코드 → 운영 장비·값 확정 → 이미지 build → backup → migration → 기동 → health → Tailscale 외부 접속 → 복구·실기기·실사용 검증.
