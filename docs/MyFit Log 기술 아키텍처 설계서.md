# MyFit Log 기술 아키텍처 설계서

정리 기준일: 2026-09-27. 제품 범위는 [PRD](<개인 운동·식단 관리 웹페이지 PRD.md>), 필드·관계·집계·Draft 규칙은 [데이터 모델](<MyFit Log 데이터 모델 명세.md>)을 따른다. 구현 번호는 [체크리스트](<MyFit Log 구현 계획 및 개발 체크리스트.md>)의 **Phase 0~29**만 사용한다. 본 문서의 1~86은 설명을 위한 장 번호다.

Phase 0~22는 코드·로컬 검증·배포 준비, Phase 23~29는 실제 운영 적용·검증이다. 문서·스크립트 작성과 실제 장비 검증을 별도 완료 상태로 기록한다. [문서 안내](README.md)

## 구현 반영 (2026-09-27)

- 실제 고정 버전·명령은 root package.json / pnpm-lock.yaml / README를 기준으로 한다.
- 서버 상태는 사용자별 TanStack Query cache, 폼은 controlled inputs와 공통 미저장 guard, API 입력은 DTO ValidationPipe/class-validator로 검증한다. 초기 후보 React Hook Form/Zod는 현재 도입하지 않았다.
- DB 제약·snapshot trigger, 서버 세션, 전체 운동 mutation의 revision/hash, IndexedDB 직렬 저장·재전송을 구현했다.
- Phase별 구현·실행 증거는 [개발 작업 기록](development-log.md)에 기록한다. 아래 운영 구조·스크립트 예시는 해당 후속 Phase에서 검증할 설계다.

## 1. 문서 목적

본 문서는 개인 운동·식단 관리 웹 서비스 **MyFit Log**의 기술 아키텍처를 정의한다.

서비스의 초기 목표는 다음과 같다.

- 로컬 개발 환경과 실제 운영 환경의 차이를 최소화
- Frontend / API / Database 완전 분리
- 각 서비스를 Docker Container 기반으로 실행
- MacBook Pro를 실제 운영 서버로 활용
- MacBook을 집에 두고 외부 PC/스마트폰에서 접속
- 공유기 Port Forwarding 없이 외부 접속
- HTTPS 기반 통신
- 운동 중 네트워크 장애가 발생해도 작성 중 기록을 최대한 보존
- 컨테이너 장애 발생 시 자동 복구
- PostgreSQL 데이터 영속성 확보
- DB 자동 백업
- 추후 Linux Mini PC / VPS / Cloud로 쉽게 이전할 수 있는 구조

---

# 2. 전체 기술 구조

## 2.1 Core Architecture

```text
                        External Device
                   Mac / Windows / Mobile
                             │
                             │ HTTPS
                             ▼
                    ┌─────────────────┐
                    │    Tailscale    │
                    │     Serve       │
                    └────────┬────────┘
                             │
                             │ localhost:3000
                             ▼
┌─────────────────────────────────────────────────────┐
│                 MacBook Pro Server                  │
│                                                     │
│   Docker                                            │
│                                                     │
│   ┌──────────────────────┐                          │
│   │ Frontend             │                          │
│   │ Next.js              │                          │
│   │ :3000                │                          │
│   └──────────┬───────────┘                          │
│              │                                      │
│              │ /api/*                               │
│              ▼                                      │
│   ┌──────────────────────┐                          │
│   │ API                  │                          │
│   │ NestJS               │                          │
│   │ :4000                │                          │
│   └──────────┬───────────┘                          │
│              │                                      │
│              │ Prisma                               │
│              ▼                                      │
│   ┌──────────────────────┐                          │
│   │ PostgreSQL           │                          │
│   │ :5432                │                          │
│   └──────────┬───────────┘                          │
│              │                                      │
│              ▼                                      │
│      Docker Named Volume                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

외부에서는 Frontend 하나만 접근할 수 있다.

API와 PostgreSQL은 인터넷에 직접 공개하지 않는다.

---

# 3. 기술 스택

## 3.1 Frontend

```text
Next.js
TypeScript
React

Tailwind CSS
shadcn/ui

TanStack Query
React local state / Context / useSyncExternalStore

Controlled forms / HTML constraints
Nest ValidationPipe / class-validator

Recharts
```

### 역할

- UI 렌더링
- Dashboard
- Workout
- Diet
- Body
- Analytics
- Calendar
- 사용자 입력
- API 호출
- 운동 작성 중 Draft 저장
- Responsive UI
- 모바일 웹 지원

---

# 4. Frontend State Architecture

상태를 세 가지로 구분한다.

```text
Server State
      │
      └─ TanStack Query

UI State
      │
      └─ React local state / Context

Draft / Offline State
      │
      └─ IndexedDB
```

## Server State

서버에서 받아오는 데이터.

예:

```text
운동 기록
식단 기록
체중 기록
Dashboard
Analytics
운동 루틴
음식 목록
```

TanStack Query를 사용한다.

---

## UI State

현재 UI에서만 필요한 상태.

예:

```text
현재 열려 있는 Modal

선택한 날짜

Workout 진행 상태

Quick Add 상태

Sidebar 상태
```

실제 구현은 React local state/Context를 사용한다. 운동 Draft는 useSyncExternalStore에 연결한 전용 동기화 엔진으로 관리한다. 별도 전역 UI store가 필요하지 않아 초기 후보였던 Zustand는 도입하지 않았다.

---

## Draft State

운동 중 입력한 기록은 중요하다.

사용자가 운동 중

```text
Wi-Fi 끊김
LTE/5G 변경
브라우저 종료
페이지 새로고침
```

등을 하더라도 기록이 날아가면 안 된다.

따라서 작성 중 운동은

```text
Browser
   │
   ├─ Memory
   │
   └─ IndexedDB
```

두 곳에 유지한다.

흐름:

```text
운동 입력

↓

