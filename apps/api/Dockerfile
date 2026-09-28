FROM node:22.23.3-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=myfit-pnpm,target=/pnpm/store pnpm install --frozen-lockfile --store-dir=/pnpm/store
RUN pnpm build:packages && pnpm --filter @myfit/api build
RUN pnpm --filter @myfit/api deploy --legacy --prod /runtime/apps/api

FROM node:22.23.3-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY --from=build --chown=node:node /runtime ./
COPY --from=build --chown=node:node /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=build --chown=node:node /app/prisma/migrations ./prisma/migrations
COPY --chown=node:node infra/prisma.production.config.mjs ./apps/api/prisma.config.mjs
COPY --chown=node:node scripts/account.mjs ./scripts/account.mjs
USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
