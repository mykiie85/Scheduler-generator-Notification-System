FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY prisma ./prisma
RUN pnpm db:generate

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3001
CMD ["pnpm", "dev"]
