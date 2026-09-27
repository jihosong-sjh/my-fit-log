# 개인 운동·식단 관리 웹페이지 PRD

정리 기준일: 2026-09-27. **MVP 범위는 46~47절이 기준**이며 아래 화면 예시 중 후속 기능은 별도로 표시한다. P0와 P1을 모두 최종 MVP에 포함한다.

문서 장 번호는 구현 Phase가 아니다. 구현 번호는 [체크리스트](<MyFit Log 구현 계획 및 개발 체크리스트.md>)의 **Phase 0~29**만 사용한다. 필드·관계·집계 규칙은 [데이터 모델](<MyFit Log 데이터 모델 명세.md>), 기술 선택은 [아키텍처](<MyFit Log 기술 아키텍처 설계서.md>), 문서 사용법은 [문서 안내](README.md)를 따른다.

## 1. 문서 개요

### 1.1 프로젝트명
**MyFit Log**  
가칭이며 추후 변경 가능.

### 1.2 프로젝트 목적

운동과 식단을 매일 기록하고, 체중·운동량·섭취량의 변화를 직관적으로 확인할 수 있는 **개인용 운동/식단 관리 웹 애플리케이션**을 구축한다.

기존 운동·식단 앱처럼 기능을 과도하게 확장하기보다는 아래에 집중한다.

- 빠른 기록
- 기록의 지속성
- 오늘 상태 확인
- 주간/월간 변화 확인
- 운동 루틴 관리
- 식단 관리
- 몸 상태 변화 추적
- 깔끔하고 사용하기 편한 UI/UX

핵심 UX 목표는 다음 한 문장으로 정의한다.

> **웹페이지를 열고 10초 안에 오늘 상태를 확인하고, 30초 안에 운동 또는 식단 기록을 추가할 수 있어야 한다.**

---

# 2. 제품 목표

## 2.1 핵심 목표

사용자가 매일 웹페이지를 방문했을 때 다음 질문에 즉시 답할 수 있어야 한다.

1. 오늘 운동했는가?
2. 오늘 무엇을 먹었는가?
3. 오늘 목표 대비 얼마나 먹었는가?
4. 이번 주 운동량은 충분한가?
5. 체중이 어떤 방향으로 변화하고 있는가?
6. 최근 운동 퍼포먼스가 좋아지고 있는가?
7. 식단과 체중 변화 사이에 어떤 관계가 있는가?

---

# 3. 제품 컨셉

일반적인 헬스 앱은 기능이 많아질수록 기록 과정이 복잡해지는 문제가 있다.

본 서비스에서는 다음 UX 원칙을 따른다.

### Fast
기록 과정은 최대한 짧게 한다.

### Visual
숫자보다 그래프와 진행률을 우선적으로 보여준다.

### Personal
SNS, 친구, 커뮤니티 기능 없이 **오직 개인 기록에 집중한다.**

### Progressive
처음부터 모든 정보를 요구하지 않는다.

기본 기록은 단순하게 하고 원하는 경우 세부 정보를 추가할 수 있도록 한다.

예:

운동 기록

```
벤치프레스
80kg × 8회 × 4세트
```

기본 기록 후 필요하면

```
RPE
휴식시간
메모
운동 시간
```

등을 추가할 수 있다.

---

# 4. 주요 사용자

## Primary User

운동과 식단을 꾸준히 관리하고 싶은 개인 사용자.

특히 다음 사용자에게 적합하다.

- 헬스 / 웨이트 트레이닝 사용자
- 러닝 또는 유산소 운동 사용자
- 체중 감량 중인 사용자
- 근육 증가를 목표로 하는 사용자
- 식단을 간단하게 기록하고 싶은 사용자
- 운동 기록과 체중 변화를 같이 보고 싶은 사용자

---

# 5. 서비스 구조

전체 메뉴는 복잡하지 않도록 **5개의 핵심 메뉴**로 제한한다.

```text
Dashboard
│
├─ Workout
│
├─ Diet
│
├─ Body
│
└─ Analytics
```

설정은 별도의 메뉴 또는 프로필 영역에서 접근한다.

