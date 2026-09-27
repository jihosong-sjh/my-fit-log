# MyFit Log 데이터 모델 명세

정리 기준일: 2026-09-27. 본 문서는 MVP의 필드명·관계·제약·집계 규칙의 기준이다. 19개 엔티티의 실행 가능한 Prisma schema와 migration을 구현·검증했다. 인증·도메인 API와 Draft의 완료 여부는 아래 및 구현 체크리스트를 따른다.

관련 문서: [PRD](<개인 운동·식단 관리 웹페이지 PRD.md>), [기술 아키텍처](<MyFit Log 기술 아키텍처 설계서.md>), [구현 체크리스트](<MyFit Log 구현 계획 및 개발 체크리스트.md>).

## 1. 범위와 공통 규칙

- PostgreSQL + Prisma. MVP 테이블은 아래 19개이며 Redis·별도 분석 DB는 사용하지 않는다.
- `id`는 UUID 기본키다. 연결 테이블의 복합 기본키 예외는 각 표에 명시한다.
- `?`는 nullable이다. 필수 항목과 기본값은 표에 명시한다.
- 일반 엔티티는 `createdAt`, `updatedAt`을 UTC `timestamptz`로 가진다. 즐겨찾기는 `createdAt`만, 세션은 명시된 시간 필드만 가진다.
- 기록의 `date`는 PostgreSQL `date`이며 API에서 `YYYY-MM-DD`로 전달한다. MVP 날짜·주간 집계 기준은 `Asia/Seoul`, 주 시작은 월요일이다. 여행 중에도 날짜를 임의로 재분류하지 않는다.
- 시간 길이는 초(`durationSeconds`), 체중·중량·근육량은 kg, 둘레는 cm, 유산소 거리는 km, 영양소는 g, 에너지는 kcal이다.
- 소수 데이터는 PostgreSQL Decimal을 사용한다. API에서 소수 필드는 10진 문자열로 전달하고 계산 시 Decimal 연산을 사용한다. 차트 표시용 숫자 변환은 UI 경계에서 수행한다.
- `D(p,s)`는 Decimal precision/scale이다. 중량·체중·둘레는 `D(7,2)`, 체지방·RPE는 `D(4,1)`, 음식 양·영양·거리는 아래 별도 타입을 따른다.
- 범위 검사는 DTO와 DB CHECK 제약으로 보장한다. Prisma 선언만으로 표현하기 어려운 제약은 migration SQL에 작성한다.
- 모든 개인 데이터의 최상위 소유자는 `User`다. API가 세션의 사용자로 소유권을 검증하며 클라이언트가 보낸 `userId`를 신뢰하지 않는다. 자식 레코드는 부모 소유권을 따라 검증한다.
- `ownerId = null`인 Exercise/Food는 공용 카탈로그이며 읽기 전용이다. 일반 사용자는 자신의 항목만 변경한다. 다른 사용자의 비공개 항목은 조회·연결할 수 없다.

## 2. 엔티티와 관계

| 영역 | 엔티티 | 관계 / 기능 |
|---|---|---|
| 계정 | User | 모든 개인 기록의 소유자 |
| 인증 | Session | User 1:N Session, 서버 저장 세션 |
| 목표 | UserGoal | User 1:1 UserGoal |
| 설정 | UserPreference | User 1:1 UserPreference, 테마 |
| 운동 카탈로그 | Exercise | 공용 또는 User 소유, STRENGTH / CARDIO 구분 |
| 운동 즐겨찾기 | ExerciseFavorite | User N:M Exercise |
| 웨이트 기록 | WorkoutSession | User 1:N WorkoutSession |
| 운동 종목 기록 | WorkoutExercise | WorkoutSession 1:N WorkoutExercise, Exercise 참조 |
| 세트 | WorkoutSet | WorkoutExercise 1:N WorkoutSet |
| 운동 루틴 | WorkoutRoutine | User 1:N WorkoutRoutine |
| 루틴 구성 | RoutineExercise | WorkoutRoutine 1:N RoutineExercise, Exercise 참조 |
| 유산소 | CardioRecord | User 1:N CardioRecord, CARDIO Exercise 참조; 웨이트 세션과 독립 |
| 음식 카탈로그 | Food | 공용 또는 User 소유 |
| 음식 즐겨찾기 | FoodFavorite | User N:M Food |
| 식사 | Meal | User 1:N Meal |
| 섭취 음식 | MealFood | Meal 1:N MealFood, Food 참조와 당시 영양정보 snapshot |
| 식단 프리셋 | MealPreset | User 1:N MealPreset |
| 프리셋 구성 | MealPresetFood | MealPreset 1:N MealPresetFood, Food 참조 |
| 신체 기록 | BodyRecord | User 1:N BodyRecord, 사용자·날짜당 1건 |

