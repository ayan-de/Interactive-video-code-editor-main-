# Tantrica — Full Product Design & Implementation Plan

> "No pixels. Just DOM." — A lightweight DOM-based code recording format.
> 1-hour coding tutorial in ~10MB. No pixel fluctuation. Fast on slow internet.

## Product Vision

Tantrica is a **code recording and playback platform** that captures editor DOM events (keystrokes, cursor movements, selections, content changes) instead of pixel-based screen recordings. The result:

- **~1-3MB per hour** of recorded coding (gzipped) vs hundreds of MB for video
- **Zero quality loss** on any resolution or internet speed — it's text, not pixels
- **Seekable to any millisecond** — jump to any point instantly
- **Editable during playback** (Phase 3) — students can fork and modify code at any point

### Target Users

1. **Teachers** — Record coding tutorials inside VS Code, upload to Tantrica
2. **Developers** — Record code walkthroughs, bug reproductions, PR explanations for teammates

---

## Current State Assessment

### What Works

| Area                                   | Status                               |
| -------------------------------------- | ------------------------------------ |
| RecordingManager (core capture engine) | Functional, has buffering bug        |
| PlaybackEngine (core replay engine)    | Fully working, variable speed, seek  |
| Type system (RecordingEvent union)     | Well-designed, 8 event types         |
| Google OAuth flow                      | End-to-end working                   |
| UI components (Aurora, glass-morphism) | Polished                             |
| Monaco Editor integration              | Recording and playback both wired up |

### What's Broken

| Issue                                                                       | Severity |
| --------------------------------------------------------------------------- | -------- |
| `RecordingManager.addEvent()` buffer logic duplicates events                | High     |
| `PlaygroundModal` "Start Recording" does nothing                            | High     |
| `/playground/[id]` routes don't exist (404 for all 11 cards)                | High     |
| `/dashboard` route doesn't exist (linked from UserMenu)                     | Medium   |
| Language hardcoded to `'javascript'` in stopRecording                       | Medium   |
| `autoSave` flag is a no-op (just logs)                                      | Medium   |
| No backend storage — recordings only in localStorage                        | Critical |
| No database — users never persisted                                         | Critical |
| No `.env.example` file                                                      | Low      |
| Dead code: `page-old.tsx`, unused AuthenticatedGuard, unused GoogleStrategy | Low      |

---

## Architecture

```
┌──────────────────────┐                          ┌──────────────────────┐
│                      │   .tantrica file (upload) │                      │
│   VS Code Extension  │ ────────────────────────> │   Web App (Next.js)  │
│   (Record + Export)  │   or direct API upload    │   (Watch Player)     │
│                      │                           │                      │
│   - Capture events   │                           │   - Upload recordings│
│   - Export .tantrica │                           │   - Browse library   │
│   - Upload to cloud  │                           │   - Watch (play/pause│
│                      │                           │     /stop/seek/speed)│
└──────────────────────┘                           └──────────┬───────────┘
                                                              │
                                                   ┌──────────▼───────────┐
                                                   │   NestJS API         │
                                                   │   + MongoDB          │
                                                   │                      │
                                                   │   - Auth (Google)    │
                                                   │   - Recording CRUD   │
                                                   │   - File storage     │
                                                   │   - User management  │
                                                   └──────────────────────┘
```

### Data Flow

```
RECORD (VS Code):
  Teacher types in VS Code
    → Extension captures onDidChangeTextDocument, onDidChangeCursorPosition, etc.
    → Events buffered in memory
    → On stop: serialize to .tantrica (JSON + gzip)
    → Upload via API or save locally

WATCH (Web):
  Student opens recording URL
    → API fetches recording metadata + events
    → PlaybackEngine loads session
    → Monaco Editor replays events in real-time
    → Controls: play/pause/stop/seek/speed (0.25x-4x)
```

---

## .tantrica File Format

### Structure