```text
Dashboard
Workout
Diet
Body
Analytics

─────────

Settings
```

---

# 6. Dashboard

Dashboard는 서비스에서 가장 중요한 화면이다.

페이지 진입 즉시 **오늘의 상태**를 보여준다.

---

## 6.1 화면 구성

### Header

```text
Good morning 👋

2026.09.27 Sunday
```

오른쪽

```text
+ Quick Add
Profile
```

---

## 6.2 Today Summary

상단에 4개의 핵심 카드 표시.

```text
┌────────────────┐
│ 운동           │
│ 65 min         │
│ ✓ 완료         │
└────────────────┘

┌────────────────┐
│ 섭취 칼로리    │
│ 1,850 / 2,200  │
│ ████████░░     │
└────────────────┘

┌────────────────┐
│ 단백질         │
│ 132 / 160 g    │
│ ████████░░     │
└────────────────┘

┌────────────────┐
│ 체중           │
│ 82.4 kg        │
│ ↓ 0.3kg        │
└────────────────┘
```

---

# 7. Today Progress

하루 영양 목표와 주간 운동일 목표를 표시한다.

```text
Calories  1850 / 2200 kcal
Protein   132 / 160 g
Carbs     205 / 250 g
Fat       52 / 65 g
Workout   이번 주 4 / 5일
```

운동일은 완료 웨이트 또는 유산소 기록이 있는 날짜다. 같은 날 러닝과 웨이트를 해도 1일이다. 목표가 없으면 목표 설정을 안내한다. 걸음수와 운동시간 목표는 후속 릴리스이며 MVP는 실제 운동시간만 표시한다.

---

# 8. Quick Add

기록에서 가장 중요한 UX.

모든 페이지에서 접근 가능하도록 한다.

Floating Action Button 또는 Header 버튼 사용.

```text
＋ 기록하기
```

클릭하면 Modal 또는 Bottom Sheet 표시.

```text
무엇을 기록할까요?

🏋 운동
🍚 식단
⚖️ 체중
🏃 유산소
```

기록 추가 과정은 **페이지 이동을 최소화한다.** 물·독립 메모 입력은 후속 릴리스이며 각 기록의 메모 필드는 MVP에 포함한다.

---

# 9. Workout

운동 기록 및 루틴 관리 화면.

---

# 10. 운동 기록 구조

운동 데이터 구조

```text
Workout Session

Date
Start Time
End Time

Exercises[]
```

각 Exercise

```text
Exercise Name

Set
Weight
Reps
RPE
```

예:

```text
Bench Press

SET   KG   REPS

1     70    10
2     80     8
3     80     8
4     80     7

+ Add Set
```

---

# 11. 운동 기록 UX

운동 중에는 입력 인터페이스를 최대한 단순하게 한다.

예:

```text
Bench Press

Previous
80kg × 8

Current

Weight
[ 80 ]

Reps
[ 8 ]

[ Complete Set ]
```

세트 완료 시 자동으로 다음 세트를 생성한다.

---

# 12. 이전 운동 기록 표시

운동 입력 시 매우 중요한 기능.

```text
Last Workout

80kg × 8
80kg × 8
80kg × 7
```

사용자가 자연스럽게 Progressive Overload를 확인할 수 있다.

---

# 13. 운동 루틴

사용자가 반복하는 운동을 저장할 수 있다.

예:

```text
Push Day

Bench Press
Incline DB Press
Shoulder Press
Lateral Raise
Triceps Pushdown
```

버튼

```text
Start Workout
```

누르면 오늘 운동 세션이 자동 생성된다.

---

# 14. 운동 템플릿

예:

```text
Routine

PUSH
PULL
LEGS
FULL BODY
```

사용자가 직접 추가/수정 가능. MVP 루틴은 웨이트 종목으로 구성하고, 유산소는 별도 기록으로 제공한다. 웨이트·유산소 혼합 루틴은 후속 릴리스다.

---

# 15. 운동 완료 화면

운동 종료 후 간단한 요약을 보여준다.

```text
Workout Complete 🎉

Duration
68 min

Exercises
6

Sets
22

Volume
12,840 kg

```

추가로

