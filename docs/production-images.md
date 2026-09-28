# Phase 19 운영 이미지와 격리 검증

실제 운영 배포 전 단계다. `pnpm test:production`은 임의 비밀번호와 전용 Compose project·volume·loopback port를 생성하여 운영용 이미지를 검증한다. 실제 `.env.production`과 개발·테스트 DB는 읽거나 수정하지 않는다. 종료 시 자신이 만든 컨테이너·volume·임시 환경변수 파일만 정리한다.

```sh
nvm use
pnpm install --frozen-lockfile
pnpm test:production
```

검증 순서: 이미지 build → PostgreSQL → 빈 DB migration → catalog seed → stdin 계정 생성 → Web/API health → 동일 origin proxy·Secure/HttpOnly/SameSite cookie·Origin 거부 → 신체 기록 저장 → 로그 비밀값 누출 검사 → 컨테이너 제거(volume 보존)·재기동 → 기록·세션 유지 → 생성한 테스트 리소스 정리. 결과는 `test-results/production.json`이다.

## 이미지 구성

- Web: Node 22.23.3, pnpm 10.34.5, Next standalone multi-stage build. 실행에 필요한 traced dependencies·static assets만 복사하고 `node` 사용자로 실행한다. 내부 API 주소는 build/rewrite와 runtime 모두 `http://api:4000`이다.
- API: Nest compile·Prisma Client 생성 후 `pnpm deploy --legacy --prod`로 필요한 workspace 패키지와 의존성을 복사한다. `node` 사용자로 실행하며 Prisma CLI·schema·migrations·compiled seed·계정 관리 명령을 포함한다. Prisma CLI는 운영 migration 도구이므로 runtime dependency다.
- 두 앱은 source/secret 파일·Docker socket을 mount하지 않는다. DB만 project 이름을 접두사로 갖는 named volume을 사용한다.
- Web은 `127.0.0.1:3000`만 공개한다. API와 DB는 host port를 게시하지 않고 전용 network에서 연결한다. 세 서비스는 `unless-stopped`, healthcheck, `json-file` 로그의 `max-size=10m`, `max-file=3`을 사용한다.

## 운영 이미지의 관리 명령

아래 명령은 이후 Phase에서 운영 환경변수를 확정한 후 사용한다. `.env.production.example`은 필요한 변수의 예제다. 실제 운영에 자동 적용하지 않는다.

```sh
docker compose --env-file .env.production -f compose.prod.yml build
docker compose --env-file .env.production -f compose.prod.yml up -d --wait db
docker compose --env-file .env.production -f compose.prod.yml run --rm api \
  node apps/api/node_modules/prisma/build/index.js migrate deploy --config apps/api/prisma.config.mjs
docker compose --env-file .env.production -f compose.prod.yml run --rm api \
  node apps/api/node_modules/@myfit/database/dist/src/seed.js
docker compose --env-file .env.production -f compose.prod.yml run --rm api \
  node scripts/account.mjs --email you@example.com
docker compose --env-file .env.production -f compose.prod.yml up -d --wait
docker compose --env-file .env.production -f compose.prod.yml logs --tail=100
```

기존 운영 DB의 migration 전 백업·실패 복구·배포 순서는 Phase 20–21에서 준비한다. `down -v`는 DB 데이터를 삭제하므로 위 운영 절차에 포함하지 않는다.

## 로그와 검증 범위

API 로그는 requestId·method·status·duration과 공개 오류 코드만 허용한다. URL/query/header/cookie/body·예외 원문은 출력하지 않는다. Web은 Next access/browser forwarding 로그를 비활성화하고 시작·서버 오류를 stdout/stderr로 보낸다. PostgreSQL은 SQL statement·오류 parameter 출력과 상세 오류의 행 값을 제한한다(`log_statement=none`, `log_min_error_statement=panic`, `log_parameter_max_length_on_error=0`, `log_error_verbosity=terse`).

검증 스크립트는 비밀번호·세션·메모 canary를 전송하고 DB CHECK 위반도 발생시켜 재생성 **전후** 로그에 값이 없는지 확인한다. Docker rotation 옵션은 실제 실행 컨테이너의 설정을 검사하며 30MB 이상의 부하를 발생시키는 장시간 rotation 시험은 포함하지 않는다.

로컬 리허설은 HTTP loopback에서 HTTPS APP_URL에 대한 Origin과 Secure cookie 헤더를 검사한다. Tailscale TLS 종료·실제 브라우저 HTTPS·외부 기기·재부팅 검증은 Phase 24–28에 남아 있다.

참고: [Next standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output), [pnpm deploy](https://pnpm.io/10.x/cli/deploy), [Docker Compose services](https://docs.docker.com/reference/compose-file/services/), [Docker logging](https://docs.docker.com/engine/logging/configure/).