```
┌──────────────────────────────┐
│  Magic bytes: "TNTC" (4B)   │  Identify file type
│  Version: uint16 (2B)        │  Format version (currently 1)
│  Header length: uint32 (4B)  │  Size of JSON header
│  JSON Header (variable)      │  Metadata (see below)
│  Gzipped Event Stream        │  All events, compressed
└──────────────────────────────┘
```

### JSON Payload (inside the gzipped section)

The entire TantricaFile object is serialized as JSON, then gzipped. The binary header allows file type detection without decompressing.

```typescript
interface TantricaFile {
  version: 1;
  metadata: {
    id: string;
    title: string;
    description?: string;
    author: { id: string; name: string };
    language: string;
    duration: number; // ms
    eventCount: number;
    createdAt: string; // ISO 8601
    tags?: string[];
  };
  initialContent: string;
  finalContent: string;
  editorConfig: {
    fontSize: number;
    tabSize: number;
    theme: string;
    wordWrap: boolean;
  };
  events: RecordingEvent[];
}
```

### Event Compression Strategies

1. **Delta encoding for positions**: Instead of `{lineNumber: 15, column: 23}`, store `[-2, 3]` (delta from previous)
2. **Deduplicate cursor events**: Skip if position unchanged from last cursor event within 50ms
3. **Batch keystrokes**: Group rapid keydown events within same 16ms frame into one event
4. **Content change dedup**: If content changes arrive in rapid succession, keep only the latest version per 50ms window
5. **Remove redundant fields**: Omit fields that match defaults (e.g., `altKey: false` can be omitted)

### Size Estimation

| Recording Duration | Raw Events | After Compression | Gzipped |
| ------------------ | ---------- | ----------------- | ------- |
| 5 minutes          | ~500KB     | ~200KB            | ~50KB   |
| 30 minutes         | ~3MB       | ~1.2MB            | ~300KB  |
| 1 hour             | ~6MB       | ~2.5MB            | ~800KB  |

Well within the 10MB target.

---

## Database Schema (MongoDB)

### Collections

#### `users`

