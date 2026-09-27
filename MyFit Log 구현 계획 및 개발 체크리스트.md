# MyFit Log 구현 계획 및 개발 체크리스트

## 1. 문서 목적

본 문서는 개인 운동·식단 관리 웹 서비스 **MyFit Log**의 실제 구현 순서와 완료 조건을 정의한다.

관련 문서:

- PRD
- 기술 아키텍처 설계서
- 본 구현 계획 체크리스트

개발 환경:

```text
Frontend
Next.js + TypeScript

Backend
NestJS + TypeScript

Database
PostgreSQL + Prisma

UI
Tailwind CSS + shadcn/ui

State
TanStack Query + Zustand

Infra
Docker Compose

Production Host
MacBook Pro

External Access
Tailscale
```

---

# 2. 개발 목표

MVP에서 반드시 완성할 흐름은 다음과 같다.

```text
로그인

↓

Dashboard

↓

운동 / 식단 / 체중 기록

↓

PostgreSQL 저장

↓

Dashboard 즉시 반영

↓

Analytics 확인

↓

MacBook 서버 배포

↓

외부 스마트폰/PC 접속
```

MVP 완료 기준:

```text
사용자가 외부에서 웹페이지에 접속하고

운동
식단
체중

을 기록할 수 있으며

기록 데이터를

Dashboard
History
Analytics

에서 다시 확인할 수 있다.
```

---

# 3. 전체 구현 Phase

```text
Phase 0
프로젝트 초기화

Phase 1
Docker 개발환경

Phase 2
Database / Prisma

Phase 3
API 기반 구조

Phase 4
Frontend / Design System

Phase 5
Authentication

Phase 6
Workout

Phase 7
Diet

Phase 8
Body

Phase 9
Dashboard

Phase 10
Analytics / Calendar

Phase 11
Draft / UX 안정화

Phase 12
Testing

Phase 13
Production Docker

Phase 14
MacBook 서버 구성

Phase 15
Tailscale 외부 접속

Phase 16
Backup / Recovery

Phase 17
최종 검증
```

---

# 4. 우선순위 정의

## P0

MVP에 반드시 필요한 기능.

```text
인증
운동 기록
식단 기록
체중 기록
Dashboard
Database
외부 접속
```

## P1

MVP 완성도를 높이는 기능.

```text
운동 루틴
Food Preset
History
Calendar
Analytics
Draft Auto Save
```

## P2

MVP 이후.

```text
PWA
Offline Sync
Advanced Analytics
PR Tracking
AI Insight
Health Platform 연동
```

---

# Phase 0. 프로젝트 초기화

## 0.1 Repository

- [ ] Git Repository 생성
- [ ] `main` Branch 생성
- [ ] `.gitignore` 작성
- [ ] `.editorconfig` 작성
- [ ] README 생성
- [ ] Node 버전 지정
- [ ] pnpm 설치
- [ ] pnpm workspace 구성

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
└─ README.md
```

### 완료 조건

- [ ] Root에서 dependency 설치 가능
- [ ] Web/API 각각 실행 가능
- [ ] Git clone 후 README만 보고 개발환경 구성 가능

---

# Phase 1. Docker 개발 환경

## 1.1 Development Container

구성:

```text
myfit-web-dev

myfit-api-dev

myfit-db-dev
```

### 체크리스트

- [ ] Web Dockerfile 생성
- [ ] API Dockerfile 생성
- [ ] PostgreSQL Container 추가
- [ ] `compose.dev.yml` 생성
- [ ] `myfit-network` 생성
- [ ] PostgreSQL Volume 생성
- [ ] `.env.development` 구성
- [ ] Container 이름 정의
- [ ] Container restart 정책 설정

---

## 1.2 Local Port

```text
Web
localhost:3000

API
localhost:4000