최근 사용 항목·사용 횟수·Dashboard·Analytics·Calendar는 위 기록에서 조회한다. 별도 RecentFood, Dashboard, Analytics 테이블은 만들지 않는다. Workout Preset은 WorkoutRoutine의 UI 표현이며 별도 엔티티가 아니다.

## 3. 계정·인증·설정

### User

| 필드 | 타입 / 규칙 |
|---|---|
| id | UUID |
| email | text, trim·소문자 정규화 후 unique |
| passwordHash | text, Argon2id 결과만 저장 |
| name | text, 1~100자 |
| createdAt / updatedAt | timestamptz |

서버의 계정 생성 명령으로 User·UserGoal·UserPreference를 한 transaction에서 생성한다. 기본 비밀번호를 seed하거나 공개 가입 API를 제공하지 않는다. 비밀번호 변경·관리 명령 재설정 시 기존 Session을 모두 폐기한다.

### Session

| 필드 | 타입 / 규칙 |
|---|---|
| id | UUID |
| userId | User FK |
| tokenHash | text, unique; 무작위 세션 토큰을 SESSION_SECRET으로 HMAC한 값 |
| createdAt | timestamptz |
| expiresAt | timestamptz, 생성 후 30일; MVP는 고정 만료 |

브라우저에는 충분한 엔트로피의 불투명 토큰만 HttpOnly cookie로 전달한다. 원문 토큰·비밀번호·cookie를 DB나 로그에 남기지 않는다. 운영은 Secure·SameSite=Lax·Path=/·host-only cookie, 로컬 HTTP 개발만 Secure=false로 구분한다. 로그아웃은 현재 Session 삭제와 cookie 만료를 함께 처리한다. 만료는 모든 인증 요청에서 검사하고 만료 행 정리 작업을 둔다. SESSION_SECRET 교체 시 기존 세션은 무효화된다.

### UserGoal

| 필드 | 타입 / 규칙 |
|---|---|
| userId | User FK이자 PK |
| targetWeight | D(7,2)?, > 0 |
| dailyCalories | D(10,2)?, > 0 |
| proteinGoal / carbGoal / fatGoal | D(10,2)?, > 0 |
| weeklyWorkoutGoal | int?, 1~7; 운동 **일수** 목표 |
| createdAt / updatedAt | timestamptz |

초기 목표는 null이며 사용자가 입력한다. 미설정 목표를 0% 달성으로 표시하지 않고 설정 유도 상태로 표시한다. 목표 변경 이력은 MVP에서 저장하지 않는다. 과거 기간의 목표 대비 비율도 **현재 목표 기준**임을 UI에 표시한다. `stepGoal`은 후속 릴리스 대상이다.

### UserPreference

| 필드 | 타입 / 규칙 |
|---|---|
| userId | User FK이자 PK |
| theme | enum `LIGHT / DARK / SYSTEM`, 기본 SYSTEM |
| createdAt / updatedAt | timestamptz |

단위·시간대 변경 UI는 MVP에 없다. 로그인한 사용자의 테마는 서버에 저장하고 첫 렌더링을 위한 로컬 캐시는 보조로 사용한다.

## 4. 운동·루틴·유산소

### Exercise

| 필드 | 타입 / 규칙 |
|---|---|
| id | UUID |
| ownerId | User FK?, null이면 공용 |
| catalogKey | text?, unique; 공용 seed의 고정 식별자 |
| name | text, 1~100자 |
| trackingType | enum `STRENGTH / CARDIO` |
| cardioInputMode | enum `DISTANCE / REPETITIONS / DURATION`?; CARDIO는 필수, STRENGTH는 null |
| category / muscleGroup | text, 카탈로그 분류 |
| archivedAt | timestamptz?, 기본 null |
| createdAt / updatedAt | timestamptz |