```typescript
interface UserDocument {
  _id: ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
  provider: 'google';
  providerId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### `recordings`

```typescript
interface RecordingDocument {
  _id: ObjectId;
  userId: ObjectId; // ref users
  title: string;
  description?: string;
  language: string;
  duration: number; // ms
  eventCount: number;
  fileSize: number; // bytes (compressed)
  initialContent: string;
  finalContent: string;
  editorConfig: {
    fontSize: number;
    tabSize: number;
    theme: string;
    wordWrap: boolean;
  };
  tags?: string[];
  isPublic: boolean;
  playCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### `recording_events`

```typescript
interface RecordingEventDocument {
  _id: ObjectId;
  recordingId: ObjectId; // ref recordings
  sequenceIndex: number; // order within recording
  events: RecordingEvent[]; // batched — ~100 events per document
}
```

**Why separate collection?** The events array for a 1-hour recording can have 50K+ events. Storing them in a separate collection with batched documents (~100 events each) keeps the recording metadata document small and fast to query, while events can be loaded progressively (paginate as playback proceeds).

---

## API Endpoints

### Auth (existing, keep)

| Method | Path                    | Description           |
| ------ | ----------------------- | --------------------- |
| GET    | `/auth/google`          | Get Google OAuth URL  |
| GET    | `/auth/google/callback` | Handle OAuth callback |
| GET    | `/auth/profile`         | Get current user      |
| POST   | `/auth/logout`          | Logout                |

### Recordings (new)

| Method | Path                         | Description                                            |
| ------ | ---------------------------- | ------------------------------------------------------ |
| POST   | `/recordings`                | Upload a new recording (.tantrica file or JSON body)   |
| GET    | `/recordings`                | List user's recordings (paginated)                     |
| GET    | `/recordings/:id`            | Get recording metadata                                 |
| GET    | `/recordings/:id/events`     | Get events (paginated, supports `?from=index&limit=N`) |
| GET    | `/recordings/:id/events/all` | Get all events (for web player initial load)           |
| DELETE | `/recordings/:id`            | Delete a recording                                     |
| PATCH  | `/recordings/:id`            | Update metadata (title, description, tags)             |

### File Upload

| Method | Path                       | Description                              |
| ------ | -------------------------- | ---------------------------------------- |
| POST   | `/recordings/upload`       | Upload .tantrica file, parse server-side |
| GET    | `/recordings/:id/download` | Download as .tantrica file               |

---

## VS Code Extension Architecture

### Tech Stack

- **TypeScript** + VS Code Extension API
- **Bundled with esbuild** (standard for VS Code extensions)
- Uses `vscode.*` event APIs instead of Monaco

### Extension Components

```
vscode-tantrica/
├── src/
│   ├── extension.ts          # Activation, command registration
│   ├── recording/
│   │   ├── RecordingManager.ts   # Adapted from web version
│   │   ├── EventCapture.ts       # VS Code event listeners
│   │   └── SessionManager.ts     # Session lifecycle
│   ├── export/
│   │   ├── TantricaFileWriter.ts # Serialize to .tantrica format
│   │   └── Compression.ts       # Gzip compression
│   ├── upload/
│   │   └── ApiClient.ts          # Upload to Tantrica backend
│   ├── sidebar/
│   │   ├── RecordingPanel.ts     # Sidebar UI (webview)
│   │   └── panels/
│   │       ├── StartRecording.tsx
│   │       ├── RecordingInProgress.tsx
│   │       └── RecordingComplete.tsx
│   └── shared/
│       └── types.ts              # Shared recording types
├── package.json               # Extension manifest
└── tsconfig.json
```

### VS Code Events → RecordingEvents Mapping

| VS Code Event                    | RecordingEvent Type                     |
| -------------------------------- | --------------------------------------- |
| `onDidChangeTextDocument`        | `ContentChangeEvent`                    |
| `onDidChangeCursorPosition`      | `CursorPositionEvent`                   |
| `onDidChangeTextEditorSelection` | `SelectionChangeEvent`                  |
| `onDidChangeActiveTextEditor`    | `EditorFocusEvent` / Language detection |
| `onDidSaveTextDocument`          | `SaveEvent` (new event type)            |

### Extension Commands

| Command                    | Description                                 |
| -------------------------- | ------------------------------------------- |
| `tantrica.startRecording`  | Start recording current editor session      |
| `tantrica.stopRecording`   | Stop and save recording                     |
| `tantrica.pauseRecording`  | Pause recording                             |
| `tantrica.resumeRecording` | Resume recording                            |
| `tantrica.exportRecording` | Export last recording as .tantrica file     |
| `tantrica.uploadRecording` | Upload recording to Tantrica cloud          |
| `tantrica.openRecordings`  | Open sidebar panel showing saved recordings |

---

## Web App — Pages & Routes

### Existing Pages (keep/fix)

| Route            | Status | Action                                         |
| ---------------- | ------ | ---------------------------------------------- |
| `/`              | Works  | Fix PlaygroundModal, fix playground card links |
| `/record`        | Works  | Keep as backup recorder (VS Code is primary)   |
| `/view`          | Works  | Connect to MongoDB instead of localStorage     |
| `/auth/callback` | Works  | Keep                                           |

### New Pages

| Route              | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `/r/:id`           | Public recording player — play/pause/stop/seek/speed |
| `/dashboard`       | User's recording library, upload .tantrica files     |
| `/upload`          | Upload .tantrica file page                           |
| `/playground/[id]` | Language-specific recording studio                   |

### Web Player (`/r/:id`)

The core product page. Features:

1. **Monaco Editor** — read-only, displays code being replayed
2. **Transport controls** — play, pause, stop buttons
3. **Timeline scrubber** — seek to any point
4. **Speed control** — 0.25x, 0.5x, 1x, 1.5x, 2x, 4x
5. **Session metadata** — title, author, duration, language
6. **Keyboard shortcuts** — space (play/pause), left/right (skip ±5s), up/down (speed)
7. **Progressive event loading** — load first 5K events, fetch more as playback proceeds

---

## Phase Plan

### Phase 1: Fix & Harden (Current App)

**Goal**: Make the existing web app production-quality with MongoDB backend.

1.1 **Fix bugs** ✅

- [x] ~~Fix RecordingManager.addEvent() buffer duplication bug~~ ✅
- [x] ~~Fix PlaygroundModal to navigate to /record with title~~ ✅
- [x] ~~Fix language detection (read from Monaco model + onDidChangeModelLanguage listener)~~ ✅
- [x] ~~Fix "Untile" typo → "Untitled"~~ ✅
- [x] ~~Remove dead code (page-old.tsx, page.module.css, AuthenticatedGuard, GoogleStrategy)~~ ✅

