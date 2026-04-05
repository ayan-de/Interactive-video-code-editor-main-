# Architecture Recommendations

## P0 — Fix Now

- [x] Fix `RecordingManager.addEvent()` buffer duplication bug — remove `else` branch at `core/RecordingManager.ts:273-274`
- [x] Fix `PlaygroundModal` "Start Recording" button — wire title input to actually start recording (`components/playgroundCards/PlaygroundModal.tsx:55-58`)
- [x] Remove user data from URL query params in OAuth callback (`auth/callback/page.tsx:42`) — use server-side session read or short-lived token
- [x] Remove hardcoded session secret fallback `'your-secret-key'` (`apps/api/src/main.ts:17`) — throw if `SESSION_SECRET` is not set

## P1 — Next Sprint

- [ ] Consolidate two API clients (`ExternalApiClient.ts` + `FrontendApiClient.ts`) into one — or refactor `ExternalApiClient` to implement the `ApiClient` interface
- [ ] Extract `LoadingContext` UI (loading overlay, success/error cards) into a separate `LoadingOverlay` component (`context/LoadingContext.tsx:66-133`)
- [ ] Fix `Navbar.tsx` to use `useAuth().initiateGoogleLogin()` instead of direct `fetch('/api/auth/google')` (`components/Navbar.tsx:19`)
- [ ] Extract `formatDuration` into shared utility (`lib/formatDuration.ts`) — currently duplicated in `useRecordings.ts`, `PlaybackViewer.tsx`, `view/page.tsx`
- [ ] Replace `setInterval` with `requestAnimationFrame` in `PlaybackEngine` for 60fps playback (`core/PlaybackEngine.ts:258`)

## P2 — Near-term

- [ ] Implement snapshot-based seeking in `PlaybackEngine` — periodically save editor state snapshots for O(1) seeks instead of replaying from scratch
- [ ] Add dependency injection for `useAuth` — accept `AuthRepository` as parameter or use context-based DI (`hooks/useAuth.ts:9-10`)
- [ ] Move recording storage from localStorage to IndexedDB — support larger recordings beyond 5-10MB limit
- [ ] Add typed session interface in API instead of `(req.session as any).user` (`apps/api/src/auth/auth.controller.ts:53`)
- [ ] Enable `strictNullChecks` in API tsconfig (`apps/api/tsconfig.json`)
- [ ] Use `ConfigService` for all hardcoded URLs in API (currently `http://localhost:3000`, `http://localhost:5000` etc.)
- [ ] Replace `any` types with proper Monaco editor types in `useRecordings.ts` and `PlaybackViewer.tsx`
- [ ] Create shared `@repo/types` package — extract duplicated `User` type used in both `apps/web` and `apps/api`

## P3 — Tech Debt

- [ ] Populate `@repo/ui` package with shared components or remove it — currently empty/unused
- [ ] Add list virtualization to recordings view (`(studio)/view/page.tsx`) — prevent DOM bloat with hundreds of items
- [ ] Add error boundaries around Monaco editor and Playback components
- [ ] Fix `Aurora.tsx` useEffect dependency — `[amplitude]` causes full WebGL context recreation on change (`components/Aurora.tsx:214`)
- [ ] Fix missing `useEffect` dependencies in `auth/callback/page.tsx:61` — `login`, `showError`, `showSuccess`, `router.push` used but not in dependency array
- [ ] Replace localStorage polling (`setInterval(countRecordings, 2000)`) with shared context or custom events in `Home.tsx` and `(studio)/layout.tsx`
- [ ] Add server-side recording persistence — currently recordings exist only in browser
- [ ] Add CSRF protection to API
- [ ] Add rate limiting on auth endpoints
- [ ] Remove commented-out CSS at bottom of `globals.css:213-239`
- [ ] Remove `page-old.tsx` from `apps/web/app/`
