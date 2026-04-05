# Architecture Recommendations

## P0 — Fix Now

- [x] Fix `RecordingManager.addEvent()` buffer duplication bug — remove `else` branch at `core/RecordingManager.ts:273-274`
- [x] Fix `PlaygroundModal` "Start Recording" button — wire title input to actually start recording (`components/playgroundCards/PlaygroundModal.tsx:55-58`)
- [x] Remove user data from URL query params in OAuth callback (`auth/callback/page.tsx:42`) — use server-side session read or short-lived token
- [x] Remove hardcoded session secret fallback `'your-secret-key'` (`apps/api/src/main.ts:17`) — throw if `SESSION_SECRET` is not set
- [x] Consolidate two API clients into `lib/api.ts` — removed `ExternalApiClient.ts`, `FrontendApiClient.ts`, repository/interface chain, and BFF proxy routes
- [x] Fix `Navbar.tsx` to use `useAuth().initiateGoogleLogin()` instead of direct `fetch('/api/auth/google')` (`components/Navbar.tsx:19`)
- [x] Fix missing `useEffect` dependencies in `auth/callback/page.tsx` — `login`, `showError`, `showSuccess`, `router` now in dependency array

## P1 — Next Sprint

- [x] Fix stale closure in `PlaybackViewer.tsx:49-83` — event handler captures outdated `handleEventProcessed`, breaks when loading second recording
- [x] Fix controlled editor value desync in `PlaybackViewer.tsx:38,127,360` — `model.applyEdits()` bypasses React state `editorContent`, fragile
- [x] Fix `LoadingContext` setTimeout never cleaned up (`context/LoadingContext.tsx:43-44,52-53`) — rapid notifications clear each other prematurely
- [x] Fix `RecordingManager.addEvent()` silently losing events when `compressionEnabled=false` (`core/RecordingManager.ts:264-280`) — add `else` branch
- [x] Fix `RecordingManager` silently dropping oldest events on overflow (`core/RecordingManager.ts:276-278`) — corrupts playback for long recordings
- [x] Fix `new RecordingManager()` evaluated every render in `useRecordings.ts:47` — use lazy init for `useRef`
- [x] Extract `formatDuration` into shared utility (`lib/formatDuration.ts`) — currently triplicated in `useRecordings.ts`, `PlaybackViewer.tsx`, `view/page.tsx` with different formats
- [x] Replace `setInterval` with `requestAnimationFrame` in `PlaybackEngine` for 60fps playback (`core/PlaybackEngine.ts:258`)
- [x] Extract recording count logic into `useRecordingCount` hook — duplicated in `Home.tsx` and `(studio)/layout.tsx`
- [x] Fix `alert()` in `MonacoEditor.tsx:46,52` — use `LoadingContext.showSuccess/showError` instead
- [x] Fix inverted responsive font in `Home.tsx:60` — `text-9xl` base goes down to `text-4xl` at `sm`, should be reversed
- [x] Fix "Untile session" typo in `RecordingManager.ts:39,109` — should be "Untitled"
- [x] Add startup session validation in `UserContext` — call `/auth/profile` on mount to verify session is alive (currently trusts stale localStorage)

## P2 — Near-term

23: [x] Implement snapshot-based seeking in `PlaybackEngine` — periodically save editor state snapshots for O(1) seeks instead of replaying from scratch

- [x] Move recording storage from localStorage to IndexedDB — support larger recordings beyond 5-10MB limit
- [x] Add typed session interface in API instead of `(req.session as any).user` (`apps/api/src/auth/auth.controller.ts:53`)
- [x] Enable `strictNullChecks` in API tsconfig (`apps/api/tsconfig.json`)
- [x] Use `ConfigService` for all hardcoded URLs in API — 4x `http://localhost:3000` in `auth.controller.ts:38,45,56,60`, `process.env` in `auth.controller.ts:14-17`
- [x] Replace `any` types with proper Monaco editor types in `useRecordings.ts` and `PlaybackViewer.tsx`
- [x] Create shared `@repo/types` package — extract duplicated `User` type used in both `apps/web` and `apps/api`
- [x] Fix `[key: string]: any` in `recordings.ts:132` — weakens type safety for entire metadata object
- [x] Extract `USER_STORAGE_KEY` constant to shared location (`lib/constants.ts`) — currently duplicated in `UserContext.tsx` and `lib/api.ts`
- [x] Fix `language: 'javascript'` hardcoded in `RecordingManager.ts:143` — should detect from editor
- [x] Fix `auth.controller.ts` manual OAuth URL construction — uses ConfigService instead of duplicating GoogleStrategy config
- [x] Fix unnecessary re-renders in `view/page.tsx:57` — 2s polling always calls setState even when data unchanged
- [x] Use `import type` for type-only imports per AGENTS.md convention — `MonacoEditor.tsx:7`, `PlaybackViewer.tsx`

## P3 — Tech Debt

- [ ] Populate `@repo/ui` package with shared components or remove it — currently empty/unused
- [ ] Add list virtualization to recordings view (`(studio)/view/page.tsx`) — prevent DOM bloat with hundreds of items
- [ ] Add error boundaries around Monaco editor and Playback components
- [ ] Fix `Aurora.tsx` useEffect dependency — `[amplitude]` causes full WebGL context recreation on change (`components/Aurora.tsx:214`)
- [ ] Replace localStorage polling (`setInterval(countRecordings, 2000)`) with shared context or custom events in `Home.tsx` and `(studio)/layout.tsx`
- [ ] Add server-side recording persistence — currently recordings exist only in browser
- [ ] Add CSRF protection to API
- [ ] Add rate limiting on auth endpoints
- [ ] Remove commented-out CSS at bottom of `globals.css:213-239`
- [ ] Remove `page-old.tsx` from `apps/web/app/`