`isCustom`은 `ownerId != null`에서 파생하며 중복 저장하지 않는다. 같은 이름의 개인 항목을 금지하지 않는다. 공용 seed는 catalogKey로 멱등 적용한다. 사용자가 카탈로그에서 삭제하면 archive 처리한다. 기존 기록과 루틴의 참조는 보존한다. trackingType·cardioInputMode는 생성 후 변경하지 않고 다른 입력 방식이 필요하면 새 종목을 만든다. 유산소의 muscleGroup은 `FULL_BODY`를 기본 분류로 사용한다.

기본 카탈로그에는 아래 웨이트 13종과 유산소 7종을 함께 넣는다. seed 재실행은 catalogKey 기준 upsert로 중복을 만들지 않는다.

| catalogKey | 웨이트 이름 | trackingType | cardioInputMode |
|---|---|---|---|
| strength-bench-press | Bench Press | STRENGTH | null |
| strength-squat | Squat | STRENGTH | null |
| strength-deadlift | Deadlift | STRENGTH | null |
| strength-shoulder-press | Shoulder Press | STRENGTH | null |
| strength-lat-pulldown | Lat Pulldown | STRENGTH | null |
| strength-barbell-row | Barbell Row | STRENGTH | null |
| strength-pull-up | Pull Up | STRENGTH | null |
| strength-leg-press | Leg Press | STRENGTH | null |
| strength-leg-extension | Leg Extension | STRENGTH | null |
| strength-leg-curl | Leg Curl | STRENGTH | null |
| strength-lateral-raise | Lateral Raise | STRENGTH | null |
| strength-biceps-curl | Biceps Curl | STRENGTH | null |
| strength-triceps-pushdown | Triceps Pushdown | STRENGTH | null |

| catalogKey | 이름 | trackingType | cardioInputMode | 기록 입력 |
|---|---|---|---|---|
| cardio-running | 러닝 | CARDIO | DISTANCE | 시간 필수, 거리 선택, pace 계산 |
| cardio-jump-rope | 줄넘기 | CARDIO | REPETITIONS | 시간 필수, 횟수 선택 |
| cardio-walking | 걷기 | CARDIO | DISTANCE | 시간 필수, 거리 선택 |
| cardio-cycling | 사이클 | CARDIO | DISTANCE | 시간 필수, 거리 선택 |
| cardio-stair | 계단 오르기 | CARDIO | DURATION | 시간 필수 |
| cardio-swimming | 수영 | CARDIO | DISTANCE | 시간 필수, 거리 선택 (m 입력은 km로 변환) |
| cardio-other | 기타 유산소 | CARDIO | DURATION | 시간 필수 |

웨이트 기본 종목의 trackingType은 STRENGTH, cardioInputMode는 null이다. 웨이트 seed도 이름 변경과 무관한 고정 catalogKey를 사용한다. 검색·최근 운동·즐겨찾기는 양쪽 유형을 지원하고, 선택한 종목의 trackingType에 맞는 기록 Form으로 이동한다. 커스텀 유산소 종목도 위 입력 방식 중 하나를 골라 추가할 수 있다.

### ExerciseFavorite

| 필드 | 타입 / 규칙 |
|---|---|
| userId / exerciseId | User / Exercise FK, 복합 PK |
| createdAt | timestamptz |

추가 시 공용 또는 본인 소유인지 확인한다. archive된 종목은 신규 선택·즐겨찾기 목록에서 숨기며 과거 기록은 조회 가능하다.

### WorkoutSession

| 필드 | 타입 / 규칙 |
|---|---|
| id | 클라이언트가 생성할 수 있는 UUID; 생성 재시도 식별자 |
| userId | User FK |
| sourceRoutineId | WorkoutRoutine FK?, 삭제 시 SetNull |
| date | date, 사용자가 선택한 운동일 |
| status | enum `IN_PROGRESS / COMPLETED`, 기본 IN_PROGRESS |
| startedAt | timestamptz |
| endedAt | timestamptz?, 진행 중 null |
| durationSeconds | int?, 진행 중 null; 완료 시 서버가 종료-시작으로 계산 |
| memo | text?, 최대 2,000자 |
| revision | int, 기본 1; 수정마다 증가 |
| lastMutationId | UUID, 마지막 적용 요청 식별자 |
| lastMutationHash | text, 서버가 계산한 마지막 정규화 payload hash |
| createdAt / updatedAt | timestamptz |