PostgreSQL
localhost:5432
```

- [ ] Web Port 확인
- [ ] API Port 확인
- [ ] PostgreSQL Port 확인

---

## 1.3 Hot Reload

Frontend:

- [ ] Next.js source volume mount
- [ ] 파일 수정 시 HMR 확인

API:

- [ ] NestJS watch mode
- [ ] 파일 수정 시 자동 reload 확인

---

## 1.4 Health Check

PostgreSQL:

- [ ] `pg_isready`

API:

- [ ] `/health/live`
- [ ] `/health/ready`

Web:

- [ ] Root HTTP health 확인

---

## Phase 1 완료 조건

```text
docker compose -f compose.dev.yml up -d
```

한 번으로:

- [ ] Web 실행
- [ ] API 실행
- [ ] DB 실행
- [ ] Web → API 통신
- [ ] API → DB 통신

가능해야 한다.

---

# Phase 2. Database / Prisma

## 2.1 Prisma 초기화

- [ ] Prisma 설치
- [ ] Prisma Client 설정
- [ ] PostgreSQL 연결
- [ ] `DATABASE_URL` 구성
- [ ] Migration 환경 구성

---

# 2.2 초기 Entity

## User

- [ ] id
- [ ] email
- [ ] passwordHash
- [ ] name
- [ ] createdAt
- [ ] updatedAt

## UserGoal

- [ ] userId
- [ ] targetWeight
- [ ] dailyCalories
- [ ] proteinGoal
- [ ] carbGoal
- [ ] fatGoal
- [ ] stepGoal
- [ ] weeklyWorkoutGoal

---

## BodyRecord

- [ ] id
- [ ] userId
- [ ] date
- [ ] weight
- [ ] bodyFat
- [ ] muscleMass
- [ ] waist
- [ ] memo

---

## Exercise

- [ ] id
- [ ] name
- [ ] category
- [ ] muscleGroup
- [ ] isCustom
- [ ] ownerId nullable

---

## WorkoutSession

- [ ] id
- [ ] userId
- [ ] date
- [ ] startedAt
- [ ] endedAt
- [ ] duration
- [ ] memo

---

## WorkoutExercise

- [ ] id
- [ ] workoutSessionId
- [ ] exerciseId
- [ ] order

---

## WorkoutSet

- [ ] id
- [ ] workoutExerciseId
- [ ] setNumber
- [ ] weight
- [ ] reps
- [ ] rpe
- [ ] completed

---

## WorkoutRoutine

- [ ] id
- [ ] userId
- [ ] name
- [ ] description

---

## RoutineExercise

- [ ] id
- [ ] routineId
- [ ] exerciseId
- [ ] order
- [ ] defaultSets
- [ ] defaultReps

---

## Food

- [ ] id
- [ ] userId nullable
- [ ] name
- [ ] servingSize
- [ ] calories
- [ ] protein
- [ ] carbs
- [ ] fat

---

## Meal

- [ ] id
- [ ] userId
- [ ] date
- [ ] mealType
- [ ] memo

---

## MealFood

- [ ] id
- [ ] mealId
- [ ] foodId
- [ ] amount
- [ ] calories snapshot
- [ ] protein snapshot
- [ ] carbs snapshot
- [ ] fat snapshot

영양정보를 snapshot으로 저장하여 Food 정보가 수정되어도 과거 기록이 바뀌지 않게 한다.

---

# 2.3 Database Constraint

- [ ] Foreign Key 정의
- [ ] Cascade 정책 검토
- [ ] Unique Constraint 정의
- [ ] 날짜 Index 생성
- [ ] `userId + date` Index 생성
- [ ] Workout 조회 Index 생성
- [ ] Meal 조회 Index 생성
- [ ] Body 조회 Index 생성

---

# 2.4 Seed

기본 운동 Seed 작성.

- [ ] Bench Press
- [ ] Squat
- [ ] Deadlift
- [ ] Shoulder Press
- [ ] Lat Pulldown
- [ ] Barbell Row
- [ ] Pull Up
- [ ] Leg Press
- [ ] Leg Extension
- [ ] Leg Curl
- [ ] Lateral Raise
- [ ] Biceps Curl
- [ ] Triceps Pushdown

---

# Phase 3. API 기반 구조

## 3.1 NestJS 기본 구성

- [ ] ConfigModule
- [ ] PrismaModule
- [ ] ValidationPipe
- [ ] Global Exception Filter
- [ ] Logging
- [ ] API Versioning
- [ ] OpenAPI / Swagger

Base URL:

```text
/api/v1
```

---

# 3.2 Module

- [ ] AuthModule
- [ ] UserModule
- [ ] GoalModule
- [ ] WorkoutModule
- [ ] ExerciseModule
- [ ] RoutineModule
- [ ] FoodModule
- [ ] MealModule
- [ ] BodyModule
- [ ] DashboardModule
- [ ] AnalyticsModule
- [ ] HealthModule

---

# 3.3 공통 Response

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

- [ ] Error Code 표준화
- [ ] HTTP Status 표준화
- [ ] Validation Error 형식 통일

---

# Phase 4. Frontend / Design System

## 4.1 Next.js 초기 설정

- [ ] App Router
- [ ] TypeScript Strict
- [ ] Tailwind
- [ ] shadcn/ui
- [ ] ESLint
- [ ] Prettier

---

# 4.2 Theme

- [ ] Light Theme
- [ ] Dark Theme
- [ ] CSS Variable 구성

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

# 4.3 Typography

- [ ] Pretendard 적용
- [ ] Font scale 정의
- [ ] Heading 정의
- [ ] Body 정의
- [ ] Caption 정의

---

# 4.4 Core Components

- [ ] Button
- [ ] Input
- [ ] NumberInput
- [ ] Card
- [ ] Dialog
- [ ] BottomSheet
- [ ] Dropdown
- [ ] Tabs
- [ ] SearchInput
- [ ] ProgressBar
- [ ] ProgressCircle
- [ ] StatCard
- [ ] DatePicker
- [ ] Toast
- [ ] Skeleton
- [ ] EmptyState

---

# 4.5 Layout

Desktop:

- [ ] Sidebar
- [ ] Header
- [ ] Main Content

Mobile:

- [ ] Bottom Navigation
- [ ] Floating Quick Add Button
- [ ] Mobile Header

---

# 4.6 Responsive

검증:

- [ ] 375px
- [ ] 390px
- [ ] 430px
- [ ] 768px
- [ ] 1024px
- [ ] 1440px

---

# Phase 5. Authentication

## 5.1 Backend

- [ ] User Registration
- [ ] Login
- [ ] Logout
- [ ] Session 생성
- [ ] HttpOnly Cookie
- [ ] Secure Cookie
- [ ] Password Argon2id Hash
- [ ] Auth Guard

---

## 5.2 Frontend

- [ ] `/login`
- [ ] Login Form
- [ ] 인증 상태 조회
- [ ] Unauthorized Redirect
- [ ] Logout

---

## 완료 조건

- [ ] 로그인하지 않으면 Dashboard 접근 불가
- [ ] 로그인 후 Dashboard 이동
- [ ] Browser refresh 후 로그인 유지
- [ ] Logout 후 Session 제거

---

# Phase 6. Workout 기능

본 프로젝트에서 가장 먼저 완성할 핵심 도메인.

---

# 6.1 운동 목록

화면:

```text
/workout
```

- [ ] 오늘 운동 상태
- [ ] 최근 운동
- [ ] Routine 목록
- [ ] 운동 시작 버튼

---

# 6.2 운동 생성

```text
/workout/new
```

- [ ] 빈 Workout 생성
- [ ] Routine 기반 생성
- [ ] 운동 시작시간 저장

---

# 6.3 Exercise 추가

- [ ] Exercise Search
- [ ] Recent Exercise
- [ ] Favorite Exercise
- [ ] Custom Exercise 생성
- [ ] Exercise 삭제
- [ ] Exercise 순서 변경

---

# 6.4 Set 기록

각 Set:

```text
Weight
Reps
RPE
Complete
```

- [ ] Set 추가
- [ ] Set 삭제
- [ ] Set 복사
- [ ] Set 완료
- [ ] 이전 Set 값 자동 입력

---

# 6.5 Previous Record

운동 선택 시:

```text
Last Workout

