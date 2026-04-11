# VS Code Extension — Design Spec

## Goal

Build a VS Code extension (`apps/vscode`) that records multi-file coding sessions inside VS Code and exports them as `.tantrica` files playable by the OpenScrim web player. Initial scope: **core recording + export + sidebar webview UI**. No upload to backend (Phase 2.3 follow-up).

## Scope

| In scope                                         | Out of scope (follow-up)     |
| ------------------------------------------------ | ---------------------------- |
| Multi-file recording with tab switching          | Upload to OpenScrim backend  |
| Sidebar webview panel (record/stop/pause/export) | Web player multi-file tab UI |
| Status bar recording indicator                   | Voice-over / annotations     |
| Export `.tantrica` via native save dialog        | Settings/configuration UI    |
| `openscrim-core` type changes for multi-file     | Terminal capture             |
| `openscrim-core` API changes for extensibility   |                              |

## Decisions

- **Multi-file approach**: Implicit file tracking via `FILE_SWITCH` events (Approach A)
- **Location**: `apps/vscode` inside the monorepo, imports `@repo/openscrim-core`
- **Bundler**: esbuild
- **Webview**: Vanilla HTML/JS (no React in webview)
- **Communication**: `postMessage` between extension host and webview

## Extension Structure

```
apps/vscode/
├── src/
│   ├── extension.ts              # Activation, command registration, disposables
│   ├── recording/
│   │   ├── VSCodeEventCapture.ts # VS Code API listeners → RecordingEvents
│   │   ├── VSCodeRecordingManager.ts # Recording lifecycle orchestrator
│   │   └── FileTracker.ts        # Tracks active files, emits FILE_SWITCH
│   ├── export/
│   │   └── TantricaExporter.ts   # Uses writeTantricaBuffer from openscrim-core
│   ├── sidebar/
│   │   ├── SidebarProvider.ts    # WebviewViewProvider implementation
│   │   └── webview/
│   │       ├── index.html        # Main webview HTML
│   │       ├── app.js            # Webview logic (vanilla JS)
│   │       └── styles.css        # VS Code-themed styles
│   └── commands/
│       └── registerCommands.ts   # Command palette commands
├── package.json                  # Extension manifest
├── tsconfig.json
├── esbuild.js                    # Build config
└── .vscodeignore
```

## Changes to `@repo/openscrim-core`

> The core package is `@repo/openscrim-core` (packages/openscrim-core). All type and API
> changes below must be made there **before** scaffolding the VS Code extension.

### 1. New event type — `FILE_SWITCH`

```typescript
// In RecordingEventType enum (types.ts):
FILE_SWITCH = 'file_switch',

// New interface:
export interface FileSwitchEvent extends BaseRecordingEvent {
  type: RecordingEventType.FILE_SWITCH;
  filePath: string;   // relative to workspace root (e.g. "src/index.ts")
  fileName: string;   // basename only (e.g. "index.ts")
  language: string;
  content: string;    // full snapshot of file content at switch time
}

// Add FileSwitchEvent to RecordingEvent union type
```

### 2. Multi-file support on `RecordingSession`

```typescript
export interface FileSnapshot {
  initialContent: string;
  finalContent: string;
  language: string;
}

// Add to RecordingSession:
files: Record<string, FileSnapshot>; // keyed by relative filePath
```

### 3. Make `addEvent()` public on `RecordingManager`

Currently `addEvent()` is **private**. The VS Code extension needs to feed arbitrary
`RecordingEvent`s (created by `VSCodeEventCapture`) directly into the manager.

**Change**: Rename `private addEvent` → `public addEvent`.

```typescript
// Before (RecordingManager.ts:258):
private addEvent(event: RecordingEvent): void { ... }

// After:
public addEvent(event: RecordingEvent): void { ... }
```

### 4. Refactor `stopRecording()` signature

Current signature is coupled to single-file web usage:

```typescript
stopRecording(
  sessionTitle: string,
  description: string,
  finalContent: string,
  initialContent: string
): RecordingSession | null
```

**Change**: Accept a structured options object that supports both single-file and multi-file:

```typescript
export interface StopRecordingOptions {
  title: string;
  description?: string;
  initialContent: string;
  finalContent: string;
  files?: Record<string, FileSnapshot>;  // multi-file support
}

// New signature:
stopRecording(options: StopRecordingOptions): RecordingSession | null
```

The web app caller updates to: `manager.stopRecording({ title, description, initialContent, finalContent })`.

### 5. Add state change observer to `RecordingManager`

