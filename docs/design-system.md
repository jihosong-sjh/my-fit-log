# Phase 4 디자인 시스템

PRD의 차분하고 데이터에 집중하는 개인 기록 화면을 따른다. 실제 기록과 예제는 구분한다.

- 기본 색: background #F7F8FA, surface #FFFFFF, primary #111827, accent #5B7CFF, muted #5F697C, border #E4E7EC.
- success/warning/danger는 상태용으로만 사용하며 텍스트는 대비가 높은 별도 foreground 토큰을 사용한다.
- 다크: background #0F1115 / surface #171A21 / border #262A33 / foreground #F9FAFB.
- Pretendard variable을 앱에서 직접 제공한다. 제목 32/40, 소제목 20/28, 본문 14/22·16/26, 보조 12/18. 숫자는 tabular-nums.
- 232px 데스크톱 사이드바와 최대 1400px 콘텐츠. 모바일은 헤더·하단 내비게이션·중앙 Quick Add. 모두 왼쪽 정렬.

```text
Desktop: [232px 탐색] [날짜 / 테마]
                     [오늘의 기록 제목]
                     [운동 / 식단 / 신체 빈 상태]
Mobile:  [로고 / 테마]
         [오늘의 기록]
         [세로 콘텐츠]
         [오늘 운동 + 식단 분석]
```

검토: PRD에서 지정한 중립 팔레트·패널을 유지하되 가짜 지표와 장식 그래프를 넣지 않는다. 미설정 목표는 0% 대신 안내하며, 데모 데이터는 `/design-system`에서만 제공한다. 그라데이션·자동 재생 애니메이션은 사용하지 않는다.

## 구현

- shadcn/ui 공식 new-york-v4 registry 컴포넌트를 `packages/ui/src`에 가져와 프로젝트 토큰과 연결했다. Radix의 focus trap, Escape, 키보드 탐색, ARIA 동작을 사용한다.
- NumberInput·SearchInput·DatePicker·ProgressCircle·StatCard·EmptyState·BottomSheet는 공통 조합 컴포넌트다.
- 로컬 테마는 Light/Dark/System을 지원하며 실제 사용자 설정 동기화는 Phase 6이다.
- 375/390/430/768/1024/1440px 브라우저 검증과 결과는 [작업 기록](development-log.md)에 남긴다.

기준: [PRD](<개인 운동·식단 관리 웹페이지 PRD.md>), [shadcn 수동 설치](https://ui.shadcn.com/docs/installation/manual), [Next 서버/클라이언트 경계](https://nextjs.org/docs/app/getting-started/server-and-client-components).

Phase 16 검증: 밝은 테마의 muted 배경에서도 작은 글자가 4.5:1 이상 대비를 갖도록 foreground를 보정했다. 버튼·탭·메뉴 항목·표 펼치기는 최소 높이 44px이며, 아이콘 버튼은 44×44px이다.
