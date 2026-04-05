# AGENTS.md — Interactive Video Code Editor

This file provides guidance for agentic coding agents working in this repository.

## Repository Overview

A pnpm monorepo (Turborepo) with two apps and three shared packages:

- **`apps/web`** — Next.js 15 frontend (React 19, Tailwind CSS v4, Monaco Editor, App Router)
- **`apps/api`** — NestJS 10 backend API (Google OAuth, Express session auth)
- **`packages/ui`** — Shared React component library (`@repo/ui`)
- **`packages/eslint-config`** — Shared ESLint flat configs (`@repo/eslint-config`)
- **`packages/typescript-config`** — Shared tsconfig bases (`@repo/typescript-config`)

Package manager: **pnpm** (v9). Node >= 18. TypeScript 5.9.

## Build / Dev / Lint / Test Commands

All commands are run from the repository root unless noted.

### Install dependencies

```bash
pnpm install
```

### Dev (all apps)

```bash
pnpm dev
# or: pnpm exec turbo dev
```

### Dev a single app

```bash
pnpm exec turbo dev --filter=web
pnpm exec turbo dev --filter=@repo/api
```

### Build (all)

```bash
pnpm build
```

### Build a single package/app

```bash
pnpm exec turbo build --filter=web
pnpm exec turbo build --filter=@repo/api
```

### Lint (all)

```bash
pnpm lint
```

### Lint a single package

```bash
pnpm exec turbo lint --filter=web
pnpm exec turbo lint --filter=@repo/ui
```

### Type-check (all)

```bash
pnpm check-types
```

### Type-check a single package

```bash
pnpm exec turbo check-types --filter=web
```

### Format

```bash
pnpm format
```

### Tests (API only — NestJS/Jest)

```bash
# All tests
pnpm exec turbo test --filter=@repo/api

# Single test file (run from apps/api)
cd apps/api && pnpm exec jest src/auth/auth.service.spec.ts

# Watch mode
cd apps/api && pnpm exec jest --watch

# E2E tests
cd apps/api && pnpm exec jest --config ./test/jest-e2e.json

# Coverage
cd apps/api && pnpm exec jest --coverage
```

The web app has no test runner configured. Test files in the API use the `.spec.ts` suffix.

## Code Style Guidelines

### Formatting (Prettier)

- Single quotes
- Semicolons always
- Trailing commas: ES5
- Print width: 80
- Tab width: 2 spaces (no tabs)
- Format on save is enabled via `.vscode/settings.json`

### TypeScript

**Web app** (`apps/web`): strict mode enabled (via `@repo/typescript-config/nextjs.json` which extends `base.json` with `strict: true`, `noUncheckedIndexedAccess: true`).

**API app** (`apps/api`): less strict — `strictNullChecks: false`, `noImplicitAny: false`. Uses `experimentalDecorators` and `emitDecoratorMetadata` for NestJS decorators. CommonJS modules (`module: "commonjs"`).

**Shared packages**: follow the base tsconfig (`strict: true`, `noUncheckedIndexedAccess: true`, `ES2022` target).

Use `type` imports for types: `import type { Foo } from 'bar'` when only types are imported.

### Imports

- Web app uses `@/*` path alias mapping to `./app/*` (configured in `apps/web/tsconfig.json`).
  - Example: `import { RecordingManager } from '@/core/RecordingManager'`
  - Example: `import { env } from '@/config/env'`
  - Example: `import { useRecording } from '@/hooks/useRecordings'`
- Shared packages use `@repo/ui`, `@repo/eslint-config/*`, `@repo/typescript-config/*`.
- API uses relative imports (NestJS convention).
- Group imports: framework/external first, then internal packages, then local aliases. Separate groups with a blank line.

### React / Next.js Conventions

- App Router (`apps/web/app/`) with route groups: `(main)`, `(studio)`, `auth`.
- Client components must start with `'use client'` directive.
- Components use default exports for pages (`export default function PageName()`).
- Shared UI components use named exports (`export const Button = ...`).
- Use `interface` for component props (not `type`).
- React hooks follow the `use*` naming pattern (e.g., `useRecording`, `useUser`).
- Context providers follow the `*Provider` naming pattern (e.g., `UserProvider`).
- Use `cn()` utility from `@/lib/utils` for conditional Tailwind class merging (clsx + tailwind-merge).

### Tailwind CSS

- Tailwind v4 with PostCSS plugin (`@tailwindcss/postcss`).
- Use Tailwind utility classes directly in JSX. Avoid inline styles unless dynamic.
- Use `class-variance-authority` for component variants (shadcn/ui pattern).
- Fonts configured via CSS variables (`--font-poppins`, `--font-geist-mono`).

### NestJS API Conventions

- Follow NestJS module structure: `*.module.ts`, `*.controller.ts`, `*.service.ts`.
- Use decorators: `@Injectable()`, `@Controller()`, etc.
- Define interfaces in the same file as the service that uses them (co-located).
- Use `ConfigService` for environment variable access (not `process.env` directly).
- API runs on port 5000.

### Naming Conventions

- **Files**: PascalCase for components (`MonacoEditor.tsx`, `PlaygroundCard.tsx`), camelCase for utilities/hooks (`useRecordings.ts`, `env.ts`).
- **Directories**: camelCase (`components/`, `infrastructure/`) or kebab-case.
- **Classes**: PascalCase (`RecordingManager`, `AuthService`).
- **Interfaces**: PascalCase without `I` prefix (`User`, `RecordingSession`, `ButtonProps`).
- **Enums**: PascalCase names, UPPER_SNAKE_CASE or camelCase values (`RecordingEventType.KEYSTROKE`).
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_RECORDING_CONFIG`, `USER_STORAGE_KEY`).
- **Functions**: camelCase (`formatDuration`, `handleEditorChange`).

### Error Handling

- Throw `Error` objects with descriptive messages.
- Use try/catch with typed catch: `catch (error: any)` then `error.message`.
- Prefer early returns / guard clauses.
- In React contexts/hooks, catch errors and log via `console.error` rather than letting them propagate to the UI.

### Environment Variables

- Frontend env vars use the `NEXT_PUBLIC_` prefix.
- Access via the centralized `env` config object (`apps/web/app/config/env.ts`), not `process.env` directly.
- API uses `ConfigService` from `@nestjs/config`.

### Key Libraries

- **Monaco Editor** (`@monaco-editor/react`) — in-browser code editor
- **Radix UI** — headless UI primitives (dialog, slot)
- **Lucide React** — icons
- **ogl** — lightweight WebGL library
- **uuid** (`v4`) — unique ID generation
- **class-variance-authority** + **clsx** + **tailwind-merge** — component styling

### General Rules

- Do not add comments unless requested.
- Always run `pnpm lint` and `pnpm check-types` after making changes and fix any errors.
- Use `pnpm format` to auto-format before committing.
- The ESLint config converts all rules to warnings (via `eslint-plugin-only-warn`), but `--max-warnings 0` is used in the web lint script, so treat all warnings as errors.
