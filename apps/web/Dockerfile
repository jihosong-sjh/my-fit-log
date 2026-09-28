FROM node:22.23.3-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=myfit-pnpm,target=/pnpm/store pnpm install --frozen-lockfile --store-dir=/pnpm/store
ENV NEXT_TELEMETRY_DISABLED=1
ENV INTERNAL_API_URL=http://api:4000
RUN pnpm build:packages && pnpm --filter @myfit/web build

FROM node:22.23.3-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