Local Draft 즉시 저장

↓

API 저장 요청

↓

성공

↓

Server 데이터와 동기화
```

네트워크 오류 발생 시:

```text
Local Draft 유지

↓

네트워크 복구

↓

Retry

↓

Server Sync
```

---

# 5. API

## Technology

```text
Node.js
NestJS
TypeScript

Prisma ORM

ValidationPipe / class-validator

OpenAPI
```

API Framework로 NestJS를 사용하는 이유는 개인 프로젝트라도 기능 영역이 명확하게 분리되기 때문이다.

```text
Auth

Workout

Diet

Body

Goals

Analytics

Food

Routine
```

---

# 6. API Module Architecture

`apps/api/src` 아래에 기능별 모듈을 둔다.

```text
modules/
  auth/          # Session, 로그인/로그아웃, 계정 관리 명령
  users/         # 프로필
  goals/         # 목표
  settings/      # 사용자 테마
  workouts/      # 웨이트 세션·종목·세트·Draft 동기화 계약
  exercises/     # 웨이트·유산소 공통 카탈로그·즐겨찾기·최근 사용
  routines/      # 웨이트 루틴
  cardio/        # 유산소 기록
  foods/         # 음식·즐겨찾기·최근 사용
  meals/         # 식사·영양 snapshot·식단 프리셋
  body/          # 날짜별 신체 기록
  dashboard/     # 당일·주간 집계
  analytics/     # 기간·종목별 통계
  calendar/      # 날짜별 기록 상태