```text
Today's Best

Bench Press
80kg × 8
```

같은 정보를 제공한다. Today's Best는 현재 세션의 최대 중량 세트 표시이며 장기 PR 판정은 후속 범위다. 웨이트 칼로리 자동 추정은 MVP에서 제공하지 않는다.

---

# 16. Cardio

웨이트와 함께 **기본 운동 카탈로그에 유산소 종목도 seed**한다. 공통 Exercise에서 trackingType으로 입력 방식을 구분하고, 유산소 결과는 CardioRecord에 저장한다.

| 기본 유산소 종목 | 필수 입력 | 선택 입력 / 표시 |
|---|---|---|
| 러닝 | 날짜, 시간 | 거리, 평균 pace |
| 줄넘기 | 날짜, 시간 | 줄넘기 횟수 |
| 걷기 | 날짜, 시간 | 거리, 평균 pace |
| 사이클 | 날짜, 시간 | 거리, 평균 pace |
| 계단 오르기 | 날짜, 시간 | 시간 중심 기록 |
| 수영 | 날짜, 시간 | 거리 (m 입력을 km 저장값으로 변환) |
| 기타 유산소 | 날짜, 시간 | 시간 중심 기록 |

모든 종목에서 칼로리·평균 심박·메모를 선택 입력할 수 있다. 칼로리는 사용자가 입력한 값이며 자동 추정하지 않는다. 거리·횟수 없이 시간만 저장할 수 있다. 줄넘기에 거리나 pace를 강제하지 않는다.

예: 러닝 30분 / 5km → pace 6분/km, 줄넘기 10분 / 1,000회.

MVP에서 제공할 흐름:

- `/workout`에서 웨이트·유산소 검색/필터, 최근 종목, 즐겨찾기
- Quick Add → 유산소 → 기본 또는 커스텀 종목 선택 → 기록 저장
- 날짜·종목별 History 조회, 수정, 삭제
- Dashboard 운동시간·운동일과 Calendar에 반영
- Analytics에서 종목별 시간·거리 또는 횟수 추세 확인

유산소는 완료 기록을 입력하는 방식이며 웨이트의 세트·중량·RPE Form과 구분한다. 커스텀 종목은 시간+거리 / 시간+횟수 / 시간 중 입력 방식을 선택한다. 원시 필드·단위·seed 키는 데이터 모델 명세를 따른다.

---

# 17. Diet

식단 화면에서는 **칼로리 계산보다 기록 편의성**을 우선한다.

---

# 18. 식사 구분

기본

```text
Breakfast
Lunch
Dinner
Snack
```

한국 사용자 기준으로

```text
아침
점심
저녁
간식
```

사용 가능.

---

# 19. 식단 카드

예:

```text
Lunch

Chicken Breast      200g
Rice                200g
Egg                  2

────────────

Calories   620 kcal
Protein     54 g
Carbs       68 g
Fat         14 g
```

---

# 20. 음식 추가

음식 검색

```text
Search food...

닭가슴살
현미밥
계란
바나나
두유
```

자주 먹는 음식은 상단 노출.

```text
Recently Used
Favorites
```

---

# 21. 빠른 식단 기록

매번 영양정보를 입력할 필요가 없도록 한다.

예:

```text
My Meals

아침 기본식단

계란 3개
밥 200g
두유 1팩
```

버튼

```text
+ 오늘 아침으로 추가
```

한 번 클릭하면 전체 음식이 기록된다.

---

# 22. Nutrition Summary

식단 페이지 상단.

```text
Daily Nutrition

Calories
1850 / 2200

Protein
132 / 160g

Carbs
205 / 250g

Fat
52 / 65g
```

원형 Progress 또는 Horizontal Progress 사용.

---

# 23. Body

신체 데이터를 기록한다.

기본 기록

```text
Weight
Body Fat
Muscle Mass
Waist
```

후속 릴리스의 추가 신체 치수 (MVP 제외)

```text
Chest
Arm
Thigh
Hip
```

---

# 24. 체중 기록

입력 UX

```text
Today's Weight

[ 82.4 ] kg

Yesterday
82.7 kg

Difference
-0.3 kg
```