The extension sidebar needs to react to state transitions (idle → recording → paused → stopped).
Currently there is no callback or event emitter.

**Change**: Add an `onStateChange` callback slot:

```typescript
export type StateChangeCallback = (
  newState: RecordingState,
  previousState: RecordingState,
  sessionState: RecordingSessionState
) => void;

// Add to RecordingManager:
private stateChangeCallbacks: StateChangeCallback[] = [];

onStateChange(cb: StateChangeCallback): void {
  this.stateChangeCallbacks.push(cb);
}

// Emit in startRecording(), pauseRecording(), resumeRecording(), stopRecording():
private emitStateChange(newState: RecordingState): void {
  const prev = this.sessionState.state;
  this.sessionState.state = newState;
  for (const cb of this.stateChangeCallbacks) {
    cb(newState, prev, { ...this.sessionState });
  }
}
```

### 6. Update `TantricaFile` format for multi-file

Add `files` field to `TantricaFile` in `format.ts`:

```typescript
export interface TantricaFile {
  version: 1;
  metadata: { ... };
  initialContent: string;
  finalContent: string;
  files?: Record<string, FileSnapshot>;  // multi-file — optional for backward compat
  editorConfig: { ... };
  events: RecordingEvent[];
}
```

Update `sessionToTantricaFile()` to include `files` when present, and `tantricaFileToSession()`
to restore it.

### 7. Update `index.ts` exports

Add new types to the public API:

```typescript
export type {
  FileSwitchEvent,
  FileSnapshot,
  StopRecordingOptions,
  StateChangeCallback,
} from './types.js';
export { RecordingManager } from './RecordingManager.js'; // already exported
```

### Backward compatibility

- Old recordings without `FILE_SWITCH` events and without `files` map continue to work
- `initialContent`, `finalContent`, `language` fields remain as the "primary file"
- Web player treats recordings without `FILE_SWITCH` as single-file (current behavior)
- `TantricaFile.files` is optional — old `.tantrica` files without it parse correctly
- `stopRecording()` old callers wrap args into `StopRecordingOptions` object (trivial migration)

## Event Capture

### VS Code API → Tantrica Event Mapping

| VS Code Event                           | Tantrica Event         | Notes                                 |
| --------------------------------------- | ---------------------- | ------------------------------------- |
| `workspace.onDidChangeTextDocument`     | `ContentChangeEvent`   | Range + text changes                  |
| `window.onDidChangeTextEditorSelection` | `SelectionChangeEvent` | Selection ranges                      |
| `window.onDidChangeActiveTextEditor`    | `FileSwitchEvent`      | File path, language, content snapshot |
| `window.onDidChangeActiveTextEditor`    | `EditorFocusEvent`     | Emitted alongside FILE_SWITCH         |

### Keystroke handling

VS Code does not expose raw keystrokes. We do not emit `KeystrokeEvent` from the extension. `ContentChangeEvent` captures all meaningful editor changes (insertions, deletions, replacements) which is sufficient for playback. The web player's `PlaybackEngine` already handles replay via content changes.

### FileTracker

Maintains a `Map<filePath, {initialContent, language}>`:

1. On recording start: captures active file's content and language
2. On `onDidChangeActiveTextEditor`: if new file not in map, captures its initial content; emits `FILE_SWITCH` event
3. On recording stop: iterates map, captures final content for each tracked file
4. Builds the `files: Record<string, FileSnapshot>` for the session

### VSCodeRecordingManager

Wraps the existing `RecordingManager` from `@repo/openscrim-core`:

- Owns `VSCodeEventCapture` and `FileTracker` instances
- Manages VS Code event subscriptions (subscribe on start, dispose on stop)
- On start: creates session, subscribes to events, captures initial file state
- On pause: emits `RECORDING_PAUSE`, pauses event forwarding
- On resume: emits `RECORDING_RESUME`, resumes event forwarding
- On stop: calls `manager.stopRecording({ title, description, initialContent, finalContent, files })` with multi-file `files` map from `FileTracker`, unsubscribes from VS Code events
- Listens to `manager.onStateChange()` to forward state updates to sidebar and status bar
- Exposes the session for export

## Recording Flow

