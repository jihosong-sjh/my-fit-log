# Phase 18 로컬 성능 기준

2026-09-27, `pnpm test:performance` 통과. [7회 측정 원본](evidence/phase18-performance.json).

| 항목 | p95 (7회 중 최댓값) | 목표 |
|---|---:|---:|
| 초기 화면 LCP | 124ms | < 1,500ms |
| 키보드 입력 → 화면 갱신 | 15.8ms | < 100ms |
| 체중 저장 요청 → 응답 완료 | 16.4ms | < 500ms |
| 로드된 JS 전송량 | 367,341 bytes | 회귀 기준 < 600,000 bytes |
| 로드된 JS 압축 해제 크기 | 1,189,281 bytes | 측정 기록 |

## 환경과 방법

- Apple M4 Pro / 메모리 24GiB / macOS arm64 / Node 22.23.3 / Chromium 145.0.7632.6.
- Next production build의 **standalone server**, 컴파일된 Nest API, Docker PostgreSQL 17.9의 전용 `myfit_test` DB. API는 로컬 HTTP 측정을 위해 개발 cookie/origin 설정이며 실제 운영 설정은 Phase 19 리허설에서 별도로 검사한다.
- 테스트 계정 1개, 365일 신체 기록 365개, 목표 미설정, 운동·식단 기록 0개. 생성한 계정과 기록은 종료 시 제거한다. 대용량 전체 도메인 부하 시험을 의미하지 않는다.
- 서버는 준비된 상태, 매 회 새 페이지, Chromium HTTP cache 비활성화, loopback 네트워크, CPU/network throttling 없음. 사용자 로그인 후 `/dashboard`를 7회 측정한다.
- LCP는 PerformanceObserver의 `largest-contentful-paint`. 입력은 실제 `keydown`부터 두 번째 animation frame까지의 근사 화면 갱신 시간이며 INP 점수와 다르다. 저장은 Playwright의 `requestStart` → `responseEnd`; 자동저장 debounce는 포함하지 않는다.
- JS는 network idle 시점의 `/_next/*.js` resource timing 합계이며 자동 prefetch된 chunk도 포함한다. 전체 다운로드 용량에는 font/CSS/HTML이 추가된다.

## 적용한 성능 구성

- Recharts renderer를 `next/dynamic`으로 분리하고 데이터가 있을 때만 로드한다. 빈 화면은 차트 모듈 없이 표시한다. 차트의 동등한 값은 펼칠 수 있는 표로 제공한다.
- TanStack Query 사용자별 query key·10초 stale time·저장 후 invalidation 유지. Dashboard의 단일 집계 endpoint와 목표 변경 후 갱신 E2E를 통과했다.
- WorkoutSession/CardioRecord/Meal/BodyRecord의 사용자·날짜 인덱스, 종목별 이력 인덱스와 일자별 신체 unique 제약을 schema/migration에서 확인했다. 실제 PostgreSQL 기반 CRUD·기간 집계 통합 테스트를 수행했다.

이 결과는 로컬 Chromium 측정이다. Tailscale·외부 네트워크·실제 모바일의 성능은 Phase 28에서 평가한다.