숫자 입력을 최소화한다.

---

# 25. Weight Trend

체중은 하루 변동보다 추세가 중요하므로

두 가지 데이터를 함께 보여준다.

```text
Daily Weight
7 Day Average
```

그래프 예

```text
84 ─●
83      ●
82            ●──●
81
```

7일 이동평균을 강조한다.

---

# 26. Analytics

모든 기록을 분석하는 페이지.

기간 선택

```text
7 Days
30 Days
3 Months
6 Months
1 Year
```

---

# 27. 체중 분석

그래프

```text
Weight Trend

85kg ┤●
84kg ┤  ●
83kg ┤     ●
82kg ┤        ●
```

표시 정보

```text
Start Weight
Current Weight
Change
Weekly Average Change
```

---

# 28. 운동 분석

### Training Volume

```text
Weekly Training Volume

Mon ███████
Tue █████
Wed ████████
Thu
Fri █████████
```

---

# 29. 운동 빈도

MVP는 주간 운동일·웨이트 완료 횟수와 월간 Calendar를 제공한다. 아래 연간 Calendar Heatmap은 후속 릴리스 예시다.

Github contribution 그래프와 비슷한 방식.

```text
         JAN FEB MAR APR

Mon      ░ ░ ▓ ▓
Tue      ▓ █ ▓ ░
Wed      █ █ ░ ▓
```

운동한 날을 시각적으로 보여준다.

꾸준함 자체가 동기부여가 되도록 한다.

---

# 30. 운동 퍼포먼스

운동별 중량 변화.

예:

```text
Bench Press

Jan      70kg
Feb      75kg
Mar      80kg
Apr      85kg
```

1RM 추정값과 PR 판정은 후속 릴리스에서 제공한다.

---

# 31. 식단 분석

Weekly Calories

```text
Mon 2100
Tue 1980
Wed 2300
Thu 2150
Fri 2200
```

추가 지표

```text
Average Calories

Average Protein

Goal Achievement Rate
```

---

# 32. Dashboard 추가 정보

하단에는 간단한 Insight를 제공한다.

예:

```text
This Week

운동
4 / 5 days

평균 단백질
148g

체중 변화
-0.6kg
```

Insight는 과도하게 AI처럼 표현하지 않는다.

객관적인 데이터만 보여준다.

---

# 33. Calendar

운동 / 식단 / 체중 기록을 날짜별로 확인 가능.

```text
September 2026

SUN MON TUE WED THU FRI SAT

         1   2   3   4   5
         ●   ●       ●

 6   7   8   9  10  11  12
 ●       ●   ●
```

날짜 선택 시

```text
09/27

Workout

Push Day
68 min

Diet

2,050 kcal

Weight

82.4kg
```

---

# 34. 목표 설정

`/settings`에서 다음 값을 저장한다. Dashboard보다 먼저 구현하며 새로고침·재로그인 후에도 유지한다.

- 이름
- 목표 체중
- 일일 칼로리·단백질·탄수화물·지방 목표
- 주간 운동일 목표 (1~7일)
- Light / Dark / System 테마

초기 목표는 미설정 상태다. 미설정 목표의 달성률을 0%로 표시하지 않는다. 목표 이력은 MVP에 없으므로 과거 기간의 목표 대비 비율에도 **현재 목표 기준**임을 표시한다. MVP 시간대는 Asia/Seoul, 단위는 kg·cm·km·kcal·g다. 걸음수 목표·운동시간 목표·단위/시간대 변경은 후속 범위다.

---

# 35. Streak — 후속 릴리스

MVP 완료 조건에서 제외한다.

과도한 게임화는 피하되 기록 지속성을 위해 최소한의 Streak 제공.

예:

```text
🔥 Workout Streak

7 days
```

또는

```text
This Month

Workout

18 / 22 days
```

---

# 36. UI 디자인 방향

디자인 핵심 키워드

```text
Minimal
Clean
Premium
Calm
Data-focused
```

과도하게 헬스 앱 느낌을 내지 않는다.

---

# 37. 컬러 시스템

Light Mode 기준.

Background

```text
#F7F8FA
```

