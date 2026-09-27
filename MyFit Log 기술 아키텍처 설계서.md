# MyFit Log 기술 아키텍처 설계서

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
Zustand

React Hook Form
Zod

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
      └─ Zustand

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

Zustand 사용.

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

Zod / Validation

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

```text
src

├─ modules
│
├── auth
│
├── users
│
├── workouts
│
├── routines
│
├── exercises
│
├── meals
│
├── foods
│
├── body
│
├── goals
│
└── analytics
│
├─ common
│
├─ database
│
└─ health
```

---

# 7. REST API

API Versioning 적용.

```text
/api/v1
```

예:

```text
GET    /api/v1/dashboard

GET    /api/v1/workouts

POST   /api/v1/workouts

GET    /api/v1/workouts/:id

PATCH  /api/v1/workouts/:id

DELETE /api/v1/workouts/:id
```

Diet

```text
GET    /api/v1/meals

POST   /api/v1/meals

POST   /api/v1/foods
```

Body

```text
GET    /api/v1/body-records

POST   /api/v1/body-records
```

Analytics

```text
GET /api/v1/analytics/weight

GET /api/v1/analytics/workouts

GET /api/v1/analytics/nutrition
```

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

# 10. Database 주요 Entity

```text
User

UserGoal

WorkoutSession

WorkoutExercise

WorkoutSet

Exercise

WorkoutRoutine

RoutineExercise

CardioRecord

Meal

MealFood

Food

BodyRecord
```

관계 예:

```text
User

 ├─ UserGoal
 │
 ├─ WorkoutSession
 │     │
 │     └─ WorkoutExercise
 │              │
 │              └─ WorkoutSet
 │
 ├─ Meal
 │     │
 │     └─ MealFood
 │
 └─ BodyRecord
```

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

개념적으로 다음 구조를 사용한다.

```yaml
services:

  web:
    build:
      context: ./frontend

    ports:
      - "3000:3000"

    environment:
      INTERNAL_API_URL: http://api:4000

    depends_on:
      - api

    networks:
      - myfit-network


  api:
    build:
      context: ./api

    ports:
      - "4000:4000"

    environment:
      DATABASE_URL: postgresql://myfit:password@db:5432/myfit

    depends_on:
      db:
        condition: service_healthy

    networks:
      - myfit-network


  db:
    image: postgres

    ports:
      - "5432:5432"

    environment:
      POSTGRES_DB: myfit
      POSTGRES_USER: myfit
      POSTGRES_PASSWORD: password

    volumes:
      - postgres-dev-data:/var/lib/postgresql/data

    healthcheck:
      test:
        - CMD-SHELL
        - pg_isready -U myfit

    networks:
      - myfit-network


volumes:
  postgres-dev-data:


networks:
  myfit-network:
```

실제 비밀번호는 Compose 파일에 직접 작성하지 않고 `.env`로 관리한다.

---

# 17. Docker Compose 환경 분리

파일 구조:

```text
infra

├─ compose.dev.yml
│
└─ compose.prod.yml
```

또는

```text
docker-compose.yml

docker-compose.override.yml

docker-compose.prod.yml
```

권장 구조는 명확성을 위해:

```text
compose.dev.yml

compose.prod.yml
```

사용.

---

# 18. Development Environment

실행:

```text
docker compose -f compose.dev.yml up -d
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
./frontend

↓

/app
```

API:

```text
./api

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

Tailscale Serve는 tailnet 내부의 다른 기기에서 로컬 서비스를 HTTPS로 접근할 수 있도록 한다. citeturn736462search0

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

형태의 HTTPS 주소를 사용할 수 있다. Tailscale Serve는 TLS 인증서를 자동으로 사용할 수 있으며 Tailnet ACL도 그대로 적용된다. citeturn736462search0turn736462search1

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

Cloudflare Tunnel 역시 MacBook에서 Cloudflare 방향으로 outbound 연결을 생성하기 때문에 공유기의 inbound port를 열 필요가 없다. Public hostname을 로컬 서비스에 매핑할 수 있다. citeturn879527search0turn879527search2

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

초기에는

```text
Email

+

Password
```

로그인으로 충분하다.

---

# 30. 인증 방식

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

따라서 Container Process가 비정상 종료되더라도 Docker가 재시작한다.

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

Monorepo 권장.

```text
myfit-log