80kg × 8
80kg × 8
80kg × 7
```

표시.

- [ ] 최근 Workout 조회 API
- [ ] 이전 Weight 표시
- [ ] 이전 Reps 표시

---

# 6.6 Workout Complete

- [ ] 운동 종료
- [ ] 종료시간 기록
- [ ] Duration 계산
- [ ] 총 Sets
- [ ] 총 Volume
- [ ] 운동 Summary

---

# 6.7 Workout History

```text
/workout/history
```

- [ ] 날짜별 목록
- [ ] Workout 상세보기
- [ ] 수정
- [ ] 삭제

---

# 6.8 Routine

```text
/routines
```

- [ ] Routine 생성
- [ ] Routine 수정
- [ ] Routine 삭제
- [ ] Exercise 추가
- [ ] Exercise 순서 변경
- [ ] Routine으로 운동 시작

---

# Phase 7. Diet 기능

## 7.1 Diet 화면

```text
/diet
```

상단:

- [ ] Daily Calories
- [ ] Protein
- [ ] Carbs
- [ ] Fat

---

# 7.2 Meal

구분:

```text
아침
점심
저녁
간식
```

- [ ] Meal 생성
- [ ] Meal 수정
- [ ] Meal 삭제

---

# 7.3 Food

- [ ] Food Search
- [ ] Food 생성
- [ ] 영양정보 입력
- [ ] Serving Size
- [ ] Amount 변경
- [ ] Food 삭제

---

# 7.4 Recent Food

- [ ] 최근 음식 조회
- [ ] 사용 횟수 기반 정렬
- [ ] 빠른 추가

---

# 7.5 Favorite Food

- [ ] 즐겨찾기 등록
- [ ] 즐겨찾기 해제
- [ ] 상단 노출

---

# 7.6 Meal Preset

P1 기능.

- [ ] Preset 생성
- [ ] 여러 Food 저장
- [ ] One-click 추가

예:

```text
아침 기본식단