Card

```text
#FFFFFF
```

Primary

```text
#111827
```

Accent

```text
#5B7CFF
```

Success

```text
#22C55E
```

Warning

```text
#F59E0B
```

Danger

```text
#EF4444
```

---

# 38. Dark Mode

Dark Mode도 지원한다.

Background

```text
#0F1115
```

Card

```text
#171A21
```

Border

```text
#262A33
```

Text

```text
#F9FAFB
```

---

# 39. 디자인 레이아웃

Desktop

```text
┌─────────────┬─────────────────────────────┐
│             │                             │
│ Sidebar     │ Main Content                │
│             │                             │
│ Dashboard   │                             │
│ Workout     │                             │
│ Diet        │                             │
│ Body        │                             │
│ Analytics   │                             │
│             │                             │
└─────────────┴─────────────────────────────┘
```

Sidebar width

```text
220 ~ 240px
```

Content Width

```text
max-width: 1400px
```

---

# 40. 모바일 UX

Responsive Web으로 구현한다.

Mobile에서는 Sidebar 대신 Bottom Navigation.

```text
Home
Workout
+
Diet
Stats
```

가운데 `+` 버튼을 Quick Add로 사용.

---

# 41. 모바일 화면 예

```text
Good morning 👋

Today

Calories
1850 / 2200
████████████░░

Protein
132 / 160g
██████████░░░

────────────

Today's Workout

Push Day

68 min

────────────

Weight

82.4kg
↓ 0.3kg
```

---

# 42. Interaction Design

버튼 클릭이나 기록 완료 시 과도한 애니메이션 대신 미세한 Interaction 사용.

예

```text
Set Completed ✓
```

0.2~0.3초 Fade / Scale animation.

운동 완료 시

```text
Workout Completed 🎉
```

정도의 Micro Interaction만 제공한다.

---

# 43. Typography

추천

```text
Pretendard
Inter
```

한국어 UI

```text
Pretendard
```

권장.

Font Weight

```text
400 Regular
500 Medium
600 SemiBold
700 Bold
```

---

# 44. Component Design

주요 공통 컴포넌트

```text
Button

Card

Input

NumberInput

Modal

BottomSheet

ProgressBar

ProgressCircle

StatCard

ChartCard

DatePicker

Calendar

Tabs

Toast

Dropdown

SearchInput
```

---

# 45. 데이터 구조

구현 기준은 [데이터 모델 명세](<MyFit Log 데이터 모델 명세.md>)에 통합한다. PRD에는 별도 필드 목록을 유지하지 않는다.

| 제품 영역 | 엔티티 |
|---|---|
| 계정·인증·설정 | User, Session, UserGoal, UserPreference |
| 공통 운동 카탈로그·즐겨찾기 | Exercise, ExerciseFavorite |
| 웨이트·루틴 | WorkoutSession, WorkoutExercise, WorkoutSet, WorkoutRoutine, RoutineExercise |
| 유산소 | CardioRecord (CARDIO Exercise 참조) |
| 음식·식사·즐겨찾기 | Food, FoodFavorite, Meal, MealFood |
| 식단 프리셋 | MealPreset, MealPresetFood |
| 신체 | BodyRecord |

음식 영양정보·기록 당시 종목 이름은 snapshot으로 보존한다. 루틴/프리셋 변경은 과거 기록을 바꾸지 않는다. 신체 기록은 사용자·날짜당 1건이다. 최근 사용·통계·달력은 저장된 기록에서 조회한다. 운동 Draft는 계정별 IndexedDB에 저장하고 서버 revision으로 충돌을 확인한다.

---

# 46. MVP 범위

**P0와 P1을 모두 최종 MVP에 포함한다.** 우선순위는 구현 순서를 위한 구분이며 P1을 자동으로 제외하지 않는다.