완료 상태는 endedAt과 durationSeconds가 필수이며 endedAt >= startedAt, durationSeconds >= 0이다. 운동 완료에는 완료 세트가 최소 1개 필요하다. 완료 후 기록 수정은 허용하되 revision 검사를 유지한다. 다른 기기에서 동시에 하나의 세션을 편집하면 자동 병합하지 않는다.

### WorkoutExercise

| 필드 | 타입 / 규칙 |
|---|---|
| id | UUID, Draft와 서버에서 동일하게 사용 |
| workoutSessionId | WorkoutSession FK |
| exerciseId | Exercise FK |
| exerciseNameSnapshot | text, 종목 추가 시 이름 복사 |
| order | int >= 0 |
| createdAt / updatedAt | timestamptz |

unique(workoutSessionId, order). STRENGTH Exercise만 연결한다. 같은 종목을 한 세션에 여러 번 추가할 수 있다. 카탈로그 이름 수정이 과거 기록 이름을 바꾸지 않는다.

### WorkoutSet

| 필드 | 타입 / 규칙 |
|---|---|
| id | UUID, Draft와 서버에서 동일하게 사용 |
| workoutExerciseId | WorkoutExercise FK |
| setNumber | int >= 1 |
| weight | D(7,2), 기본 0, >= 0; 외부 중량 기준 |
| reps | int?, 입력 전 null, 입력 시 > 0 |
| rpe | D(4,1)?, 1~10, 0.5 단위 |
| completed | boolean, 기본 false |
| createdAt / updatedAt | timestamptz |

unique(workoutExerciseId, setNumber). completed=true이면 reps가 필수다. 맨몸 운동은 weight=0을 허용하고 외부 중량 volume도 0이다. 체중을 자동으로 합산하지 않는다. 세트 순서 변경은 unique 충돌을 피하도록 transaction에서 처리한다.

### WorkoutRoutine / RoutineExercise

| 엔티티 | 필드 |
|---|---|
| WorkoutRoutine | id UUID, userId FK, name text(1~100), description text?(최대 2,000), createdAt, updatedAt |
| RoutineExercise | id UUID, routineId FK, exerciseId FK, order int>=0, defaultSets int>0, defaultReps int?>0, createdAt, updatedAt |

unique(routineId, order). MVP 루틴은 STRENGTH 종목으로 구성한다. 유산소는 독립 기록으로 제공하고 혼합 루틴은 후속 범위다. 루틴 시작 시 새 WorkoutSession·WorkoutExercise·WorkoutSet을 복사 생성한다. 이후 루틴 변경은 기존 세션을 바꾸지 않는다. archive된 종목이 포함된 루틴은 해당 항목을 교체하도록 안내하고 시작을 막는다. 소유권·trackingType 검사와 전체 복사를 하나의 transaction으로 처리한다.

### CardioRecord

| 필드 | 타입 / 규칙 |
|---|---|
| id | UUID |
| userId | User FK |
| date | date |
| exerciseId | Exercise FK, trackingType=CARDIO만 허용 |
| exerciseNameSnapshot | text, 기록 생성 시 이름 복사 |
| durationSeconds | int > 0 |
| distanceKm | D(8,3)?, > 0 |
| repetitions | int?, > 0; 줄넘기 횟수 등 |
| calories | D(10,2)?, >= 0; 사용자가 입력한 값 |
| averageHeartRate | int?, 1~300 |
| memo | text?, 최대 2,000자 |
| createdAt / updatedAt | timestamptz |