common/
database/
health/
```

모듈별 소유권 검사를 공통 인증 경계에 연결한다. 소규모 단일 DB이며 기능별 마이크로서비스로 나누지 않는다.

---

# 7. REST API

API version prefix는 `/api/v1`이다. 세부 DTO는 데이터 모델 명세와 동일한 필드·단위·날짜 규칙을 사용한다.

| 영역 | 경로 예시 | 주요 기능 |
|---|---|---|
| Auth | /auth/login, /auth/logout, /auth/me | DB 세션; 공개 /register 없음 |
| User / Goal / Settings | /users/me, /goals, /settings | 조회·수정 |
| Exercise | /exercises, /exercises/:id/favorite | STRENGTH/CARDIO 필터·검색·커스텀·즐겨찾기·최근 사용 |
| Workout | /workouts, /workouts/:id | CRUD·완료·revision 기반 편집 |
| Routine | /routines, /routines/:id/start | CRUD·새 세션 복사 |
| Cardio | /cardio-records, /cardio-records/:id | CARDIO 종목 참조, 시간·거리/횟수 CRUD |
| Food | /foods, /foods/:id/favorite | CRUD·archive·즐겨찾기·최근 사용 |
| Meal / Preset | /meals, /meal-presets, /meal-presets/:id/apply | CRUD·프리셋 적용·영양 snapshot |
| Body | /body-records | 날짜별 기록·부분 수정 |
| Dashboard | /dashboard?date=YYYY-MM-DD | 단일 집계 응답 |
| Analytics | /analytics/weight, /analytics/workouts, /analytics/cardio, /analytics/nutrition | 기간·종목별 추세 |
| Calendar | /calendar?month=YYYY-MM | 날짜별 기록 상태 |

API 응답은 성공 `{ "data": ... }`, 실패 `{ "error": { "code": "...", "message": "..." } }`로 통일한다. Health 경로 `/health/live`, `/health/ready`는 version prefix 밖의 내부 진단 경로다.

생성 POST, 조회 GET, 수정 PATCH, 삭제 DELETE를 기본으로 한다. 카탈로그 삭제는 archive이며 기록 삭제와 구분한다. 운동 재시도·충돌의 401/404/409 처리와 멱등성 계약은 데이터 모델 9절을 따른다.

---

# 8. API 호출 구조

브라우저가 API Container에 직접 접근하지 않는다.

사용자는

```text
https://myfit.xxx.ts.net
```

같은 하나의 Origin만 사용한다.

Frontend에서:

```text
/api/*
```

요청을 받으면 Next.js Server가 내부 API Container로 Proxy 한다.

구조:

```text
Browser

↓

https://myfit.xxx.ts.net/api/v1/workouts

↓

Next.js

↓

http://api:4000/api/v1/workouts

↓

NestJS
```

장점:

- API Port 외부 노출 불필요
- CORS 설정 단순화
- Cookie 인증 단순화
- 외부 Endpoint 하나만 관리
- Tailscale 설정 단순화

---

# 9. Database

## Database

```text
PostgreSQL
```

## ORM

```text
Prisma
```

구조:

```text
NestJS

↓

Prisma

↓

PostgreSQL
```

---

# 10. Database 모델

필드·관계의 단일 기준은 [데이터 모델 명세](<MyFit Log 데이터 모델 명세.md>)다. 이 문서에는 필드 정의를 중복하지 않는다.

| 영역 | 엔티티 |
|---|---|
| 계정·세션·설정 | User, Session, UserGoal, UserPreference |
| 공통 운동 카탈로그 | Exercise, ExerciseFavorite |
| 웨이트 | WorkoutSession, WorkoutExercise, WorkoutSet |
| 루틴 | WorkoutRoutine, RoutineExercise |
| 유산소 | CardioRecord |
| 음식·식사 | Food, FoodFavorite, Meal, MealFood |
| 식단 프리셋 | MealPreset, MealPresetFood |
| 신체 | BodyRecord |

총 19개 엔티티다. 공용 Exercise에는 웨이트 13종과 러닝·줄넘기를 포함한 유산소 7종을 seed한다. trackingType에 따라 STRENGTH는 세트 입력, CARDIO는 시간·거리 또는 횟수 입력을 사용한다. CardioRecord도 Exercise를 참조하므로 검색·즐겨찾기·종목별 이력을 공유할 수 있다.

최근 사용·Dashboard·Analytics·Calendar는 조회로 계산한다. Draft는 IndexedDB에 저장하며 서버의 WorkoutSession revision/mutationId로 중복 요청과 충돌을 처리한다.

---

# 11. Docker Architecture

핵심 Container는 3개다.

```text
myfit-web

myfit-api

myfit-db
```

Docker Compose로 관리한다.

```text
docker compose
```

---

# 12. Docker Network

Docker 내부 Network

```text
myfit-network
```

구조:

```text
web

 │

 ├──────── api:4000

              │

              └──── db:5432
```

Container끼리는 Docker DNS를 이용한다.

따라서 API에서 DB 연결 시

```text
localhost:5432
```

가 아니라

```text
db:5432
```

사용.

Frontend → API 역시

```text
api:4000
```

사용.

---

# 13. Port 정책

## Local Development

개발 시에는 디버깅 편의를 위해 Host Port를 공개한다.

```text
Frontend

localhost:3000


API

localhost:4000


PostgreSQL

localhost:5432
```

---

# 14. Production Port 정책

운영에서는 다르게 한다.

```text
Frontend

127.0.0.1:3000
```

만 Host에 공개한다.

API:

```text
외부 Port 공개 X
```

DB:

```text
외부 Port 공개 X
```

구조:

```text
Internet / Tailscale

        │

        ▼

127.0.0.1:3000

        │

       web

        │

       api

        │

        db
```

특히

```text
5432
```

PostgreSQL Port는 절대 인터넷에 직접 노출하지 않는다.

---

# 15. Local Development Architecture

개발 환경:

```text
MacBook

│

├─ VSCode
│
├─ Browser
│
└─ Docker
     │
     ├─ myfit-web-dev
     │
     ├─ myfit-api-dev
     │
     └─ myfit-db-dev
```

---

# 16. Local Docker Compose

repository root의 `compose.dev.yml`을 사용한다. 실제 Dockerfile·버전·명령은 Phase 0~1 구현 시 고정하고 검증한다.

| 서비스 | Build / 실행 | 연결 |
|---|---|---|
| web | root build context, apps/web/Dockerfile, 개발 target | 127.0.0.1:3000, INTERNAL_API_URL=http://api:4000 |
| api | root build context, apps/api/Dockerfile, 개발 target | 127.0.0.1:4000, DATABASE_URL의 host=db |
| db | 고정된 PostgreSQL 버전 | 127.0.0.1:5432, 개발 전용 volume, pg_isready |

web/api는 workspace 공통 패키지와 소스를 mount하고 각각 HMR/watch를 사용한다. DB 준비 후 API가 시작하도록 health 조건을 둔다. 비밀번호는 Compose에 직접 작성하지 않는다. 개발·테스트·운영의 DB와 volume을 분리한다.

---

# 17. Docker Compose 환경 분리

Compose 파일 위치는 repository root로 통일한다.

```text
compose.dev.yml
compose.prod.yml
.env.example
.env.production.example
.env.development          # 실제 로컬 값, Git 제외
.env.production           # 실제 운영 값, Git 제외
```

운영 이미지 리허설은 별도 Compose project·DB·volume·host port를 사용한다. `infra/`는 운영 스케줄 등 보조 설정을 보관하며 Compose를 중복 배치하지 않는다.

---

# 18. Development Environment

실행:

```text
docker compose --env-file .env.development -f compose.dev.yml up -d
```

접속:

```text
Frontend

http://localhost:3000


API

http://localhost:4000


DB

localhost:5432
```

---

# 19. Development Hot Reload

개발 Container에서는 Source Volume을 Mount한다.

Frontend:

```text
./apps/web

↓

/app
```

API:

```text
./apps/api

↓

/app
```

따라서 코드 수정 즉시

```text
Next.js Hot Reload

NestJS Watch
```

가 동작한다.

---

# 20. Production Environment

운영 장비:

```text
MacBook Pro
Apple Silicon
macOS

Docker Runtime
```

운영 Container:

```text
myfit-web-prod

myfit-api-prod

myfit-db-prod
```

---

# 21. Production Architecture

```text
                    External Device
                          │
                          │
                         HTTPS
                          │
                          ▼
                     Tailscale
                          │
                          ▼
                MacBook Pro :3000
                          │
                          ▼
                   ┌─────────────┐
                   │   Next.js   │
                   │     Web     │
                   └──────┬──────┘
                          │
                          │ Docker Network
                          ▼
                   ┌─────────────┐
                   │   NestJS    │
                   │     API     │
                   └──────┬──────┘
                          │
                          ▼
                   ┌─────────────┐
                   │ PostgreSQL  │
                   └──────┬──────┘
                          │
                          ▼
                    Docker Volume
```

---

# 22. 외부 접속 전략

개인 사용 서비스이기 때문에 일반적인

```text
공인 IP

+

공유기 Port Forwarding
```

구조는 사용하지 않는다.

대신

```text
Tailscale
```

사용을 기본으로 한다.

Tailscale Serve는 tailnet 내부의 다른 기기에서 로컬 서비스를 HTTPS로 접근할 수 있도록 한다. [Tailscale Serve 문서](https://tailscale.com/docs/features/tailscale-serve)

---

# 23. Tailscale 방식

MacBook에 Tailscale 설치.

외부에서 사용하는 기기에도 Tailscale 설치.

예:

```text
MacBook Pro

iPhone

Android

Windows PC

회사 Mac
```

모두 같은 Tailnet에 로그인한다.

구조:

```text
Phone
      \
       \
Windows ---- Tailscale ---- MacBook
       /
      /
Mac
```

공유기 설정은 필요 없다.

---

# 24. Tailscale Serve

MacBook에서

```text
localhost:3000
```

서비스를 Tailscale에 연결한다.

개념:

```text
tailscale serve 3000
```

그러면

```text
https://<machine-name>.<tailnet>.ts.net
```

형태의 HTTPS 주소를 사용할 수 있다. tailnet의 HTTPS 인증서 기능을 활성화하고 접근 제어 규칙을 확인한다. Serve는 tailnet 내 서비스 공유에 사용한다. [Tailscale Serve 문서](https://tailscale.com/docs/features/tailscale-serve)

---

# 25. 외부 접속 흐름

스마트폰에서:

```text
Browser

↓

https://myfit-mac.xxxxx.ts.net

↓

Tailscale

↓

MacBook

↓

Docker Frontend

↓

API

↓

PostgreSQL
```

---

# 26. Tailscale을 기본으로 선택하는 이유

본 시스템은

```text
개인 운동 기록
식단
몸무게
신체 데이터
```

를 다룬다.

따라서 공개 인터넷에 노출할 이유가 거의 없다.

Tailscale 사용 시:

```text
공인 IP 필요 없음

Port Forwarding 필요 없음

Router 설정 필요 없음

HTTPS 지원

Tailnet 가입 기기만 접근

Mac의 실제 IP 노출 최소화
```

라는 장점이 있다.

---

# 27. Cloudflare Tunnel 대안

향후

```text
fitness.example.com
```

처럼 일반 인터넷에서 접근해야 한다면 Cloudflare Tunnel을 사용할 수 있다.

구조:

```text
Internet

↓

Cloudflare

↓

Encrypted Tunnel

↓

MacBook

↓

localhost:3000
```

Cloudflare Tunnel 역시 MacBook에서 Cloudflare 방향으로 outbound 연결을 생성하기 때문에 공유기의 inbound port를 열 필요가 없다. Public hostname을 로컬 서비스에 매핑할 수 있다. [Cloudflare Tunnel 문서](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/)

예:

```text
fitness.example.com

↓

Cloudflare Tunnel

↓

http://localhost:3000
```

---

# 28. 외부 접근 최종 선택

초기 MVP:

```text
Tailscale Serve
```

추천.

이유:

```text
개인 서비스

↓

불필요한 Public Exposure 제거

↓

보안 설정 단순

↓

운영 비용 최소화
```

향후 다른 사람도 서비스를 이용하게 된다면:

```text
Cloudflare Tunnel

+

Custom Domain

+

Application Authentication
```

구조로 전환한다.

---

# 29. 인증

Tailscale을 사용하더라도 Application 인증을 별도로 둔다.

Defense in Depth 구조다.

개인 계정은 서버 관리 명령으로 생성하고 이메일·비밀번호로 로그인한다. 공개 가입·이메일 인증·재설정 메일은 후속 범위다. 비밀번호를 관리 명령으로 재설정하면 기존 세션을 모두 폐기한다.

---

# 30. 인증 방식

DB Session에 tokenHash와 만료 시각을 저장한다. 원문 토큰은 cookie에만 전달하며 세션 만료·폐기·CSRF·rate limit·소유권 검사를 적용한다. 세부 계약은 데이터 모델 3절을 따른다.

권장:

```text
HttpOnly Cookie

Secure Cookie

SameSite
```

방식.

브라우저 LocalStorage에 Access Token을 장기간 저장하는 방식은 사용하지 않는다.

구조:

```text
Login

↓

API

↓

Session 생성

↓

Secure HttpOnly Cookie

↓

Browser
```

---

# 31. 비밀번호

Password 저장:

```text
Plain Text X

SHA 단독 X
```

권장:

```text
Argon2id
```

기반 Hash 저장.

---

# 32. PostgreSQL Persistence

DB 데이터는 Container 내부에만 저장하면 안 된다.

Container 삭제 후 데이터가 없어질 수 있기 때문이다.

따라서:

```text
PostgreSQL Container

↓

Docker Named Volume

↓

postgres-data
```

구조 사용.

예:

```text
postgres-prod-data:

/var/lib/postgresql/data
```

---

# 33. DB Backup

Docker Volume만으로는 Backup이 아니다.

따라서 별도로

```text
pg_dump
```

백업을 수행한다.

구조:

```text
PostgreSQL

↓

pg_dump

↓

Mac Host

/Users/.../myfit/backups
```

예:

```text
2026-09-27.sql.gz

2026-09-28.sql.gz

2026-09-29.sql.gz
```

---

# 34. Backup Policy

초기 개인 서비스 기준:

```text
Daily Backup

7개 보관
```

추후:

```text
Daily   7

Weekly  4

Monthly 6
```

정도로 확장한다.

---

# 35. 중요한 Backup 원칙

PostgreSQL 실제 데이터 디렉터리를

```text
iCloud Drive

Dropbox

Google Drive
```

등에 직접 넣지 않는다.

대신:

```text
PostgreSQL Volume

↓

pg_dump

↓

backup.sql.gz

↓

Cloud Backup
```

형태로 사용한다.

---

# 36. Production Container Restart

모든 운영 Container에는

```yaml
restart: unless-stopped
```

적용.

대상:

```text
web

api

db
```

컨테이너 프로세스의 비정상 종료를 복구하도록 설정한다. 명시적인 docker stop은 수동 정지이므로 자동 재시작을 기대하는 crash 테스트와 구분한다. [Docker restart 정책](https://docs.docker.com/engine/containers/start-containers-automatically/)

---

# 37. Health Check

각 서비스 Health Check를 구현한다.

## API

```text
GET /health/live
```

API Process 상태.

```text
GET /health/ready
```

Database 연결까지 확인.

---

## Database

```text
pg_isready
```

사용.

---

# 38. 서비스 시작 순서

```text
PostgreSQL

↓

DB Healthy

↓

API

↓

API Healthy

↓

Frontend
```

Frontend가 먼저 시작되더라도 API 재시도 가능하도록 설계한다.

---

# 39. Database Migration

Prisma Migration 사용.

개발:

```text
prisma migrate dev
```

Production:

```text
prisma migrate deploy
```

배포 Flow:

```text
Build

↓

Database Backup

↓

Migration

↓

API Deployment

↓

Frontend Deployment
```

---

# 40. 프로젝트 Repository 구조

```text
my-fit-log/
├─ apps/
│  ├─ web/                 # Next.js, Dockerfile
│  └─ api/                 # NestJS, Dockerfile
├─ packages/
│  ├─ types/               # DTO·공유 타입
│  ├─ config/              # 공통 개발 설정
│  └─ ui/                  # 공통 UI
├─ prisma/                 # schema, migrations, seed
├─ infra/                  # 백업 스케줄 등 운영 설정
├─ scripts/                # deploy, backup, restore, 계정 관리
├─ docs/
├─ compose.dev.yml
├─ compose.prod.yml
├─ .env.example
├─ .env.production.example
└─ README.md
```

workspace 공통 패키지와 Prisma 산출물이 각 서비스 build에 포함되도록 root build context를 사용한다.

---

# 41. Monorepo

권장:

```text
pnpm workspace
```

또는

```text
Turborepo
```

초기 프로젝트에서는

```text
pnpm workspace
```

만으로도 충분하다.

불필요한 복잡성을 줄인다.

---

# 42. Shared Type

Frontend/API 간 공통 Type을 관리한다.

```text
packages/types
```

예:

```text
Workout

WorkoutSet

Meal

Food

BodyRecord
```

API Schema와 Frontend Type 불일치를 최소화한다.

---

# 43. 환경 변수

개발은 `.env.development`, 운영은 `.env.production`이며 실제 값은 Git에 저장하지 않는다. 예제 파일과 시작 전 검증 코드는 Phase 20, 실제 운영 값 확정·적용은 Phase 23이다.

Compose 실행 시 환경 파일을 `--env-file`로 명시한다. Compose 치환용 값과 각 서비스에 주입되는 environment를 구분하며, 비밀값을 브라우저 공개 환경변수로 전달하지 않는다.

---

# 44. 주요 Environment Variable

| 변수 | 소비자 | 값 / 정책 |
|---|---|---|
| POSTGRES_DB / POSTGRES_USER | db·관리 스크립트 | 환경별 DB·계정 이름 |
| POSTGRES_PASSWORD | db·관리 스크립트 | 생성한 비밀값 |
| DATABASE_URL | api·migration | 운영 DB 자격증명, Docker host=db |
| SESSION_SECRET | api | 무작위 비밀값, 세션 token HMAC; 교체 시 기존 세션 무효화 |
| APP_URL | web·api | 개발 http://localhost:3000, 운영 실제 Tailscale HTTPS origin |
| INTERNAL_API_URL | web 서버 | http://api:4000, 브라우저에 공개하지 않음 |
| NODE_ENV | web·api | development / production |
| APP_TIMEZONE | api·집계 | MVP는 Asia/Seoul로 고정 |
| BACKUP_DIR | 호스트 backup/restore | 실제 백업 파일 경로 |
| BACKUP_RETENTION_DAYS | 호스트 backup | 기본 7 |

POSTGRES_PASSWORD와 DATABASE_URL의 비밀번호를 일치시키며 URL 인코딩을 처리한다. 운영 시작 전 누락·예제 비밀값·잘못된 URL을 검사한다. 후속 Cloudflare 공개 배포를 선택하기 전에는 CLOUDFLARE_TUNNEL_TOKEN을 요구하지 않는다.

---

# 45. Secret 관리

Git에 포함하면 안 되는 값:

```text
DB Password

Session Secret

Tunnel Token

API Secret
```

`.gitignore`:

```text
.env

.env.local

.env.development

.env.production
```

Repository에는

```text
.env.example
.env.production.example
```

처럼 비밀값 없는 예제만 저장한다.

---

# 46. MacBook Server 운영

운영 장비:

```text
MacBook Pro

│

├─ macOS
│
├─ Docker
│
├─ Tailscale
│
└─ MyFit Containers
```

MacBook은 기본적으로 전원에 연결된 상태로 운영한다.

---

# 47. MacBook 덮개를 닫아놓고 운영

이 부분이 운영 환경에서 중요하다.

단순히 Docker Container를 실행하고 MacBook 덮개를 닫으면 Mac이 Sleep 상태로 들어갈 수 있다.

Sleep이 발생하면:

```text
Docker 중단

API 접근 불가

DB 접근 불가

Tailscale 접근 불가
```

가 될 수 있다.

---

# 48. macOS Sleep 설정

Apple은 Mac 노트북에 전원 어댑터 연결 시

**Prevent automatic sleeping on power adapter when the display is off**

설정을 제공한다. 또한 Wake for network access 설정도 제공한다. [Apple 잠자기 설정](https://support.apple.com/guide/mac-help/set-sleep-and-wake-settings-mchle41a6ccd/mac)

따라서 기본 설정:

```text
System Settings

↓

Battery

↓

Options

↓

Prevent automatic sleeping
on power adapter when display is off

ON
```

그리고:

```text
Wake for network access

ON
```

권장.

---

# 49. Closed Lid 운영 주의

여기서

```text
Display Off

≠

Lid Closed
```

라는 점이 중요하다.

Apple이 공식적으로 설명하는 Closed-Lid 사용 방식은 외부 디스플레이와 액세서리를 연결한 상태의 사용이다. Apple은 외부 디스플레이 연결 후 덮개를 닫고 계속 사용할 수 있다고 안내한다. [Apple 덮개 닫은 상태의 액세서리 연결](https://support.apple.com/en-us/102282)

따라서 **상시 서버로 안정적으로 사용하려면 Closed-Lid 상태를 반드시 실제 장비에서 검증해야 한다.**

---

# 50. 권장 Closed-Lid 구성

실제 장비에서 검증할 운영 구성 예시:

```text
MacBook Pro

│
├─ Power Adapter
│
├─ Network
│
├─ HDMI Dummy Plug
│
└─ Lid Closed
```

HDMI Dummy Plug은 Mac 입장에서 외장 디스플레이가 연결된 상태로 인식시키는 용도로 활용할 수 있다.

Dummy Plug만으로 덮개 닫기·재부팅 복구가 보장된다고 간주하지 않는다. 사용 장비·macOS 조합에서 Phase 26 검증을 통과한 구성을 채택한다.

---

# 51. Headless Mode 대안

외장 디스플레이 없이 완전히 Headless로 만들고 싶다면 macOS의 sleep 정책을 별도로 제어하는 방법도 존재한다.

예를 들어:

```text
pmset
```

기반으로 Sleep 자체를 비활성화하는 방식이 사용된다.

다만 `disablesleep` 방식은 현재 Apple Silicon에서도 사용하는 사례가 있지만 Apple의 일반 사용자용 공식 설정으로 문서화된 옵션은 아니므로, 본 프로젝트의 기본 운영 방식으로 강제하지 않는다. 실제 OS 버전에서 충분히 검증 후 선택한다.

따라서 우선순위는:

```text
1. 공식 Closed-Lid 방식

2. Dummy Display 방식

3. pmset 기반 Headless 방식
```

순으로 둔다.

---

# 52. 발열 관리

MacBook을 닫은 상태에서 상시 운영하므로:

```text
침대

이불

밀폐된 서랍
```

등에는 두지 않는다.

권장:

```text
Vertical Stand

또는

통풍 가능한 평평한 공간
```

MyFit 정도의 개인 웹서비스는 CPU 지속 부하가 매우 낮을 것으로 예상되므로 서버 자체의 연산 요구량은 크지 않다.

---

# 53. Docker Desktop 자동 시작

Docker Desktop에는 사용자 로그인 시 Docker Desktop을 자동으로 실행하는 설정이 있다. [Docker Desktop 시작 설정](https://docs.docker.com/desktop/settings-and-maintenance/settings/)

활성화:

```text
Docker Desktop

↓

Settings

↓

General

↓

Start Docker Desktop when you sign in

ON
```

---

# 54. MacBook 재부팅 시

Mac 재부팅 후:

```text
macOS Login

↓

Docker Desktop Start

↓

Docker Engine Start

↓

restart: unless-stopped

↓

DB

↓

API

↓

Frontend
```

순으로 복구되는 구조로 만든다.

---

# 55. 중요한 운영 제한

Docker Desktop은

```text
Start when you sign in
```

방식이므로 완전히 사람이 없는 서버의 부팅 복구 관점에서는 일반 Linux Server보다 불리하다. [Docker Desktop 시작 설정](https://docs.docker.com/desktop/settings-and-maintenance/settings/)

따라서 초기 개인용 서버로는 충분하지만,

```text
24/7 Availability

무인 자동 복구

서비스 사용자 증가
```

가 중요해지는 시점에는

```text
Linux Mini PC

또는

VPS / Cloud
```

로 이전하는 것이 적합하다.

본 Architecture는 Docker Compose 기반이므로 이전 난이도는 낮게 유지한다.

---

# 56. Docker Resource Saver

Docker Desktop에는 Container가 실행되지 않을 때 Linux VM 사용량을 줄이는 Resource Saver 기능이 있다. 기본적으로 실행 중인 Container가 없는 상태에서 VM을 정지시키는 방식이다. [Docker Resource Saver](https://docs.docker.com/desktop/use-desktop/resource-saver/)

운영 중에는 항상

```text
web

api

db
```

Container가 실행되므로 일반적으로 서비스가 유지된다.

운영 안정성을 최우선으로 할 경우 Resource Saver를 끄는 것도 가능하다.

---

# 57. Production Deployment Flow

초기에는 CI/CD까지 만들 필요 없다.

MacBook에서 간단한 Deploy Script를 사용한다.

```text
Git

↓

Pull

↓

Docker Build

↓

DB Backup

↓

Migration

↓

Container Restart

↓

Health Check
```

---

# 58. deploy.sh

Phase 20에서 작성·격리 검증하고 Phase 24에서 실제 운영에 적용한다.

```text
운영 설정 검사
→ 배포할 commit / image 식별
→ production image build
→ DB 기동·ready 확인
→ 기존 DB backup (최초 빈 DB 설치는 별도 분기)
→ prisma migrate deploy
→ API / Web 기동
→ health + 로그인/기록 smoke test
```

backup·migration 실패 시 다음 단계를 중단한다. `.env.production`을 명시적으로 읽고 모든 명령의 DB·Compose project 대상을 일치시킨다. migration 실행에 필요한 Prisma 도구·파일을 이미지에 포함한다. 계정 관리 명령과 공용 운동 seed의 실행 시점을 문서화한다.

이전 이미지와 migration 상태를 남긴다. 이미지 rollback과 DB restore는 별도 절차이며, 실패했다고 운영 DB를 자동으로 덮어쓰지 않는다. 실제 복구는 쓰기 중단·대상 확인·복원·검증 후 서비스 재개 순서다.

---

# 59. Production Image

Development에서는:

```text
Source Mount

Hot Reload
```

Production에서는:

```text
Source Mount X

Build Image 사용
```

한다.

Frontend:

```text
Next.js Production Build
```

API:

```text
NestJS Production Build
```

Docker Image는 Multi-stage Build를 사용한다.

---

# 60. Logging

초기에는 별도 ELK / Grafana 같은 시스템은 구축하지 않는다.

Docker Logs로 충분하다.

```text
docker compose logs

docker compose logs web

docker compose logs api

docker compose logs db
```

---

# 61. Log Rotation

장기간 운영하면 Docker Log가 계속 증가할 수 있다.

따라서:

```text
max-size: 10m

max-file: 3
```

같은 제한을 둔다.

---

# 62. Monitoring

초기 Monitoring은 단순화한다.

```text
/health/live

/health/ready
```

Endpoint 제공.

추가로:

```text
Docker Container Status

DB Health

Disk Usage

Backup Status
```

확인.

---

# 63. Error Tracking

MVP 단계:

```text
Application Log
```

위주.

향후 필요 시:

```text
Sentry
```

등의 Error Tracking 시스템 추가 가능.

---

# 64. Analytics 데이터 처리

`GET /api/v1/dashboard?date=YYYY-MM-DD` 한 번으로 당일·주간 데이터를 반환한다.

```json
{
  "data": {
    "today": {},
    "nutrition": {},
    "body": {},
    "weekly": {},
    "recentWorkout": {}
  }
}
```

Frontend에서 Dashboard의 각 카드마다 별도 API를 호출하지 않는다. 운동·유산소·식단·신체·목표 변경 시 관련 Query cache를 무효화한다.

---

# 65. Analytics 계산 전략

PostgreSQL 조회와 API의 공통 계산 코드로 처리한다. 별도 Analytics Engine은 필요 없다. 정확한 식은 데이터 모델 8절을 따른다.

- 날짜 Asia/Seoul, UTC timestamp 저장, 주간 월요일 시작
- 완료 웨이트·완료 세트만 volume에 반영
- 유산소 시간·거리/횟수와 웨이트 세션 수를 구분
- 주간 운동일은 웨이트·유산소의 고유 날짜로 합산
- 7일 체중 평균과 영양 평균은 미기록일을 0으로 넣지 않음
- 영양 snapshot × servings를 Decimal로 합산
- 과거 기간 목표 대비 비율도 현재 목표 기준임을 표시
- 빈 데이터·미설정 목표는 null/Empty State로 처리

줄넘기 시간·횟수와 러닝 시간·거리/pace를 각각 조회할 수 있어야 한다.

---

# 66. Cache

MVP에서는

```text
Redis
```

를 사용하지 않는다.

현재 예상 사용자는 1명이고 데이터량도 매우 작다.

따라서:

```text
Frontend Query Cache

+

PostgreSQL
```

로 충분하다.

사용자가 증가하거나 Analytics 계산 비용이 증가하면 Redis 추가를 검토한다.

---

# 67. 파일 저장

초기에는 사진 업로드 기능이 없으므로 Object Storage도 필요 없다.

따라서 다음 서비스는 제외한다.

```text
S3

MinIO

Cloud Storage
```

추후 음식 사진, 운동 사진 등을 추가하면 도입한다.

---

# 68. 모바일 사용

별도 Android/iOS 앱은 만들지 않는다.

초기에는:

```text
Responsive Web
```

으로 제공.

필요하면 PWA를 적용한다.

사용자는 스마트폰 홈 화면에 추가해서 앱처럼 사용할 수 있다.

---

# 69. PWA 확장

후속 릴리스(P2):

```text
Web App Manifest

Service Worker

Offline Shell

Background Sync
```

추가 가능.

특히 Workout 기록에는 유용하다.

```text
Network Down

↓

Local Draft

↓

Network Recovery

↓

Automatic Sync
```

구조를 발전시킬 수 있다.

---

# 70. 보안 Architecture

전체 보안 경계:

```text
Internet

│
│
▼

Tailscale Authentication

│
│
▼

Application Authentication

│
│
▼

Frontend

│
│ Docker Network
▼

API

│
│ Docker Network
▼

PostgreSQL
```

여러 Layer로 분리한다.

---

# 71. 외부에 공개되는 것

초기 운영:

```text
HTTPS Frontend
```

하나.

외부 비공개:

```text
API Port

PostgreSQL

Docker Socket

Mac SSH
```

---

# 72. Firewall 정책

공유기에 다음 Port Forwarding을 만들지 않는다.

```text
3000

4000

5432
```

특히:

```text
5432 → Internet
```

은 금지한다.

---

# 73. 장애 시나리오

## Frontend Crash

```text
Next.js Crash

↓

Docker restart

↓

Frontend Recovery
```

---

## API Crash

```text
NestJS Crash

↓

Docker restart

↓

API Recovery
```

---

## PostgreSQL Restart

```text
PostgreSQL Restart

↓

Persistent Volume 유지

↓

Database Recovery

↓

API Reconnect
```

---

# 74. Mac Sleep

```text
Mac Sleep

↓

Docker VM Sleep

↓

서비스 접근 불가
```

따라서 Closed-Lid / Sleep 설정 검증이 Production 배포 전 필수다.

---

# 75. Internet 장애

```text
Home Internet Down

↓

외부 접근 불가
```

인터넷 복구 후:

```text
Tailscale Reconnect

↓

서비스 복구
```

하도록 구성한다.

---

# 76. 데이터 손상

```text
DB Problem

↓

Container Stop

↓

Backup 선택

↓

PostgreSQL Restore
```

복구 Script를 미리 만들어 둔다.

```text
scripts/restore.sh
```

---

# 77. 개발 → 운영 Flow

```text
Developer

↓

Local Docker

↓

Feature Development

↓

Local Test

↓

Git Commit

↓

Main Branch

↓

MacBook Production

↓

Docker Build

↓

Migration

↓

Deploy

↓

Health Check
```

---

# 78. 환경 관계

```text
DEV
MacBook 개발환경

web-dev
api-dev
db-dev


          ↓


PROD
MacBook 서버환경

web-prod
api-prod
db-prod
```

DEV와 PROD DB Volume은 반드시 분리한다.

예:

```text
myfit-dev-postgres

myfit-prod-postgres
```

---

# 79. 개발 DB와 운영 DB

절대 같은 DB를 사용하지 않는다.

```text
Development DB

myfit_dev


Production DB

myfit_prod
```

---

# 80. Architecture Decision Summary

## Frontend

```text
Next.js
```

선택.

---

## Backend

```text
NestJS
```

선택.

Frontend와 API Layer를 명확히 분리한다.

---

## Database

```text
PostgreSQL
```

선택.

---

## ORM

```text
Prisma
```

선택.

---

## Containers

```text
Docker Compose
```

선택.

---

## External Access

초기:

```text
Tailscale Serve
```

선택.

---

## Public Deployment

향후:

```text
Cloudflare Tunnel
```

지원.

Cloudflare Tunnel은 public hostname을 로컬 서비스로 전달하면서 서버 측 inbound port를 열 필요가 없다. [Cloudflare Tunnel 문서](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/)

---

# 81. 최종 Production Architecture

```text
┌───────────────────────────────────────────────┐
│               External Devices                │
│                                               │
│ Mac / Windows / Android / iPhone              │
└───────────────────────┬───────────────────────┘
                        │
                        │ HTTPS
                        ▼
                ┌───────────────┐
                │   Tailscale   │
                │     Serve     │
                └───────┬───────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────┐
│                 MacBook Pro                         │
│                                                      │
│                Docker Compose                        │
│                                                      │
│     ┌────────────────────────────────────────┐       │
│     │                                        │       │
│     │             Next.js Web                │       │
│     │             :3000                      │       │
│     │                                        │       │
│     └──────────────────┬─────────────────────┘       │
│                        │                             │
│                   /api/*                            │
│                        │                             │
│                        ▼                             │
│     ┌────────────────────────────────────────┐       │
│     │                                        │       │
│     │             NestJS API                 │       │
│     │             :4000                      │       │
│     │                                        │       │
│     └──────────────────┬─────────────────────┘       │
│                        │                             │
│                      Prisma                          │
│                        │                             │
│                        ▼                             │
│     ┌────────────────────────────────────────┐       │
│     │                                        │       │
│     │             PostgreSQL                 │       │
│     │             :5432                      │       │
│     │                                        │       │
│     └──────────────────┬─────────────────────┘       │
│                        │                             │
│                        ▼                             │
│                Persistent Volume                    │
│                                                      │
│                        │                             │
│                        ▼                             │
│                  Daily pg_dump                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

# 82. 최종 컨테이너 구성

MVP:

```text
3 Containers

myfit-web

myfit-api

myfit-db
```

추가 Infrastructure는 만들지 않는다.

현재 단계에서 불필요:

```text
Redis

Kafka

RabbitMQ

Elasticsearch

Kubernetes

Prometheus

Grafana

Microservices
```

단일 사용자 개인 서비스에는 과도하다.

---

# 83. 구현 순서와 완료 경계

독립적인 Phase 번호를 정의하지 않는다. [구현 체크리스트](<MyFit Log 구현 계획 및 개발 체크리스트.md>)의 번호를 그대로 따른다.

| Phase | 범위 |
|---|---|
| 0~5 | Repository·개발 Docker·DB·API·Frontend·인증 |
| 6~9 | Settings·목표 → 웨이트/유산소·식단·신체 |
| 10~15 | Dashboard·Analytics·Calendar·Quick Add·Draft·UX |
| 16~18 | 보안·접근성·API/단위/통합·E2E·로컬 성능 |
| 19~22 | 운영 이미지·로그·환경변수 계약·배포/복구 리허설·개발 완료 |
| 23~25 | 실제 MacBook·운영 값·Tailscale·첫 배포·운영 백업/복구 검증 |
| 26~29 | 덮개·재부팅·장애·운영 보안·실기기·실사용·MVP 완료 |

Phase 22까지는 실제 운영 계정·장비가 없어도 개발용 실행 환경에서 수행할 수 있다. Phase 23부터 실제 주소·장비 접근·계정 인증이 필요하다. 물리 장비 조작과 1~2주 실사용은 운영자가 참여한다.

개발 단계의 테스트 성공을 실제 덮개·외부 접속·무인 복구 성공으로 간주하지 않는다.

---

# 84. Production 검증 Checklist

MacBook 덮개를 닫기 전:

```text
□ Power Adapter 연결

□ Docker 실행

□ web Container Healthy

□ api Container Healthy

□ db Container Healthy

□ Tailscale Connected

□ DB Backup 정상

□ Sleep Prevention 설정

□ Tailscale 외부 접속 확인
```

덮개를 닫은 후:

```text
□ 5분 후 접속

□ 30분 후 접속

□ 1시간 후 접속

□ 스마트폰 LTE/5G 접속

□ Wi-Fi 외부 네트워크 접속

□ API 요청

□ Workout 저장

□ DB 반영 확인
```

---

# 85. Reboot 검증 Checklist

Mac 재부팅 후:

```text
□ macOS 로그인

□ Docker 자동 시작

□ PostgreSQL 시작

□ API 시작

□ Frontend 시작

□ Tailscale 연결

□ 외부 접속

□ 기존 데이터 유지
```

이 테스트까지 통과해야 MacBook을 실제 서버로 간주한다.

---

# 86. 최종 권장 운영 구조

현재 요구사항 기준으로는 다음 구성이 가장 적합하다.

```text
MacBook Pro
       │
       ├─ 항상 전원 연결
       │
       ├─ Closed Lid 운영
       │
       ├─ Tailscale
       │
       └─ Docker
             │
             ├─ Next.js
             │
             ├─ NestJS
             │
             └─ PostgreSQL
```

외부 접속:

```text
개인 기기

↓

Tailscale HTTPS

↓

MacBook

↓

Next.js

↓

NestJS

↓

PostgreSQL
```

개발:

```text
compose.dev.yml
```

운영:

```text
compose.prod.yml
```

로 구분한다.

이렇게 해두면 나중에 서버를 MacBook에서 Linux Mini PC나 VPS로 변경하더라도 애플리케이션 구조를 변경할 필요가 거의 없다.

변경되는 것은 사실상:

```text
Docker Host

MacBook
   ↓
Linux Server
```

뿐이다.

따라서 초기에는 현재 가지고 있는 MacBook을 활용해 비용 없이 MVP를 운영하면서도, 추후 정식 서버로 이전할 수 있는 구조를 유지한다.