  1.2 **Add MongoDB** ✅

- [x] ~~Add Mongoose to API app~~ ✅
- [x] ~~Create User model, Recording model, RecordingEvent model~~ ✅
- [x] ~~Add .env.example with all required vars~~ ✅
- [x] ~~Migrate auth to persist users in DB~~ ✅

  1.3 **Recording API**

- CRUD endpoints for recordings
- Upload .tantrica file endpoint
- Event streaming endpoint (paginated)

  1.4 **Connect web app to backend**

- Replace localStorage with API calls on /view page
- Add /dashboard page with user's recordings
- Add /r/:id public player route
- Add /upload page for .tantrica file uploads
- Fix /playground/[id] to actually work (or remove if VS Code replaces it)

  1.5 **File format implementation**

- Implement .tantrica writer (JSON + gzip)
- Implement .tantrica reader/parser
- Event compression (delta encoding, deduplication)
- Add as shared package: `packages/tantrica-format`

### Phase 2: VS Code Extension

**Goal**: Teachers can record inside VS Code and export .tantrica files.

2.1 **Core extension**

- Extension scaffold (package.json, commands, sidebar)
- EventCapture — wire up VS Code event listeners
- RecordingManager — adapted from web version
- Status bar indicator (recording state)

  2.2 **Export**

- TantricaFileWriter — serialize events to .tantrica format
- Gzip compression
- File save dialog

  2.3 **Upload**

- API client for uploading to Tantrica backend
- Auth flow (open browser for Google OAuth, receive token)
- Upload progress indicator

  2.4 **Sidebar UI**

- Webview panel with recording controls
- List of saved recordings
- Upload/delete actions

### Phase 3: Interactive Playback

**Goal**: Students can fork and edit code at any point during playback.

3.1 **Fork mechanism**

- "Fork" button appears during playback
- Snapshots current editor state (content + cursor position)
- Creates a new editable Monaco instance
- Student can modify code freely

  3.2 **Playback annotations**

- Teachers can add timestamped text notes
- Notes appear as markers on the timeline
- Click a marker to jump to that point