| 영역 | P0 핵심 흐름 | P1 완성도 기능 | 구현 Phase |
|---|---|---|---|
| 기반·인증 | 개발환경, DB, 로그인/로그아웃, 서버 세션, 개인 계정 관리 명령 | — | 0~5 |
| Settings | 이름, 영양·체중·주간 운동일 목표, 테마 | — | 6 |
| Workout | 종목 선택, 세트·중량·횟수·RPE, 시작/완료, 이전 기록, CRUD | 루틴, History, 운동 즐겨찾기 | 7 |
| Cardio | — | 러닝·줄넘기 등 기본 seed, 시간·거리/횟수, CRUD·이력·즐겨찾기 | 2, 7 |
| Diet | 음식·식사 CRUD, 제공량, 영양 합산 | 최근/자주 먹는 음식, 즐겨찾기, 식단 프리셋 | 8 |
| Body | 체중·체지방·근육량·허리·메모, 빠른 체중 입력 | History, 7일 이동평균 | 9 |
| Dashboard | 오늘 운동·영양·체중·목표·주간 요약 | 최근 운동, 추세 비교 | 10 |
| Analytics / Calendar | — | 체중·웨이트·유산소·영양 추세, 날짜별 기록 조회 | 11~12 |
| Quick Add | 운동·식단·체중 | 유산소 | 13 |
| 기록 보존·UX | 데이터 영속성·입력 검증·오류 처리 | 운동 Draft 복구·재시도, 키보드·반응형 UX | 14~15 |
| 개발 품질 | 인증·소유권·CSRF·기본 보안 | 접근성, API·통합·E2E·성능·전체 URL 검증 | 16~18 |
| 배포 준비 | 운영 이미지·설정·migration·backup·restore | 로그·복구 리허설·인수 문서 | 19~22 |
| 실제 운영 | MacBook·Tailscale HTTPS·실제 환경변수·외부 접속 | 덮개·재부팅·장애·실기기·1~2주 실사용 검증 | 23~29 |

MVP는 개인 사용자용 서비스다. 공개 회원가입은 제공하지 않고 운영자가 서버 관리 명령으로 계정을 생성·비밀번호 재설정한다. 다른 사용자의 데이터 접근을 막는 소유권 검증은 MVP에서도 적용한다.

기술 선택은 Next.js + NestJS + PostgreSQL + Prisma로 확정한다. 개발 완료(Phase 22), 실제 운영 준비 완료(Phase 28), 실사용을 포함한 MVP 완료(Phase 29)를 구분한다.

---

# 47. MVP에서 제외 — 후속 릴리스(P2)

- 걸음수·걸음수 목표, 운동시간 목표, 물 기록, 독립 메모, Streak
- PR / Estimated 1RM / 연간 Heatmap / 고급 Analytics / 자동 운동 칼로리 추정
- 가슴·팔·허벅지·엉덩이 등 추가 신체 치수, 사진 업로드
- 웨이트·유산소 혼합 루틴, 목표 변경 이력, 단위·시간대 변경
- 공개 회원가입, 이메일 인증·비밀번호 재설정 메일, 소셜 로그인
- SNS·친구·커뮤니티·Trainer 기능
- AI 코치·음식 사진 인식·운동 영상 분석
- 스마트워치·Apple Health·Samsung Health·Google Fit 연동
- PWA·Offline Shell·앱 전체 오프라인 동기화·다중 기기 자동 병합

운동 작성 중 IndexedDB 저장·복구·재시도, 개별 기록의 메모, 운동 루틴·식단 프리셋은 MVP에 포함한다. 위 후속 범위와 혼동하지 않는다.

---

# 48. 후속 릴리스 아이디어

향후 확장 가능 기능.

## Smart Dashboard

운동과 체중 데이터를 기반으로 간단한 Insight 제공.

예

```text
지난 4주 동안

체중
-1.8kg

Bench Press
+7.5kg

운동 빈도
주 4.2회
```

---

## Smart Recommendation

사용자가 직접 활성화하는 기능.

예

```text
최근 7일 평균 섭취

2,150 kcal

최근 체중 변화

-0.4kg/week
```

객관적인 데이터 중심으로 제공한다.

---

# 49. Food Preset — MVP P1

식단 반복 입력을 최소화하는 기능.

```text
Preset

아침 기본

계란 3
밥 200g
두유 1
```

사용

```text
Add to Today
```

---

# 50. Workout Preset — MVP P1