계란 3
밥 200g
두유 1
```

---

# Phase 8. Body 기능

URL:

```text
/body
```

---

## 8.1 기록

- [ ] Weight
- [ ] Body Fat
- [ ] Muscle Mass
- [ ] Waist
- [ ] Memo

---

## 8.2 빠른 체중 입력

Dashboard에서도 가능하게 한다.

```text
82.4 kg
```

입력 후 바로 저장.

---

## 8.3 Body History

- [ ] 날짜별 기록
- [ ] 수정
- [ ] 삭제

---

## 8.4 Weight Chart

- [ ] Daily Weight
- [ ] 7-day Moving Average
- [ ] 기간 선택

기간:

```text
7D
30D
3M
6M
1Y
```

---

# Phase 9. Dashboard

URL:

```text
/dashboard
```

가장 높은 UI 완성도가 필요한 화면.

---

# 9.1 Today Summary

Card:

- [ ] Workout
- [ ] Calories
- [ ] Protein
- [ ] Weight

---

# 9.2 Goal Progress

- [ ] Calories Progress
- [ ] Protein Progress
- [ ] Carb Progress
- [ ] Fat Progress
- [ ] Workout Progress

---

# 9.3 Weight Trend

- [ ] 최근 7일
- [ ] 7일 평균
- [ ] 이전 기간 대비 변화

---

# 9.4 Weekly Summary

- [ ] 주간 운동 횟수
- [ ] 총 운동 시간
- [ ] 평균 칼로리
- [ ] 평균 단백질
- [ ] 체중 변화

---

# 9.5 Recent Workout

- [ ] 최근 Workout
- [ ] 주요 Exercise
- [ ] 총 운동시간

---

# 9.6 Dashboard API

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

- [ ] 단일 Aggregation API 구현

---

# Phase 10. Analytics

URL:

```text
/analytics
```

---

## 10.1 Weight

- [ ] 체중 Trend
- [ ] 7 Day Average
- [ ] Start Weight
- [ ] Current Weight
- [ ] Difference

---

## 10.2 Workout

- [ ] Weekly Workout Count
- [ ] Duration
- [ ] Volume
- [ ] Exercise별 Weight Trend

---

## 10.3 Nutrition

- [ ] Daily Calories
- [ ] Average Calories
- [ ] Average Protein
- [ ] Goal Achievement Rate

---

# 10.4 Chart

Recharts 사용.

- [ ] LineChart
- [ ] BarChart
- [ ] ResponsiveContainer
- [ ] Tooltip
- [ ] Empty State
- [ ] Mobile 표시 검증

---

# Phase 11. Calendar

URL:

```text
/calendar
```

---

## 11.1 Monthly Calendar

날짜별:

```text
Workout
Meal
Body
```

기록 여부를 보여준다.

- [ ] Workout indicator
- [ ] Diet indicator
- [ ] Weight indicator

---

## 11.2 날짜 클릭

표시:

- [ ] Workout Summary
- [ ] Nutrition Summary
- [ ] Body Record

---

# Phase 12. Quick Add

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

## Desktop

- [ ] Header Quick Add

## Mobile

- [ ] Bottom Navigation 중앙 +

---

# Phase 13. Draft / Auto Save

Workout UX에서 매우 중요.

---

## 13.1 Local Draft

- [ ] IndexedDB 설정
- [ ] 현재 Workout 임시 저장
- [ ] Set 수정 시 즉시 저장
- [ ] Exercise 추가 시 저장

---

## 13.2 복구

Browser 종료 후:

```text
작성 중인 운동 기록이 있습니다.