DISTANCE 종목만 distanceKm를, REPETITIONS 종목만 repetitions를 허용한다. DURATION 종목은 두 값이 모두 null이다. 선택 지표를 입력하지 않고 시간만 기록하는 것은 모든 유산소에서 가능하다. 공용 또는 본인 소유이며 archive되지 않은 CARDIO Exercise만 신규 연결할 수 있다. 과거 기록은 종목 archive 후에도 조회·수정·삭제할 수 있으며 종목 교체 시 새 이름 snapshot을 복사한다.

평균 pace는 거리 > 0일 때 durationSeconds / distanceKm(초/km)로 계산한다. 별도 pace 필드를 저장하지 않는다. 줄넘기는 시간·횟수 추세를 표시하고 거리나 pace를 강제하지 않는다. 유산소는 완료 기록만 저장하며 웨이트 세션과 독립적인 CRUD를 제공한다. 웨이트의 칼로리 자동 추정·웨어러블 연동은 MVP에서 제공하지 않는다. 입력 방식 제약은 Exercise와의 조인이 필요하므로 서버 transaction에서 검증하고, 개별 수치·null 조합의 기본 제약은 DB에서도 검증한다.

## 5. 음식·식사·프리셋

### Food

| 필드 | 타입 / 규칙 |
|---|---|
| id | UUID |
| ownerId | User FK?, null이면 공용 |
| catalogKey | text?, unique; 공용 seed 식별자 |
| name | text, 1~100자 |
| servingSize | D(10,3) > 0 |
| servingUnit | enum `G / ML / PIECE / PACK / SERVING` |
| calories / protein / carbs / fat | D(10,2) >= 0; servingSize당 영양정보 |
| archivedAt | timestamptz?, 기본 null |
| createdAt / updatedAt | timestamptz |

예: servingSize=100, servingUnit=G, calories=165이면 100g당 165kcal다. 입력 단위는 해당 Food의 단위를 따른다. 밀도 정보가 없으므로 g↔ml 자동 변환은 하지 않는다. 사용자 카탈로그 삭제는 archive이며 과거 기록을 삭제하지 않는다. 외부 음식 API는 MVP 필수 의존성이 아니다.

### FoodFavorite

| 필드 | 타입 / 규칙 |
|---|---|
| userId / foodId | User / Food FK, 복합 PK |
| createdAt | timestamptz |

공용 또는 본인 Food에만 등록 가능하다. archive된 Food는 신규 선택·즐겨찾기 목록에서 숨긴다.

### Meal

| 필드 | 타입 / 규칙 |
|---|---|
| id | UUID |
| userId | User FK |
| date | date |
| mealType | enum `BREAKFAST / LUNCH / DINNER / SNACK` |
| memo | text?, 최대 2,000자 |
| createdAt / updatedAt | timestamptz |

같은 날짜·식사 구분의 Meal을 여러 건 허용한다. UI에서 같은 구분으로 묶는다. 저장 시 음식이 최소 1개 필요하며 마지막 음식을 제거할 때는 식사 삭제 여부를 확인한다. totalCalories는 저장하지 않고 MealFood에서 합산한다.

### MealFood

| 필드 | 타입 / 규칙 |
|---|---|
| id | UUID |
| mealId | Meal FK |
| foodId | Food FK |
| order | int >= 0, unique(mealId, order) |
| foodNameSnapshot | text |
| servingSizeSnapshot | D(10,3) > 0 |
| servingUnitSnapshot | Food의 servingUnit enum |
| caloriesSnapshot / proteinSnapshot / carbsSnapshot / fatSnapshot | D(10,2) >= 0; 기준 1회 제공량당 영양정보 |
| servings | D(10,3) > 0; 섭취한 기준 제공량의 배수 |
| createdAt / updatedAt | timestamptz |

MealFood 생성 시 **서버가** Food의 이름·단위·영양정보를 snapshot으로 복사한다. 클라이언트가 영양 snapshot을 임의로 주입하지 않는다. 100g 기준 Food를 200g 먹었으면 servings=2, 총 영양은 snapshot × 2다. 표시 섭취량은 servingSizeSnapshot × servings다.

Food 수정·archive 후에도 기존 MealFood snapshot은 유지한다. 과거 기록의 양만 수정하면 servings만 변경한다. 음식 교체 시 새 Food snapshot을 복사한다. 이후 목표나 Food 변경으로 과거 섭취 영양값을 재계산하지 않는다.

