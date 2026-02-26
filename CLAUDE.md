# Lab Scheduler - AI-Powered Staff Scheduling System

## Project Overview
Staff scheduling web app for an ISO 15189 accredited medical laboratory in Tanzania.
Quality Officer: Mike Levison Sanga. 33 staff across 7 sections.

## Architecture
- **Monorepo**: pnpm workspaces
- **Backend**: `packages/api` - Express + TypeScript + Prisma + PostgreSQL
- **Frontend**: `packages/web` - React 18 + Vite + Blueprint UI + React Router
- **Infrastructure**: Docker Compose (postgres, api, web, n8n)

## Key Commands
```bash
pnpm dev          # Start both API and web dev servers
pnpm db:generate  # Generate Prisma client
pnpm db:migrate   # Run migrations
pnpm db:seed      # Seed database with 33 staff + sections
```

## Lab Sections
Hematology, Chemistry, Microbiology, Serology, Phlebotomy, Reception/LIS, TB

## Shift Types
Morning (7am-3pm), Evening (3pm-10pm), Night (10pm-7am)

## Theme
- Sidebar: navy #0f3c68
- Background: light #f4f8fc
- Accent: blue #1968b3