├─ apps
│
├── web
│
└── api
│
├─ packages
│
├── ui
│
├── types
│
└── config
│
├─ prisma
│
├─ infra
│
├── compose.dev.yml
│
├── compose.prod.yml
│
└─ scripts
│
├── deploy.sh
│
├── backup.sh
│
└── restore.sh
│
├─ docs
│
├── PRD.md
│
└── ARCHITECTURE.md
│
├─ .env.example
│
└─ README.md
```

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

개발:

```text
.env.development
```

운영:

```text
.env.production
```

---

# 44. 주요 Environment Variable

예:

```text
DATABASE_URL

SESSION_SECRET

INTERNAL_API_URL

APP_URL

NODE_ENV
```

Cloudflare 사용 시:

```text
CLOUDFLARE_TUNNEL_TOKEN
```

등 추가.

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

.env.production
```

Repository에는

```text
.env.example
```

만 저장한다.

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

설정을 제공한다. 또한 Wake for network access 설정도 제공한다. citeturn236552search2turn236552search3

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

Apple이 공식적으로 설명하는 Closed-Lid 사용 방식은 외부 디스플레이와 액세서리를 연결한 상태의 사용이다. Apple은 외부 디스플레이 연결 후 덮개를 닫고 계속 사용할 수 있다고 안내한다. citeturn236552search5turn236552search6

따라서 **상시 서버로 안정적으로 사용하려면 Closed-Lid 상태를 반드시 실제 장비에서 검증해야 한다.**

---

# 50. 권장 Closed-Lid 구성

가장 보수적인 구성:

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

실제 외부 모니터를 계속 연결할 필요가 없다.

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

Docker Desktop에는 사용자 로그인 시 Docker Desktop을 자동으로 실행하는 설정이 있다. citeturn879527search13

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

방식이므로 완전히 사람이 없는 서버의 부팅 복구 관점에서는 일반 Linux Server보다 불리하다. citeturn879527search13

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

Docker Desktop에는 Container가 실행되지 않을 때 Linux VM 사용량을 줄이는 Resource Saver 기능이 있다. 기본적으로 실행 중인 Container가 없는 상태에서 VM을 정지시키는 방식이다. citeturn879527search11

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

개념적인 배포 흐름:

```bash
git pull

docker compose -f compose.prod.yml build

docker compose -f compose.prod.yml run --rm api \
  npx prisma migrate deploy

docker compose -f compose.prod.yml up -d

docker compose -f compose.prod.yml ps
```

운영에서는 Migration 전 DB Backup을 추가한다.

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

Dashboard 요청마다 많은 Query를 발생시키지 않는다.

예:

```text
/dashboard?date=2026-09-27
```

호출 시 API에서 한 번에 반환한다.

```json
{
  "workout": {},
  "nutrition": {},
  "body": {},
  "weekly": {}
}
```

Frontend가

```text
Workout API

Diet API

Body API

Analytics API
```

4~5개를 동시에 호출하는 방식보다 Dashboard 전용 Aggregation API를 둔다.

---

# 65. Analytics 계산 전략

초기에는 PostgreSQL에서 계산한다.

예:

```text
7 Day Weight Average

Weekly Calories

Weekly Protein

Workout Volume

Workout Frequency
```

데이터량이 적기 때문에 별도 Analytics Engine은 필요 없다.

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

Phase 2:

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

Cloudflare Tunnel은 public hostname을 로컬 서비스로 전달하면서 서버 측 inbound port를 열 필요가 없다. citeturn879527search0turn879527search2

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

# 83. 구현 순서

## Phase 1 — Infrastructure

```text
Monorepo

↓

Frontend Docker

↓

API Docker

↓

PostgreSQL Docker

↓

Docker Compose

↓

Prisma 연결
```

---

## Phase 2 — Authentication

```text
User

Login

Session

Authentication Guard
```

---

## Phase 3 — Core Domain

```text
Workout

Diet

Body

Goals
```

---

## Phase 4 — Dashboard

```text
Daily Summary

Weekly Summary

Weight Trend

Nutrition Progress
```

---

## Phase 5 — Analytics

```text
Weight

Workout Volume

Workout Frequency

Calories

Protein
```

---

## Phase 6 — Production

```text
Production Docker

↓

Database Volume

↓

Backup

↓

Tailscale

↓

Mac Sleep 설정

↓

Closed Lid Test
```

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