### MealPreset / MealPresetFood

| 엔티티 | 필드 |
|---|---|
| MealPreset | id UUID, userId FK, name text(1~100), defaultMealType Meal.mealType과 같은 enum?, createdAt, updatedAt |
| MealPresetFood | id UUID, presetId FK, foodId FK, order int>=0, servings D(10,3)>0, createdAt, updatedAt |

unique(presetId, order). 프리셋은 Food 참조와 제공량 배수를 저장하는 **템플릿**이다. 사용 시 최신 Food 값으로 새로운 Meal·MealFood snapshot을 transaction에서 생성한다. Food 수정은 프리셋 미리보기·다음 사용부터 반영하며 과거 Meal에는 반영하지 않는다. Food 단위/기준량이 바뀌면 프리셋의 실제 양도 달라질 수 있으므로 추가 전 최신 양·영양 합계를 표시한다. archive된 음식은 교체 전 프리셋 적용을 막는다.

## 6. 신체 기록

### BodyRecord

| 필드 | 타입 / 규칙 |
|---|---|
| id | UUID |
| userId | User FK |
| date | date |
| weight | D(7,2) > 0, 필수 |
| bodyFat | D(4,1)?, 0~100 |
| muscleMass | D(7,2)?, > 0 |
| waist | D(7,2)?, > 0 |
| memo | text?, 최대 2,000자 |
| createdAt / updatedAt | timestamptz |

unique(userId, date). 같은 날 빠른 체중 입력은 해당 기록을 갱신한다. 체중만 수정할 때 체지방·근육량·허리·메모를 지우지 않는다. API는 생략(유지)과 명시적 null(선택 필드 비우기)을 구분한다.

## 7. 삭제·참조·인덱스

### 삭제 정책

| 삭제 대상 | 동작 |
|---|---|
| Session | 해당 세션만 삭제 |
| WorkoutSession | WorkoutExercise → WorkoutSet cascade |
| WorkoutExercise | 하위 WorkoutSet cascade |
| WorkoutRoutine | RoutineExercise cascade; 기존 세션 sourceRoutineId SetNull |
| Meal | MealFood cascade |
| MealPreset | MealPresetFood cascade; 기존 Meal은 독립 보존 |
| BodyRecord / CardioRecord / Favorite | 해당 행만 삭제 |
| Exercise / Food | 사용자 UI에서는 archive. 카탈로그 FK는 Restrict로 이력 보호 |
| User | MVP에는 계정 삭제 UI/API 없음. Session·설정·Favorite는 cascade 가능, 기록·개인 카탈로그는 Restrict. 향후 삭제 서비스에서 순서를 명시 |

카탈로그 archive는 ExerciseFavorite/FoodFavorite 참조를 유지하되 조회에서 숨긴다. 조인된 개인 항목의 소유권 검사는 FK만으로 대체할 수 없으므로 API 통합 테스트로 검증한다.

### 필수 인덱스

- User: unique(email).
- Session: unique(tokenHash), index(userId), index(expiresAt).
- WorkoutSession: index(userId, date), index(userId, status, updatedAt).
- WorkoutExercise: unique(workoutSessionId, order), index(exerciseId).
- WorkoutSet: unique(workoutExerciseId, setNumber).
- WorkoutRoutine / MealPreset: index(userId, updatedAt).
- RoutineExercise: unique(routineId, order), index(exerciseId).
- CardioRecord: index(userId, date), index(userId, exerciseId, date), index(exerciseId).
- Exercise / Food: unique(catalogKey), index(ownerId, archivedAt). 소규모 검색은 이름 검색으로 시작한다.
- ExerciseFavorite / FoodFavorite: 복합 PK 외에 exerciseId / foodId 역방향 FK 인덱스.
- Meal: index(userId, date, mealType).
- MealFood: unique(mealId, order), index(foodId).
- MealPresetFood: unique(presetId, order), index(foodId).
- BodyRecord: unique(userId, date).

## 8. 집계 규칙