계속하시겠습니까?
```

- [ ] Draft 탐지
- [ ] 복구 버튼
- [ ] 폐기 버튼

---

## 13.3 서버 동기화

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

---

# Phase 14. UX 품질

## 14.1 Loading

- [ ] Skeleton 적용
- [ ] Layout Shift 최소화

---

## 14.2 Empty State

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

## 14.3 Error

사용자 입력 유지.

- [ ] Toast Error
- [ ] Retry
- [ ] Form 데이터 유지

---

## 14.4 Micro Interaction

- [ ] Set Complete
- [ ] Save Complete
- [ ] Workout Complete
- [ ] Quick Add

Animation:

```text
150 ~ 300ms
```

정도로 제한.

---

# Phase 15. Keyboard UX

Desktop 사용자용.

- [ ] Tab 이동
- [ ] Enter 저장
- [ ] Cmd/Ctrl + Enter 저장
- [ ] Esc Modal 종료

Workout 입력에서는 키보드만으로 대부분 기록 가능하도록 한다.

---

# Phase 16. API 검증

각 Domain별 API 테스트.

---

## Auth

- [ ] Login
- [ ] Logout
- [ ] Unauthorized

---

## Workout

- [ ] Create
- [ ] Read
- [ ] Update
- [ ] Delete

---

## Diet

- [ ] Meal CRUD
- [ ] Food CRUD

---

## Body

- [ ] Body Record CRUD

---

## Dashboard

- [ ] Today aggregation

---

## Analytics

- [ ] 기간별 조회

---

# Phase 17. Unit / Integration Test

## Backend

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

---

# Phase 18. E2E 테스트

핵심 사용자 흐름 기준으로 테스트한다.

---

## Scenario 1

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

## Scenario 2

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

## Scenario 3

```text
체중 82.4 입력

↓

Dashboard 반영

↓

Weight Chart 반영
```

- [ ] 정상

---

## Scenario 4

```text
운동 중 Browser 종료

↓

다시 접속

↓