  3.3 **Progressive event loading**

- Load events in chunks as playback proceeds
- Infinite seek: even if events aren't loaded yet, seek works by loading the needed chunk

---

## Code Architecture Improvements

### Current Issues

1. **RecordingManager has God class tendencies** — captures events, manages state, handles buffering, manages config. Split into focused classes.

2. **No shared format package** — RecordingManager and PlaybackEngine both depend on the same event types but they're only in the web app. The VS Code extension will need them too.

3. **No repository pattern on backend** — Services directly handle business logic and data access. Add repositories.

4. **No error boundaries** — React components have no error boundaries. A crash in PlaybackViewer takes down the whole page.

### Proposed Package Structure

```
Interactive-video-code-editor-main/
├── apps/
│   ├── web/           # Next.js web app (player + uploader)
│   ├── api/           # NestJS backend API
│   └── vscode/        # VS Code extension (Phase 2)
├── packages/
│   ├── ui/            # Shared React components
│   ├── tantrica-core/ # NEW: Shared recording engine
│   │   ├── src/
│   │   │   ├── types.ts           # All RecordingEvent types
│   │   │   ├── RecordingManager.ts # Capture engine (adapted)
│   │   │   ├── PlaybackEngine.ts   # Replay engine (adapted)
│   │   │   ├── compression.ts      # Delta encoding, dedup
│   │   │   └── format.ts           # .tantrica read/write
│   │   └── package.json
│   ├── eslint-config/
│   └── typescript-config/
```

### Key Design Patterns

1. **Strategy Pattern** for event capture — `MonacoEventCapture` (web) vs `VSCodeEventCapture` (extension) both produce the same `RecordingEvent` types. The `RecordingManager` doesn't care where events come from.

2. **Observer Pattern** for playback — `PlaybackEngine` emits events. UI components subscribe. Decoupled.

3. **Repository Pattern** on backend — `RecordingRepository`, `UserRepository`. Services don't touch MongoDB directly.

4. **Factory Pattern** for .tantrica format — `TantricaFileReader.fromBuffer()` handles version detection and returns the right parser.

5. **Adapter Pattern** for storage — Current code stores in localStorage. New code stores via API. The `RecordingStorage` interface abstracts this — `LocalStorageAdapter` (offline/demo) vs `ApiStorageAdapter` (production).

---

## Scalability & Maintainability

### Backend Scaling

- **Event pagination**: Don't load 50K events at once. Load in chunks of 5K.
- **CDN for .tantrica files**: Store compressed files in S3/Cloudflare R2. MongoDB only holds metadata.
- **Connection pooling**: Mongoose default pool is 5. Increase for production.
- **Rate limiting**: On upload and playback endpoints.

### Frontend Performance

- **Virtual event list**: For recordings with 50K+ events, don't hold all in memory during playback. Stream in chunks.
- **Web Worker for decompression**: Parse .tantrica files off the main thread.
- **Lazy load Monaco**: Only load the editor when the player route is visited.
- **React.memo / useMemo**: PlaybackViewer re-renders on every event. Memo aggressively.

### Maintainability

- **Monorepo sharing**: `packages/tantrica-core` is used by web app, VS Code extension, and potentially CLI tools.
- **Strict TypeScript**: All shared packages use strict mode. No `any` in shared code.
- **Test coverage**: `tantrica-core` gets unit tests for capture, playback, compression, and format.
- **Version the format**: `.tantrica` files have a version field. Old versions always parseable.

---

## Innovation Ideas

1. **Voice-over sync**: Record audio alongside code events. Sync audio playback with code replay. Teachers explain while coding.

2. **Chapter markers**: Teachers add named chapters ("Setting up the project", "Adding auth", etc.) that appear as a table of contents. Students jump between chapters.

3. **Embedded quizzes**: At certain timestamps, pause playback and show a quiz question. Student answers before continuing.

4. **Multi-file recordings**: Record multiple files being edited in sequence. Viewer shows file tabs switching.

5. **Terminal capture**: Capture terminal commands and output alongside editor events. Full development environment replay.

6. **Collaborative recording**: Multiple teachers record simultaneously (like pair programming recordings).

7. **AI-generated summaries**: Auto-generate a text summary and chapter markers from the recording events using LLM.

8. **Code diff view**: Show a diff between the initial and final state of the code, with ability to step through changes.

---

## Success Metrics

| Metric                     | Phase 1 Target | Phase 2 Target |
| -------------------------- | -------------- | -------------- |
| File size: 1hr recording   | < 3MB gzipped  | < 2MB gzipped  |
| Playback start time        | < 2 seconds    | < 1 second     |
| Seek to any point          | < 500ms        | < 200ms        |
| Recording capture overhead | < 5% CPU       | < 2% CPU       |
| Mobile playback            | Works on 3G    | Works on 2G    |
