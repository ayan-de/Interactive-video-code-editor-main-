# Tantrica — Implementation Plan

> Full product roadmap: Fix current app → VS Code extension → Interactive playback
> For detailed design decisions, see `docs/superpowers/specs/2026-04-05-tantrica-full-product-design.md`

---

## Phase 1: Fix & Harden Current App

### 1.1 Bug Fixes [~2 days]

| Task                                                                                                      | Files                                                                              | Priority |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------- |
| Fix `RecordingManager.addEvent()` buffer duplication                                                      | `apps/web/app/core/RecordingManager.ts:264-282`                                    | P0       |
| Fix PlaygroundModal to navigate to `/record` with title                                                   | `apps/web/app/components/playgroundCards/PlaygroundModal.tsx`                      | P0       |
| Detect language from Monaco model instead of hardcoding `'javascript'`                                    | `apps/web/app/core/RecordingManager.ts:143`, `apps/web/app/hooks/useRecordings.ts` | P1       |
| Fix `"Untile session"` typo → `"Untitled session"`                                                        | `apps/web/app/core/RecordingManager.ts:39,109`                                     | P1       |
| Remove dead code: `page-old.tsx`, `page.module.css`, unused `AuthenticatedGuard`, unused `GoogleStrategy` | Multiple files                                                                     | P2       |
| Make `autoSave` actually save to API (currently a no-op)                                                  | `apps/web/app/hooks/useRecordings.ts`                                              | P2       |
| Add `.env.example` files for web and api                                                                  | New files                                                                          | P2       |

### 1.2 MongoDB Backend [~3 days]

| Task                                         | Description                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| Install Mongoose in API app                  | `pnpm add mongoose @types/mongoose` in `apps/api`                          |
| Create `DatabaseModule`                      | Connection config via `ConfigService`, connection on bootstrap             |
| Create `User` schema/model                   | Schema matches `UserDocument` in design doc                                |
| Create `Recording` schema/model              | Schema matches `RecordingDocument` in design doc                           |
| Create `RecordingEvent` schema/model         | Batched events (~100 per doc), indexed by recordingId + sequenceIndex      |
| Migrate auth to persist users                | `AuthService.validateUser()` → upsert to DB on each login                  |
| Create `RecordingsModule`                    | New NestJS module: controller, service, repository                         |
| Create recording CRUD endpoints              | POST/GET/PATCH/DELETE `/recordings`                                        |
| Create event endpoints                       | GET `/recordings/:id/events` (paginated), GET `/recordings/:id/events/all` |
| Create upload endpoint                       | POST `/recordings/upload` — accepts .tantrica file or JSON                 |
| Create download endpoint                     | GET `/recordings/:id/download` — returns .tantrica file                    |
| Add `AuthenticatedGuard` to protected routes | Apply to all `/recordings` endpoints                                       |

### 1.3 Shared Core Package [~2 days]

| Task                                                      | Description                                              |
| --------------------------------------------------------- | -------------------------------------------------------- |
| Create `packages/tantrica-core`                           | New package in monorepo                                  |
| Move `types.ts` (RecordingEvent types) to `tantrica-core` | From `apps/web/app/types/recordings.ts`                  |
| Move `RecordingManager` to `tantrica-core`                | Refactor to accept event source via Strategy pattern     |
| Move `PlaybackEngine` to `tantrica-core`                  | Refactor to emit events via Observer pattern             |
| Add `compression.ts`                                      | Delta encoding, cursor deduplication, keystroke batching |
| Add `format.ts`                                           | .tantrica file reader/writer (magic bytes + gzip)        |
| Update web app imports                                    | `@/*` → `@repo/tantrica-core` for shared types           |
| Add unit tests for `tantrica-core`                        | Jest tests for capture, playback, compression, format    |

### 1.4 Web App — New Pages [~3 days]

| Task                                                       | Description                                                 |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| Create `/r/:id` public player route                        | Uses PlaybackEngine + PlaybackViewer, loads from API        |
| Create `/dashboard` page                                   | User's recording library, list/grid view, delete actions    |
| Create `/upload` page                                      | Drag-and-drop .tantrica file upload with progress bar       |
| Create `/playground/[id]` pages OR remove playground cards | Either build language-specific studios or simplify homepage |
| Replace localStorage with API calls in `/view` page        | Fetch recordings from backend instead of localStorage       |
| Add error boundaries                                       | Wrap PlaybackViewer, MonacoEditor in React error boundaries |
| Add loading states                                         | Skeleton screens for recording list, player                 |
| Add keyboard shortcuts to player                           | Space (play/pause), arrows (skip), up/down (speed)          |

### 1.5 Storage Adapter Pattern [~1 day]