Draft 복구
```

- [ ] 정상

---

# Phase 19. Production Docker

## 19.1 Production Dockerfile

Frontend:

- [ ] Multi-stage Build
- [ ] Next.js production build
- [ ] Dev dependency 제외

API:

- [ ] Multi-stage Build
- [ ] NestJS build
- [ ] Prisma Client 생성

---

# 19.2 Production Compose

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

# 19.3 Production Port

Web:

```text
127.0.0.1:3000
```

- [ ] Host expose

API:

- [ ] Host Port 공개하지 않음

DB:

- [ ] Host Port 공개하지 않음

---

# Phase 20. 환경 변수

Production:

- [ ] `.env.production`
- [ ] DB Username
- [ ] DB Password
- [ ] Session Secret
- [ ] APP_URL
- [ ] INTERNAL_API_URL

---

## Git 확인

아래 파일이 Commit되지 않았는지 확인.

- [ ] `.env`
- [ ] `.env.production`
- [ ] Password
- [ ] Secret
- [ ] Token

---

# Phase 21. Database Migration

Production Deploy 시:

```text
Backup

↓

Migration

↓

Deploy
```

순서를 지킨다.

- [ ] `prisma migrate deploy`
- [ ] Migration 실패 처리
- [ ] Migration 전 Backup

---

# Phase 22. Database Backup

## Backup Script

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

## Backup Retention

MVP:

- [ ] Daily Backup
- [ ] 7일 보관

향후:

```text
Daily 7
Weekly 4
Monthly 6
```

---

# Phase 23. Restore

```text
scripts/restore.sh
```

- [ ] DB Stop 여부 검토
- [ ] Backup 선택
- [ ] PostgreSQL Restore
- [ ] 데이터 검증

중요:

**백업 생성만 확인하면 안 된다. Restore가 실제 동작하는지 반드시 테스트한다.**

---

# Phase 24. MacBook Production Server

MacBook Pro를 실제 서버로 구성한다.

---

## 24.1 기본 설정

- [ ] 전원 Adapter 상시 연결
- [ ] 안정적인 Wi-Fi 또는 Ethernet
- [ ] macOS 업데이트 상태 확인

---

## 24.2 Sleep

- [ ] 화면 OFF 시 자동 Sleep 방지
- [ ] Wake for Network Access
- [ ] Lid Close 상태 테스트

---

## 24.3 Docker

- [ ] Docker 자동 시작
- [ ] 로그인 후 Docker Engine 시작
- [ ] Production Container 자동 시작

---

## 24.4 Restart

Compose:

```text
restart: unless-stopped
```

- [ ] web
- [ ] api
- [ ] db

모두 적용.

---

# Phase 25. Tailscale

## MacBook

- [ ] Tailscale 설치
- [ ] 로그인
- [ ] Machine 등록

---

## Client

테스트 장치:

- [ ] 스마트폰
- [ ] 다른 PC
- [ ] 외부 Mac

---

# 25.1 Tailscale Serve

연결:

```text
HTTPS

↓

localhost:3000
```

- [ ] HTTPS URL 생성
- [ ] Dashboard 접속
- [ ] Login
- [ ] API 정상 호출

---

# 25.2 외부 네트워크 테스트

중요:

같은 Wi-Fi에서만 테스트하지 않는다.

스마트폰:

```text
Wi-Fi OFF

↓

LTE / 5G

↓

Tailscale

↓

MyFit 접속
```

- [ ] 접속 성공
- [ ] Login
- [ ] Workout 생성
- [ ] Diet 생성
- [ ] Weight 생성

---

# Phase 26. MacBook Lid Closed 검증

덮개를 닫은 뒤 실제 서버처럼 테스트한다.

---

## Test 1

```text
Lid Close

↓

5분

↓

외부 접속
```

- [ ] 정상

---

## Test 2

```text
30분
```

- [ ] 정상

---

## Test 3

```text
1시간
```

- [ ] 정상

---

## Test 4

```text
6시간
```

- [ ] 정상

---

## Test 5

```text
Overnight
```

- [ ] 정상

---

# Phase 27. Reboot Recovery

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

---

# Phase 28. 장애 테스트

## API 종료

```text
docker stop myfit-api-prod
```

- [ ] 오류 UI 확인
- [ ] Container 재시작 확인

---

## Web 종료

- [ ] 자동 Restart 확인

---

## DB 종료

- [ ] API 장애 처리 확인
- [ ] DB 재시작 후 연결 복구

---

## Network 끊김

Mac 인터넷:

```text
OFF