| 지표 | MVP 정의 |
|---|---|
| 웨이트 운동 횟수 | 선택 기간의 COMPLETED WorkoutSession 수 |
| 주간 운동일 / 목표 진행률 | 완료 웨이트 또는 CardioRecord가 있는 고유 날짜 수 / weeklyWorkoutGoal. 같은 날 둘 다 있어도 1일 |
| 총 운동시간 | 완료 웨이트 durationSeconds + CardioRecord durationSeconds. 동일 운동을 두 도메인에 중복 입력하지 않도록 안내 |
| 총 세트 / volume | 완료 세션의 completed=true 세트만 집계. volume = Σ(weight × reps) |
| 이전 운동 / 중량 추세 | 같은 exerciseId의 완료 세션·완료 세트. 중량 추세는 날짜별 최대 외부 중량 |
| 유산소 이전 기록 / 추세 | 같은 exerciseId의 CardioRecord. 시간 합계와 종목별 거리/횟수 추세; 기간 pace는 총 시간 / 총 거리로 계산 (거리 있는 기록만) |
| 일일 영양 | 해당 날짜 모든 MealFood의 영양 snapshot × servings 합계 |
| 기간 평균 영양 | 식사 기록이 있는 날짜의 일일 합계 평균. 미기록일을 0으로 간주하지 않고 기록일 수 표시 |
| 목표 대비 비율 | 기록일 평균 / 현재 설정 목표 × 100. 상한 100%로 잘라내지 않음; 미설정 목표는 null |
| 현재 체중 | 조회 기준일 이하의 가장 최근 weight와 실제 측정일 |
| 7일 이동평균 | 해당 날짜 포함 직전 7개 달력일의 기록 평균. 기록 없는 날 제외, 기록 0건이면 null |
| 체중 변화 | 선택 기간 내 마지막 측정값 - 첫 측정값. 2건 미만이면 null |
| 이전 기간 비교 | 직전 동일 길이 기간의 기록 평균과 비교. 한쪽에 기록이 없으면 null |
| Calendar | 웨이트 완료/유산소, 식사, 신체 기록 존재 여부. 진행 중 운동은 별도 작성 중 표시 |
| 최근/자주 먹는 Food | 본인의 MealFood에서 마지막 사용일과 등장 횟수 계산. archive 제외, 최근순/빈도순 선택 |

Dashboard의 주간 운동 표시는 “횟수”와 “운동일”을 구분한다. PRD의 `4 / 5 days`는 운동일 목표이며 웨이트 세션 수와 혼용하지 않는다. 집계는 동일 날짜 규칙과 Decimal 계산을 공유하고 반올림은 표시 단계에서 수행한다.

## 9. 운동 Draft와 서버 동기화

IndexedDB Draft는 로컬 저장 구조이며 별도 Prisma 엔티티가 아니다. MVP는 운동 편집 중 보존·복구·네트워크 재시도까지 제공한다. 앱 자체의 완전 오프라인 실행이나 기기 간 자동 병합은 후속 범위다.

| 로컬 필드 | 의미 |
|---|---|
| schemaVersion | 로컬 payload 형식 버전 |
| userId + workoutId | 저장 키, 계정별 격리 |
| baseRevision | 마지막으로 확인한 서버 revision, 신규 미전송이면 null |
| payload | 세션·종목·세트 편집 값과 안정적인 UUID들 |
| pendingMutationId | 현재 전송/재시도 요청 UUID |
| pendingPayload | 해당 UUID에 고정된 요청 snapshot; 재시도 중 변경 금지 |
| updatedAt | 로컬 마지막 편집 시각 |
| syncState | `DIRTY / SAVING / SYNCED / FAILED / CONFLICT` |

