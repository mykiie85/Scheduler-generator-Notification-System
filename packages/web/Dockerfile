FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json ./
RUN pnpm config set auto-install-peers true && \
    pnpm install --no-frozen-lockfile && \
    pnpm approve-builds esbuild 2>/dev/null; \
    pnpm rebuild esbuild 2>/dev/null || true

COPY . .

EXPOSE 3000
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