WorkoutRoutine과 같은 기능이며 별도 Preset 모델을 만들지 않는다.

```text
PUSH

Bench Press
Incline Press
Shoulder Press
Lateral Raise
Triceps Pushdown
```

버튼 하나로 운동 시작.

---

# 51. 운동 Personal Record — 후속 릴리스

PR 기록.

예

```text
PR

Bench Press

85 kg × 5

NEW PR 🎉
```

PR 유형

```text
Weight PR

Rep PR

Estimated 1RM

Volume PR
```

---

# 52. Search UX

운동이나 음식 입력 시 검색 중심 UX 사용.

```text
Search Exercise

bench
```

결과

```text
Bench Press

Incline Bench Press

Dumbbell Bench Press
```

최근 사용 항목을 최우선 표시한다.

---

# 53. Keyboard UX

Desktop에서 기록을 빠르게 하기 위해 Keyboard 입력을 적극 지원한다.

예

```text
Enter
→ 다음 입력

Tab
→ 다음 필드

Cmd / Ctrl + Enter
→ 저장
```

---

# 54. Empty State

데이터가 없는 화면을 단순히 비워두지 않는다.

예

```text
아직 운동 기록이 없습니다.

첫 운동을 기록해보세요.

[ Start Workout ]
```

---

# 55. Loading State

Skeleton UI 사용.

예

```text
██████████████

███████

██████████████████
```

페이지 Layout Shift 최소화.

---

# 56. Error UX

일반적인

```text
Error occurred
```

대신 사용자가 이해할 수 있는 메시지를 제공한다.

예:

```text
운동 기록을 저장하지 못했습니다.

입력한 기록은 유지되고 있습니다.

[ 다시 저장 ]
```

---

# 57. Auto Save

운동 중 앱 종료 또는 새로고침에 대비하여 기록 중인 데이터는 자동 저장한다.

예

```text
Draft saved
```

운동 기록 손실 방지가 중요한 UX 요구사항이다.

---

# 58. 기술 스택 제안

Frontend

```text
Next.js
TypeScript
React
```

UI

```text
Tailwind CSS

shadcn/ui
```

State

```text
Zustand
```

Server State

```text
TanStack Query
```

Charts

```text
Recharts
```

---

# 59. Backend

Backend는 **NestJS + PostgreSQL + Prisma**로 확정한다. Next.js는 UI와 동일 origin API proxy를 담당하고 도메인 로직·인증·DB 접근은 NestJS가 담당한다. DB·API는 운영에서 host port를 직접 공개하지 않는다.

Monorepo의 `apps/web`, `apps/api`, `packages/types`, `prisma` 구조와 상세 배치는 아키텍처를 따른다.

---

# 60. 인증

개인 계정을 서버 관리 명령으로 만든 뒤 이메일·비밀번호로 로그인한다. 비밀번호는 Argon2id, 인증은 DB Session과 HttpOnly cookie를 사용한다. 운영 HTTPS에서는 Secure cookie를 적용한다.

공개 가입·이메일 발송·소셜 로그인은 후속 범위다. Tailscale 인증과 앱 인증은 별도로 유지한다.

---

# 61. 배포 구조

초기

```text
Browser

   │

Next.js

   │

API

   │

PostgreSQL
```

Docker를 사용할 경우

```text
docker-compose

frontend
backend
database
```

구조도 가능하다.

---

# 62. 프로젝트 구조

프로젝트 구조는 [아키텍처](<MyFit Log 기술 아키텍처 설계서.md>)의 40절을 따른다. `apps/web`와 `apps/api`를 분리한 pnpm workspace를 사용하며 Compose 파일은 repository root에 둔다. 단일 Next.js 앱 구조를 별도 대안으로 유지하지 않는다.

---

# 63. 성능 목표

페이지 로딩

```text
< 1.5 sec
```

사용자 액션 반응

```text
< 100ms
```

기록 저장

```text
< 500ms
```

체감 속도를 위해 Optimistic Update를 활용한다.

---

# 64. Responsive 기준

```text
Mobile

< 768px

Tablet

768 ~ 1024

Desktop

> 1024
```