| Task                                | Description                                                  |
| ----------------------------------- | ------------------------------------------------------------ |
| Define `RecordingStorage` interface | `save()`, `load()`, `list()`, `delete()`, `getEvents()`      |
| Implement `LocalStorageAdapter`     | Current localStorage behavior, for offline/demo              |
| Implement `ApiStorageAdapter`       | Calls NestJS recording endpoints                             |
| Wire up in web app                  | Use API adapter when authenticated, localStorage as fallback |

---

## Phase 2: VS Code Extension

### 2.0 openscrim-core Prep [~1 day]

> Must be completed before 2.1. See the "Changes to `@repo/openscrim-core`" section in
> `docs/superpowers/specs/2026-04-09-vscode-extension-design.md` for full details.

| Task                                                         | Description                                                          |
| ------------------------------------------------------------ | -------------------------------------------------------------------- |
| Add `FILE_SWITCH` event type + `FileSwitchEvent`             | New enum value + interface in `types.ts`                             |
| Add `FileSnapshot` interface + `files` on `RecordingSession` | Multi-file support in `types.ts`                                     |
| Make `addEvent()` public on `RecordingManager`               | Needed so extension can feed arbitrary events                        |
| Refactor `stopRecording()` → `StopRecordingOptions`          | Accept `{ title, description, initialContent, finalContent, files }` |
| Add `onStateChange()` observer to `RecordingManager`         | Callback pattern for state transitions                               |
| Update `TantricaFile` format with `files` field              | `format.ts` + reader/writer updates                                  |
| Export new types from `index.ts`                             | Public API surface                                                   |
| Update web app callers                                       | Adapt to new `stopRecording()` signature                             |
| Build + type-check                                           | `pnpm build && pnpm check-types` passes                              |

### 2.1 Extension Scaffold [~2 days]

| Task                              | Description                                         |
| --------------------------------- | --------------------------------------------------- |
| Create `apps/vscode/` directory   | New app in monorepo                                 |
| `package.json` extension manifest | Commands, activation events, contributes            |
| `tsconfig.json`                   | Extends shared tsconfig                             |
| Build pipeline                    | esbuild bundle, `vsce` packaging                    |
| Basic command registration        | `tantrica.startRecording`, `tantrica.stopRecording` |
| Status bar item                   | Recording indicator (red dot when recording)        |

### 2.2 Event Capture [~3 days]

| Task                                                 | Description                                   |
| ---------------------------------------------------- | --------------------------------------------- |
| Create `EventCapture` class                          | Wraps VS Code workspace event listeners       |
| Wire `onDidChangeTextDocument`                       | → `ContentChangeEvent`                        |
| Wire `onDidChangeCursorPosition`                     | → `CursorPositionEvent`                       |
| Wire `onDidChangeTextEditorSelection`                | → `SelectionChangeEvent`                      |
| Wire `onDidChangeActiveTextEditor`                   | → `EditorFocusEvent` + language detection     |
| Wire `onDidSaveTextDocument`                         | → New `SaveEvent` type                        |
| Adapt `RecordingManager` from `@repo/openscrim-core` | Strategy pattern: inject `VSCodeEventCapture` |

### 2.3 Export & Upload [~2 days]

| Task                   | Description                                                                   |
| ---------------------- | ----------------------------------------------------------------------------- |
| `TantricaFileWriter`   | Serialize recording to .tantrica format (using `@repo/openscrim-core/format`) |
| Gzip compression       | Node.js `zlib.gzipSync`                                                       |
| File save dialog       | `vscode.window.showSaveDialog()` for local export                             |
| API client for upload  | POST to `/recordings/upload` with .tantrica file                              |
| Auth flow in extension | Open browser → Google OAuth → receive API token → store in secretStorage      |
| Upload progress        | `vscode.window.withProgress()` notification                                   |

### 2.4 Sidebar UI [~3 days]

| Task                   | Description                                        |
| ---------------------- | -------------------------------------------------- |
| Webview panel scaffold | TreeView or Webview for sidebar                    |
| Recording state views  | Start → In Progress (with pause/resume) → Complete |
| Saved recordings list  | Local .tantrica files + uploaded recordings        |
| Actions per recording  | Play (open web URL), Upload, Export, Delete        |

---

## Phase 3: Interactive Playback

> See `docs/superpowers/specs/2026-04-11-interactive-fork-design.md` for full design.

### 3.1a Fork — Web Player [~3 days]