↓

ON
```

- [ ] Tailscale 재연결
- [ ] 서비스 자동 복구

---

# Phase 29. Security Check

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

---

# Phase 30. Production Logging

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

---

# Phase 31. Mobile UI 검증

실제 스마트폰에서 테스트한다.

---

## Dashboard

- [ ] Scroll
- [ ] Cards
- [ ] Chart
- [ ] Bottom Navigation

---

## Workout

- [ ] Weight Input
- [ ] Reps Input
- [ ] Keyboard 올라왔을 때 UI
- [ ] Set 추가
- [ ] Exercise 추가

---

## Diet

- [ ] Food Search
- [ ] Amount 입력
- [ ] Bottom Sheet

---

## Body

- [ ] Weight Number Input

---

# Phase 32. Performance

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

---

# Phase 33. Accessibility

- [ ] Button aria-label
- [ ] Keyboard navigation
- [ ] Focus state
- [ ] Input label
- [ ] Color contrast
- [ ] Touch target 최소 크기

---

# Phase 34. 최종 URL 구조

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

---

# Phase 35. Settings

## Profile

- [ ] 이름

## Goal

- [ ] 목표 체중
- [ ] 일일 Calories
- [ ] Protein
- [ ] Carbs
- [ ] Fat
- [ ] Weekly Workout

## App

- [ ] Light
- [ ] Dark
- [ ] System

---

# Phase 36. MVP Definition of Done

다음 조건을 모두 충족하면 MVP 완료로 본다.

---

## Infrastructure

- [ ] Docker 개발환경 정상
- [ ] Docker 운영환경 정상
- [ ] PostgreSQL Persistence 정상

---

## Authentication

- [ ] Login
- [ ] Logout
- [ ] Session

---

## Workout

- [ ] 운동 생성
- [ ] Exercise 추가
- [ ] Set 기록
- [ ] 운동 완료
- [ ] History
- [ ] Routine

---

## Diet

- [ ] Meal 생성
- [ ] Food 생성
- [ ] 영양정보 계산
- [ ] 최근 음식

---

## Body

- [ ] 체중
- [ ] 체지방
- [ ] 근육량
- [ ] History

---

## Dashboard

- [ ] Today Summary
- [ ] Nutrition
- [ ] Workout
- [ ] Weight
- [ ] Weekly Summary

---

## Analytics

- [ ] Weight Chart
- [ ] Workout Chart
- [ ] Nutrition Chart

---

## UX

- [ ] Responsive
- [ ] Loading
- [ ] Empty State
- [ ] Error State
- [ ] Toast
- [ ] Draft

---

## Production

- [ ] MacBook 배포
- [ ] Lid Closed 작동
- [ ] Docker 자동 시작
- [ ] Tailscale HTTPS
- [ ] 스마트폰 외부 접속

---

## Data Safety

- [ ] Daily Backup
- [ ] Restore 검증
- [ ] DB Volume 유지

---

# 37. 권장 실제 개발 순서

기능 단위로 완성하면서 진행한다.

### Sprint 1

```text
Repository

Docker

PostgreSQL

Prisma

NestJS

Next.js
```

목표:

**기본 인프라 완성**

---

### Sprint 2

```text
Auth

User

Goal

Layout

Design System
```

목표:

**로그인 후 기본 Dashboard 진입**

---

### Sprint 3

```text
Workout

Exercise

Set

History

Routine
```

목표:

**운동 기록 기능 완성**

이 단계에서 실제로 며칠 사용해 보는 것이 중요하다.

---

### Sprint 4

```text
Diet

Food

Meal

Nutrition
```

목표:

**식단 기록 기능 완성**

---

### Sprint 5

```text
Body