Desktop First가 아니라 Responsive Web 기준으로 설계한다.

---

# 65. UX 핵심 원칙

### Rule 1

기록하기 위해 페이지를 여러 번 이동하지 않는다.

---

### Rule 2

사용자가 자주 입력하는 값은 기억한다.

예

```text
Bench Press

Last Weight

80kg
```

다음 운동 입력 시 기본값으로 표시.

---

### Rule 3

숫자를 직접 입력하는 횟수를 최소화한다.

---

### Rule 4

과거 기록을 입력 화면에서 바로 확인할 수 있어야 한다.

---

### Rule 5

데이터는 저장하는 것보다 **다시 보는 경험**이 중요하다.

그래프와 Summary를 적극 활용한다.

---

# 66. 핵심 화면

최종적으로 다음 화면을 우선 구현한다.

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

---

# 67. MVP 개발 우선순위

46절의 P0/P1 표를 따른다. P0만 완성하면 핵심 시연 단계이며 P1까지 검증해야 최종 MVP다. P2는 47절의 후속 범위다.

구현 번호·의존성·완료 조건은 [체크리스트](<MyFit Log 구현 계획 및 개발 체크리스트.md>)만 관리한다. 첫 흐름은 로그인 → 웨이트 기록 → DB 저장 → Dashboard 반영이며, 이후 식단·신체·유산소로 확장한다.

---

# 68. 대표 사용자 플로우

## 운동

```text
Dashboard

↓

Quick Add

↓

Workout

↓

Routine 선택

↓

운동 시작

↓

Set 기록

↓

Workout Complete

↓

Dashboard 업데이트
```

---

## 식단

```text
Dashboard

↓

Quick Add

↓

Meal

↓

Recent Food

↓

Food 선택

↓

Quantity 입력

↓

Save
```

---

## 체중

```text
Dashboard

↓

Weight Card

↓

82.4 입력

↓

Save

↓

Weight Graph 업데이트
```

---

# 69. 홈 Dashboard 최종 Layout

Desktop 기준.

```text
────────────────────────────────────────────────────

Good Morning

Sep 27

                               + Quick Add

────────────────────────────────────────────────────

Today

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Workout  │ │ Calories │ │ Protein  │ │ Weight   │
│ 68 min   │ │1850/2200 │ │132/160g  │ │82.4kg   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘


Weight Trend

┌───────────────────────────────────────────────────┐

        ╲
         ╲
          ╲___
              ╲__

└───────────────────────────────────────────────────┘


This Week

Workout

● ● ● ○ ● ○ ○

4 / 5


Nutrition

Calories      ███████████░
Protein       ██████████░░


Recent Workout

Push Day

Bench Press     80 × 8
Shoulder Press  40 × 10

────────────────────────────────────────────────────
```

---

# 70. 성공 기준

이 서비스의 성공 여부는 기능 개수가 아니라 **기록 지속성**으로 판단한다.

핵심 지표

```text
Daily Record Rate

Workout Record Completion Rate

Diet Record Rate

Weekly Active Days

Average Record Time
```

특히 중요한 목표

```text
운동 기록 시작

→ 5초 이내

식단 기록

→ 30초 이내

체중 기록

→ 5초 이내
```

---

# 71. 최종 제품 방향

이 프로젝트는

**운동 커뮤니티**

또는

**AI 헬스트레이너**

서비스가 아니다.

가장 중요한 목적은

> **내 운동, 식단, 체중 데이터를 가장 편하게 기록하고 가장 보기 좋게 확인하는 개인 Fitness Dashboard**

를 만드는 것이다.

따라서 기능 추가보다 다음 세 가지를 우선한다.

**1. 기록 속도**

운동 중에도 귀찮지 않게 기록할 수 있어야 한다.

**2. 데이터 가독성**

오늘 / 이번 주 / 이번 달 상태가 한눈에 보여야 한다.

**3. 기록 지속성**

자주 사용하는 운동, 음식, 루틴을 기억하여 시간이 지날수록 기록 과정이 더 빨라져야 한다.

이 세 가지를 만족시키는 것이 본 프로젝트의 가장 중요한 제품 목표다.