| Task                                 | Description                                               |
| ------------------------------------ | --------------------------------------------------------- |
| Create `forkStorage.ts`              | IndexedDB CRUD for forks (`openscrim-forks` database)     |
| Add `ViewerMode` + fork state        | `'playback' \| 'fork'` mode, activeForkId, forks array    |
| Add Fork button to playback controls | Pauses engine, snapshots content/cursor/timestamp         |
| Implement mode-switching             | playback → fork (readOnly: false), fork → playback (seek) |
| Auto-save fork edits                 | Debounced 2s save via `onDidChangeModelContent`           |
| "Return to Playback" banner          | Non-dismissable banner with green indicator               |
| Timeline fork markers                | Green dots on scrubber, clickable to re-enter fork        |
| Fork list dropdown                   | Counter badge + dropdown with open/delete actions         |
| Fork limit enforcement               | Max 50 per recording, auto-delete oldest                  |

### 3.1b Fork — VS Code Extension [~2 days]

| Task                              | Description                                       |
| --------------------------------- | ------------------------------------------------- |
| Fork support in extension webview | Reuse fork data model in sidebar playback webview |
| IndexedDB in webview              | Store forks in webview's origin storage           |
| Fork UI in webview                | Fork button, edit mode, return to playback        |

### 3.2 Annotations [~2 days]

| Task                                      | Description                                       |
| ----------------------------------------- | ------------------------------------------------- |
| Add `Annotation` type to `tantrica-core`  | `{ timestamp: number, text: string, id: string }` |
| Annotation markers on timeline            | Visual markers on the scrubber                    |
| Annotation panel                          | Show all annotations as a list, click to jump     |
| VS Code extension: add annotation command | Teacher adds text note at current timestamp       |

### 3.3 Progressive Event Loading [~2 days]

| Task                      | Description                                              |
| ------------------------- | -------------------------------------------------------- |
| Chunk-based event loading | Load events in pages of 5K from API                      |
| Predictive prefetch       | Pre-load next chunk when playback reaches 80% of current |
| Seek across chunks        | When seeking past loaded events, fetch the needed chunk  |
| PlaybackEngine adaptation | Work with partial event sets, load more on demand        |

---

## Total Estimated Timeline

| Phase     | Duration     | Deliverable                                               |
| --------- | ------------ | --------------------------------------------------------- |
| Phase 1   | ~11 days     | Production web app with MongoDB backend, .tantrica format |
| Phase 2   | ~11 days     | VS Code extension for recording + export + upload         |
| Phase 3   | ~9 days      | Interactive playback with fork and annotations            |
| **Total** | **~31 days** | Full product                                              |

---

## Dependencies

```
Phase 1.1 (bug fixes)          → no dependencies
Phase 1.2 (MongoDB)            → no dependencies
Phase 1.3 (shared core)        → after 1.1
Phase 1.4 (web pages)          → after 1.2, 1.3
Phase 1.5 (storage adapter)    → after 1.3

Phase 2.0 (openscrim-core prep) → after 1.3 (needs openscrim-core to exist)
Phase 2.1 (extension scaffold)  → after 2.0
Phase 2.2 (event capture)       → after 2.1
Phase 2.3 (export/upload)       → after 2.2
Phase 2.4 (sidebar UI)          → after 2.3

Phase 3.1a (fork web player)     → after 1.4
Phase 3.1b (fork VS Code)        → after 2.4, 3.1a
Phase 3.2 (annotations)          → after 1.4
Phase 3.3 (progressive load)     → after 1.2, 1.4
```

Phase 1.1 and 1.2 can be done in parallel. Phase 2.0 (core prep) can start as soon as `openscrim-core` package exists (1.3).

---

## Key Design Patterns Used

| Pattern        | Where                             | Why                                                 |
| -------------- | --------------------------------- | --------------------------------------------------- |
| **Strategy**   | Event capture (Monaco vs VS Code) | Same RecordingManager, different event sources      |
| **Observer**   | PlaybackEngine → UI components    | Decouple engine from rendering                      |
| **Repository** | Backend data access               | Services don't touch DB directly                    |
| **Adapter**    | Storage (localStorage vs API)     | Swap storage backend without changing consumers     |
| **Factory**    | .tantrica file reader             | Handle multiple format versions                     |
| **Facade**     | `tantrica-core` package           | Single entry point for all recording/playback logic |

---

## Innovation Ideas (Future Phases)

1. **Voice-over sync** — Record audio alongside code, sync during playback
2. **Chapter markers** — Table of contents for recordings
3. **Embedded quizzes** — Pause + quiz at specific timestamps
4. **Multi-file recordings** — Record editing across multiple files
5. **Terminal capture** — Replay terminal commands and output
6. **AI-generated summaries** — Auto-generate descriptions and chapters from events
7. **Code diff view** — Step through changes as a diff
8. **Collaborative recording** — Multiple people recording simultaneously