Weight

Body Fat

Muscle Mass
```

목표:

**신체 기록 완성**

---

### Sprint 6

```text
Dashboard

Analytics

Charts

Calendar
```

목표:

**저장한 데이터를 다시 보는 경험 완성**

---

### Sprint 7

```text
Draft

Auto Save

Error UX

Mobile UX

Responsive
```

목표:

**실사용 가능한 UX 완성**

---

### Sprint 8

```text
Production Docker

MacBook

Tailscale

Backup

Recovery
```

목표:

**외부에서 실제 서비스 사용**

---

# 38. 구현 시 가장 먼저 검증할 Vertical Slice

모든 Backend를 먼저 만들고 Frontend를 나중에 만드는 방식은 피한다.

첫 번째로 아래 전체 흐름 하나를 완성한다.

```text
Login

↓

Dashboard

↓

Start Workout

↓

Bench Press

↓

80kg × 8

↓

Complete Workout

↓

PostgreSQL

↓

Dashboard

↓

Recent Workout
```

이 하나의 흐름을

```text
Frontend

API

Database

UI

UX

Docker
```

전체 Stack으로 먼저 완성한다.

그 다음 Diet / Body로 확장한다.

---

# 39. 개발 중 피해야 할 것

MVP 단계에서 다음 작업에 시간을 과도하게 사용하지 않는다.

- [ ] Microservice 도입 금지
- [ ] Kubernetes 도입 금지
- [ ] Redis 선도입 금지
- [ ] Kafka 도입 금지
- [ ] 복잡한 Event Architecture 금지
- [ ] 별도 Analytics DB 금지
- [ ] AI 기능 선구현 금지
- [ ] Native App 선구현 금지
- [ ] 과도한 Animation 금지

현재 가장 중요한 것은:

```text
기록

↓

저장

↓

조회

↓

분석

↓

실사용
```

이다.

---

# 40. 실제 사용 검증

기술적인 테스트가 완료되어도 실제 사용성이 떨어지면 프로젝트 목표를 달성한 것이 아니다.

MVP 완료 후 최소 1~2주간 직접 사용하며 확인한다.

매일:

```text
운동 기록

식단 기록

체중 기록
```

을 실제로 입력한다.

확인 항목:

- [ ] 운동하면서 입력하기 귀찮지 않은가
- [ ] Set 입력 횟수가 너무 많지 않은가
- [ ] 이전 기록이 충분히 잘 보이는가
- [ ] 식단 기록이 오래 걸리지 않는가
- [ ] 자주 먹는 음식 입력이 빠른가
- [ ] Dashboard에 필요한 정보가 바로 보이는가
- [ ] 모바일에서 충분히 편한가
- [ ] 불필요한 화면 이동이 없는가

---

# 41. MVP 성공 기준

기능 개수보다 다음 기준을 우선한다.

### 체중 기록

```text
5초 이내
```

### 운동 시작

```text
5초 이내
```

### 운동 세트 기록

```text
3~5초 이내
```

### 반복 식단 입력

```text
10초 이내
```

### 새로운 식단 입력

```text
30초 이내
```

### Dashboard 확인

웹사이트 접속 직후 별도 이동 없이:

```text
오늘 운동

오늘 칼로리

오늘 단백질

현재 체중

이번 주 진행률
```

을 확인할 수 있어야 한다.

---

# 42. 최종 개발 완료 흐름

최종적으로 아래 흐름이 모두 정상이어야 한다.

```text
Git Clone

↓

Docker Compose

↓

Local Development

↓

Feature 구현

↓

Test

↓

Git Push

↓

MacBook Pull

↓

Production Build

↓

DB Backup

↓

Migration

↓

Docker Deploy

↓

Health Check

↓

Tailscale

↓

외부 스마트폰 접속

↓

실제 운동/식단 기록
```

이 흐름이 완성되면 MyFit Log의 **MVP 개발 및 개인 운영환경 구축이 완료된 것**으로 정의한다.