```
1. User clicks "Start Recording" (sidebar or command)
   → VSCodeRecordingManager.start(title?)
   → Subscribe to VS Code events
   → FileTracker captures active file initial state
   → Emit RECORDING_START event
   → Status bar shows "$(circle-filled) REC 0:00"

2. User types / edits / switches files
   → VSCodeEventCapture converts VS Code events → RecordingEvents
   → RecordingManager.addEvent() buffers events
   → FileTracker emits FILE_SWITCH on tab changes
   → Sidebar updates duration timer and file list

3. User pauses
   → VSCodeRecordingManager.pause()
   → Emit RECORDING_PAUSE
   → Stop forwarding events (subscriptions remain active)
   → Status bar shows "$(debug-pause) PAUSED 1:23"

4. User resumes
   → VSCodeRecordingManager.resume()
   → Emit RECORDING_RESUME
   → Resume forwarding events

5. User stops
   → VSCodeRecordingManager.stop()
   → Emit RECORDING_STOP
   → Capture final content for all tracked files (FileTracker.buildFileSnapshots())
   → Unsubscribe from VS Code events
   → Call manager.stopRecording({ title, description, initialContent, finalContent, files })
   → Build complete RecordingSession
   → Status bar resets
   → Sidebar shows summary + export button (via onStateChange callback)
```

## Sidebar Webview

### Provider

`SidebarProvider` implements `vscode.WebviewViewProvider`. Registered as a sidebar view in `package.json` contributes.views.activitybar.

### Communication

Extension → Webview: `webview.postMessage({ type: string, data: any })`
Webview → Extension: `vscode.postMessage({ type: string, data: any })`

Message types:

- `stateChanged` — recording state update (idle/recording/paused/stopped)
- `durationUpdate` — live timer tick (every second while recording)
- `fileListUpdate` — list of tracked files
- `recordingComplete` — summary data for stopped recording
- `startRecording` — webview → extension
- `stopRecording` — webview → extension
- `pauseRecording` — webview → extension
- `resumeRecording` — webview → extension
- `exportRecording` — webview → extension (triggers save dialog)
- `discardRecording` — webview → extension

### UI States

**Idle**: Title input, optional description input, "Start Recording" button.

**Recording**: Live duration timer, list of tracked files with icons, "Pause" and "Stop" buttons. Title/description fields become read-only.

**Paused**: "Resume" and "Stop" buttons. Timer shows paused duration.

**Stopped**: Summary card (title, duration, file count, event count), "Export .tantrica" primary button, "Discard" secondary button, "New Recording" button.

### Styling

Use VS Code's CSS variables (`var(--vscode-foreground)`, `var(--vscode-button-background)`, etc.) to match the editor theme automatically. No hardcoded colors.

## Status Bar

`vscode.window.createStatusBarItem` with alignment right, priority 100.

| State        | Text                         | Color                   |
| ------------ | ---------------------------- | ----------------------- |
| Recording    | `$(circle-filled) REC 0:42`  | `errorForeground` (red) |
| Paused       | `$(debug-pause) PAUSED 1:23` | `disabledForeground`    |
| Idle/Stopped | Hidden                       | —                       |

Clicking the status bar item focuses the sidebar.

## Commands

| Command ID                 | Title                      | When                           |
| -------------------------- | -------------------------- | ------------------------------ |
| `tantrica.startRecording`  | Tantrica: Start Recording  | Always                         |
| `tantrica.stopRecording`   | Tantrica: Stop Recording   | Recording active               |
| `tantrica.pauseRecording`  | Tantrica: Pause Recording  | Recording active               |
| `tantrica.resumeRecording` | Tantrica: Resume Recording | Paused                         |
| `tantrica.exportRecording` | Tantrica: Export Recording | Recording stopped with session |

Commands are also exposed in the sidebar webview and status bar.

## Export Flow

1. User clicks "Export .tantrica" in sidebar
2. Extension calls `vscode.window.showSaveDialog({ filters: { 'Tantrica Recording': ['tantrica'] } })`
3. User picks save location
4. `TantricaExporter.export(session, filePath)`:
   - Builds `TantricaFile` from `RecordingSession` via `sessionToTantricaFile()` (includes `files` map for multi-file)
   - Calls `writeTantricaBuffer(tantricaFile)` from `@repo/openscrim-core`
   - Writes buffer to disk via `fs.writeFileSync`
5. Success notification: `vscode.window.showInformationMessage`

## Build & Turbo Integration

### package.json scripts

```json
{
  "scripts": {
    "build": "node esbuild.js",
    "dev": "node esbuild.js --watch",
    "lint": "eslint src/",
    "check-types": "tsc --noEmit",
    "package": "vsce package"
  }
}
```

### esbuild config

Bundle all source into `dist/extension.js`. Webview assets (HTML/JS/CSS) are loaded at runtime via `context.asWebviewUri`. Externalize `vscode` module (not bundled). Bundle `@repo/openscrim-core` into the extension output.

