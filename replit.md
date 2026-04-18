# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## MangaGramm Platform

Full-stack manga/webtoon/comic publishing platform.

### Architecture
- **Frontend**: `artifacts/mangagramm` — React + Vite + Tailwind (monochrome B&W theme)
- **Backend**: `artifacts/api-server` — Express 5 + Drizzle ORM
- **Object Storage**: Replit Object Storage (presigned URL upload flow)
- **Auth**: Replit OIDC (openid-client v6) + express-session → req.session.userId
- **i18n**: i18next + react-i18next with browser language detection (en, fr, ja, ko, es, ar, zh)

### Key Features Implemented
- **Auth**: Replit OIDC at `/api/login` → `/api/callback` → session. No password registration.
- **Reactions**: Facebook-style 6-reaction picker (like/love/haha/wow/sad/angry), hover to open, auth-gated
- **Image Upload**: Gallery-only upload (no URL input) via presigned URLs to object storage
  - `ImageUploader` — single image (covers, avatars)
  - `MultiPageUploader` — multi-select pages for chapters
- **Settings panel**: Top-right gear icon → theme (light/dark/system) + language picker inline dropdown
- **Auth guards**: `RequireAuth` component wraps protected pages
- **Navbar**: Sticky, responsive, user avatar dropdown with full user menu

### Key Files
- `artifacts/mangagramm/src/lib/i18n.ts` — 7-language i18n setup with browser detection
- `artifacts/mangagramm/src/lib/auth-context.tsx` — OIDC-based auth context
- `artifacts/mangagramm/src/components/reaction-picker.tsx` — FB-style hover reaction picker
- `artifacts/mangagramm/src/components/image-uploader.tsx` — Gallery upload components
- `artifacts/mangagramm/src/components/require-auth.tsx` — Auth guard component
- `artifacts/api-server/src/routes/oidc.ts` — Replit OIDC login/callback/logout
- `artifacts/api-server/src/routes/reactions.ts` — Reaction toggle + query endpoints
- `lib/api-zod/src/storage.ts` — Upload URL request/response schemas
- `lib/db/src/schema/reactions.ts` — Reactions table (user_id, target_type, target_id, reaction_type)

### DB Tables Added
- `sessions` — express-session store (sid, sess, expire)
- `reactions` — FB-style reactions (unique per user per target)
- `users.replit_id` — OIDC subject ID for Replit users
- `users.password` — now nullable (Replit Auth users have no password)
