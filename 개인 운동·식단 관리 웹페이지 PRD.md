# 개인 운동·식단 관리 웹페이지 PRD

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

하루의 목표 진행 상태를 시각화한다.

### Example

```text
Today's Goal

Calories
1850 / 2200 kcal
██████████████░░░ 84%

Protein
132 / 160 g
████████████░░░░░ 82%

Workout
65 / 60 min
█████████████████ 108%

Steps
8,450 / 10,000
██████████████░░░ 84%
```

칼로리뿐만 아니라 운동과 활동량을 한 화면에서 확인할 수 있도록 한다.

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
💧 물
📝 메모
```

기록 추가 과정은 **페이지 이동을 최소화한다.**

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
Workout Type

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
CARDIO
```

사용자가 직접 추가/수정 가능.

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

Calories
420 kcal
```

추가로

```text
Today's Best

Bench Press
80kg × 8
```

같은 정보를 제공한다.

---

# 16. Cardio

웨이트와 별도로 유산소 기록을 지원한다.

지원 운동

```text
Running
Walking
Cycling
Stair
Swimming
Other
```

기록 항목

```text
Duration
Distance
Calories
Average Pace
Heart Rate
```

예:

```text
Running

5.2 km
31:24

Pace
6:02 / km
```

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

선택 기록

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

Calendar Heatmap 활용.

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

1RM 추정값도 선택적으로 제공한다.

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

Settings > Goals

사용자가 목표 설정.

```text
Goal

Lose Weight
Maintain Weight
Gain Muscle
```

설정 가능 값

```text
Target Weight

Daily Calories

Protein

Carbs

Fat

Weekly Workout Days

Daily Steps
```

---

# 35. Streak

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

## User

```text
User

id
email
name
createdAt
```

---

## UserGoal

```text
UserGoal

targetWeight
dailyCalories
proteinGoal
carbGoal
fatGoal
stepGoal
weeklyWorkoutGoal
```

---

## BodyRecord

```text
BodyRecord

id
date

weight
bodyFat
muscleMass

waist

createdAt
```

---

## WorkoutSession

```text
WorkoutSession

id
date

startTime
endTime

duration

memo
```

---

## WorkoutExercise

```text
WorkoutExercise

id

sessionId
exerciseId

order
```

---

## WorkoutSet

```text
WorkoutSet

id

exerciseId

setNumber

weight
reps
rpe
```

---

## Exercise

```text
Exercise

id

name
category
muscleGroup

isCustom
```

---

## CardioRecord

```text
CardioRecord

id

date
type

duration
distance
pace

calories
heartRate
```

---

## Meal

```text
Meal

id

date
mealType

totalCalories
```

---

## Food

```text
Food

id

name

calories

protein
carbs
fat

servingSize
```

---

## MealFood

```text
MealFood

mealId
foodId

amount
```

---

# 46. MVP 범위

1차 버전에서는 반드시 필요한 기능만 구현한다.

### Dashboard

- 오늘 운동
- 오늘 칼로리
- 오늘 단백질
- 현재 체중
- 간단한 주간 요약

### Workout

- 운동 생성
- 운동 종목 등록
- 세트 / 중량 / 횟수 기록
- 운동 시간
- 이전 기록 확인
- 운동 루틴 저장

### Diet

- 음식 등록
- 식단 기록
- Calories
- Protein
- Carbs
- Fat
- 자주 먹는 식단 저장

### Body

- 체중
- 체지방
- 근육량

### Analytics

- 체중 그래프
- 운동 빈도
- 운동 시간
- 칼로리 변화
- 단백질 변화

### Settings

- 목표 체중
- 목표 칼로리
- 단백질 목표
- 운동 목표

---

# 47. MVP에서 제외

초기 개발 복잡도를 줄이기 위해 다음 기능은 제외한다.

```text
SNS

친구 기능

커뮤니티

Trainer 기능

AI 코치

음식 사진 AI 인식

스마트워치 연동

Apple Health

Samsung Health

Google Fit

운동 영상 분석
```

필요하면 Phase 2에서 추가한다.

---

# 48. Phase 2

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

# 49. Food Preset

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

# 50. Workout Preset

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

# 51. 운동 Personal Record

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

개인용 MVP라면

```text
Next.js API

+

PostgreSQL
```

구조로 충분하다.

ORM

```text
Prisma
```

또는

```text
Drizzle ORM
```

---

# 60. 인증

초기 개인용 환경에서는

```text
Email Login
```

정도로 시작.

향후

```text
Google

Apple
```

로그인 추가 가능.

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

# 62. 프로젝트 구조 예시

```text
src

├─ app
│
├─ components
│   ├─ ui
│   ├─ dashboard
│   ├─ workout
│   ├─ diet
│   └─ charts
│
├─ features
│   ├─ workout
│   ├─ diet
│   ├─ body
│   └─ analytics
│
├─ hooks
│
├─ lib
│
├─ services
│
└─ types
```

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

### P0

반드시 필요

```text
Dashboard

Workout Record

Diet Record

Weight Record

Goal Setting
```

### P1

MVP 품질을 높이는 기능

```text
Workout Routine

Food Preset

Weight Chart

Workout History

Calendar
```

### P2

향후 추가

```text
PR Tracking

Advanced Analytics

Smart Insight

Health Platform Integration
```

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