1. 편집을 IndexedDB에 먼저 저장한다. 서버 전송은 세션당 한 번에 하나만 수행하고 후속 편집은 큐에 유지한다.
2. 생성 요청은 workoutId와 mutationId를 고정한다. 동일 id의 성공 요청 재전송이면 사용자·mutationId·payload hash가 일치할 때만 기존 성공 결과를 반환한다. 다른 내용은 409다.
3. 수정은 baseRevision을 함께 보낸다. 서버는 소유권 검사, revision 비교, 전체 편집 적용, revision 증가, lastMutationId/hash 저장을 한 transaction으로 처리한다.
4. 마지막 요청과 같은 mutationId/hash 재전송은 재적용 없이 성공 응답한다. 같은 mutationId에 다른 내용이면 409다. 이미 후속 수정이 적용되어 마지막 요청이 달라졌다면 과거 재시도는 409로 돌려주고 서버를 다시 읽는다.
5. 서버 응답이 도착해도 전송 이후 발생한 로컬 편집은 지우지 않는다. 응답 revision을 다음 요청의 baseRevision으로 사용한다.
6. revision 충돌은 409, 삭제된 기존 세션은 404다. Draft를 보존하고 서버 버전 다시 읽기·로컬 내용 확인을 제공한다. 자동 덮어쓰기·삭제된 운동 자동 재생성은 하지 않는다.
7. 완료 버튼도 같은 요청 계약을 따른다. 성공이 확인된 완료 snapshot만 Draft에서 정리한다. 완료 응답 유실 후 재시도가 운동·세트를 중복 생성하지 않아야 한다.
8. 401이면 로컬 내용을 유지하고 재로그인을 안내한다. 로그아웃 시 미동기화 여부를 보여주고 사용자 확인 후 해당 계정의 로컬 Draft를 정리한다. 다른 계정에는 이전 Draft를 표시하지 않는다.
9. IndexedDB 실패·용량 부족·지원하지 않는 schemaVersion은 조용히 저장 성공으로 표시하지 않는다. 저장 실패 상태와 재시도를 제공한다.

운동 생성·세트 복사·순서 변경·운동 완료·루틴 복사는 동일한 revision 계약을 사용한다. 범용 mutation 테이블이나 CRDT는 MVP에서 도입하지 않는다.

## 10. 모델 구현 완료 조건

- [x] 19개 엔티티의 Prisma schema와 FK/unique/index/CHECK migration 작성
- [x] 빈 PostgreSQL에서 migration 적용과 Prisma Client 생성 성공
- [x] 계정 생성 시 기본 목표·설정 생성, 공용 운동 seed 재실행 시 중복 없음
- [x] 웨이트 13종 + 유산소 7종(러닝·줄넘기 포함) seed, 유형별 검색·최근 기록·즐겨찾기
- [x] 러닝 거리/pace·줄넘기 횟수 저장·수정·조회·삭제와 유형에 맞지 않는 필드 차단
- [x] 타 사용자 기록 및 비공개 카탈로그 연결 차단
- [x] 세션 만료·로그아웃·비밀번호 재설정 후 인증 실패
- [x] Food 수정·archive·프리셋 수정 후 과거 영양 기록 불변
- [x] Exercise 이름 수정·archive 후 웨이트/유산소 과거 기록 이름 snapshot 보존
- [x] 루틴 수정·삭제 후 기존 운동 기록 불변
- [x] 같은 날 BodyRecord 중복 방지와 부분 수정 시 선택 필드 보존
- [x] 날짜 경계·빈 기간·미기록일·미설정 목표·소수 합산 테스트
- [x] Draft 응답 유실·재전송·충돌·삭제·완료 경합 테스트
- [ ] 격리 DB 백업·복구 후 관계·행 수·대표 집계 일치 (Phase 21)

## 구현 보강 (Phase 2)

- PostgreSQL BEFORE trigger가 카탈로그 소유권·archive·trackingType 및 snapshot 생성을 보강한다. 기존 참조를 유지하는 기록 수정은 archive 후에도 가능하다.
- 소유자와 부모 FK의 재할당은 금지한다. Exercise trackingType/cardioInputMode는 불변이다.
- Decimal NaN도 CHECK로 거부한다. 영양 snapshot과 운동명은 같은 참조를 유지하는 수정에서 원본을 보존한다.
- API의 인증·소유권 가드는 여전히 필수이며 Phase 5 이후 구현한다. 현재 외부에 개인 데이터 쓰기 엔드포인트를 제공하지 않는다.
- [검증 명령과 결과](development-log.md).

## Phase 15까지의 검증

계정·카탈로그·기록·목표·집계·Draft 계약은 API/DB/브라우저 테스트로 검증했다. `pnpm verify`의 세부 명령과 결과는 [개발 작업 기록](development-log.md)을 따른다. 백업/복구와 실제 운영 검증은 아직 완료로 표시하지 않는다.