### Turbo

Add `vscode` to `pnpm-workspace.yaml` (already covered by `apps/*` glob). Add build pipeline entry in `turbo.json`:

```json
{
  "vscode": {
    "dependsOn": ["@repo/openscrim-core"]
  }
}
```

### tsconfig

Extends `@repo/typescript-config/base.json`. Target ES2022, module commonjs (VS Code requirement). Include `src/**/*`.

## Extension Manifest (package.json)

Key fields:

```json
{
  "name": "tantrica",
  "displayName": "Tantrica — Code Recording",
  "description": "Record coding sessions and export as lightweight .tantrica files",
  "version": "0.1.0",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Other"],
  "activationEvents": ["onView:tantrica-sidebar"],
  "main": "./dist/extension.js",
  "contributes": {
    "views": {
      "activitybar": [
        {
          "id": "tantrica-sidebar",
          "name": "Tantrica",
          "icon": "resources/icon.svg"
        }
      ]
    },
    "viewsWelcome": [
      {
        "view": "tantrica-sidebar",
        "contents": "Record your coding session and export as a lightweight .tantrica file."
      }
    ],
    "commands": [
      {
        "command": "tantrica.startRecording",
        "title": "Tantrica: Start Recording"
      },
      {
        "command": "tantrica.stopRecording",
        "title": "Tantrica: Stop Recording"
      },
      {
        "command": "tantrica.pauseRecording",
        "title": "Tantrica: Pause Recording"
      },
      {
        "command": "tantrica.resumeRecording",
        "title": "Tantrica: Resume Recording"
      },
      {
        "command": "tantrica.exportRecording",
        "title": "Tantrica: Export Recording"
      }
    ],
    "menus": {
      "commandPalette": [
        { "command": "tantrica.stopRecording", "when": "tantrica.isRecording" },
        {
          "command": "tantrica.pauseRecording",
          "when": "tantrica.isRecording"
        },
        { "command": "tantrica.resumeRecording", "when": "tantrica.isPaused" },
        { "command": "tantrica.exportRecording", "when": "tantrica.hasSession" }
      ]
    }
  },
  "dependencies": {
    "@repo/openscrim-core": "workspace:*"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "esbuild": "^0.20.0",
    "typescript": "^5.9.0"
  }
}
```

## Web Player Impact

Multi-file `.tantrica` recordings need a small web player update to render file tabs. This is a follow-up task **after** the extension is working:

- Show file tabs above the Monaco editor
- On `FILE_SWITCH` event, switch the active tab and update Monaco content
- Each tab shows `fileName` from the event
- `files` map in session provides initial content per file
- `TantricaFile.files` is optional — when absent, treat as single-file (current behavior)

Single-file recordings are unaffected — no changes needed for existing playback.

## Pre-requisite Checklist

Before writing any extension code in `apps/vscode`, these `openscrim-core` changes **must** land first:

- [ ] Add `FILE_SWITCH` to `RecordingEventType` enum (`types.ts`)
- [ ] Add `FileSwitchEvent` interface (`types.ts`)
- [ ] Add `FileSwitchEvent` to `RecordingEvent` union (`types.ts`)
- [ ] Add `FileSnapshot` interface (`types.ts`)
- [ ] Add `files: Record<string, FileSnapshot>` to `RecordingSession` (`types.ts`)
- [ ] Make `addEvent()` public on `RecordingManager` (`RecordingManager.ts`)
- [ ] Refactor `stopRecording()` to accept `StopRecordingOptions` object (`RecordingManager.ts`)
- [ ] Add `onStateChange()` observer to `RecordingManager` (`RecordingManager.ts`)
- [ ] Add `files` field to `TantricaFile` interface (`format.ts`)
- [ ] Update `sessionToTantricaFile()` to include `files` when present (`format.ts`)
- [ ] Update `tantricaFileToSession()` to restore `files` (`format.ts`)
- [ ] Export new types from `index.ts`
- [ ] Update web app callers of `stopRecording()` to use new options object
- [ ] Run `pnpm build` and `pnpm check-types` to verify no regressions

## Future (Out of Scope)

- **Upload to backend**: API client with Google OAuth browser flow, upload progress
- **Web player multi-file**: File tabs UI in `/r/:id` player
- **Recording settings**: Configurable capture options (what to capture, debounce timing)
- **Annotations**: Timestamped text notes during recording
- **Terminal capture**: Record terminal commands alongside editor events
