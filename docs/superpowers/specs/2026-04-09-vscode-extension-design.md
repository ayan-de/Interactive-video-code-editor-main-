# VS Code Extension — Design Spec

## Goal

Build a VS Code extension (`apps/vscode`) that records multi-file coding sessions inside VS Code and exports them as `.tantrica` files playable by the Tantrica web player. Initial scope: **core recording + export + sidebar webview UI**. No upload to backend (Phase 2.3 follow-up).

## Scope

| In scope                                         | Out of scope (follow-up)     |
| ------------------------------------------------ | ---------------------------- |
| Multi-file recording with tab switching          | Upload to Tantrica backend   |
| Sidebar webview panel (record/stop/pause/export) | Web player multi-file tab UI |
| Status bar recording indicator                   | Voice-over / annotations     |
| Export `.tantrica` via native save dialog        | Settings/configuration UI    |
| `tantrica-core` type changes for multi-file      | Terminal capture             |

## Decisions

- **Multi-file approach**: Implicit file tracking via `FILE_SWITCH` events (Approach A)
- **Location**: `apps/vscode` inside the monorepo, imports `@repo/tantrica-core`
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
│   │   └── TantricaExporter.ts   # Uses TantricaFileWriter from tantrica-core
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

## Type Changes to `@repo/tantrica-core`

### New event type

```typescript
// In RecordingEventType enum:
FILE_SWITCH = 'file_switch',

// New interface:
export interface FileSwitchEvent extends BaseRecordingEvent {
  type: RecordingEventType.FILE_SWITCH;
  filePath: string;   // relative to workspace root (e.g. "src/index.ts")
  fileName: string;   // basename only (e.g. "index.ts")
  language: string;
  content: string;
}

// Add FileSwitchEvent to RecordingEvent union
```

### RecordingSession additions

```typescript
export interface FileSnapshot {
  initialContent: string;
  finalContent: string;
  language: string;
}

// Add to RecordingSession:
files: Record<string, FileSnapshot>;
```

### Backward compatibility

- Old recordings without `FILE_SWITCH` events and without `files` map continue to work
- `initialContent`, `finalContent`, `language` fields remain as the "primary file"
- Web player treats recordings without `FILE_SWITCH` as single-file (current behavior)

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

Wraps the existing `RecordingManager` from `@repo/tantrica-core`:

- Owns `VSCodeEventCapture` and `FileTracker` instances
- Manages VS Code event subscriptions (subscribe on start, dispose on stop)
- On start: creates session, subscribes to events, captures initial file state
- On pause: emits `RECORDING_PAUSE`, pauses event forwarding
- On resume: emits `RECORDING_RESUME`, resumes event forwarding
- On stop: emits `RECORDING_STOP`, captures final file states, builds complete session
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
   → Capture final content for all tracked files
   → Unsubscribe from VS Code events
   → Build complete RecordingSession
   → Status bar resets
   → Sidebar shows summary + export button
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
   - Builds `TantricaFile` from `RecordingSession` (uses `files` map for multi-file)
   - Calls `TantricaFileWriter.write(tantricaFile)` from `@repo/tantrica-core`
   - Writes buffer to disk
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

Bundle all source into `dist/extension.js`. Webview assets (HTML/JS/CSS) are loaded at runtime via `context.asWebviewUri`. Externalize `vscode` module (not bundled). Bundle `@repo/tantrica-core` into the extension output.

### Turbo

Add `vscode` to `pnpm-workspace.yaml`. Add build pipeline entry in `turbo.json`:

```json
{
  "vscode": {
    "dependsOn": ["@repo/tantrica-core"]
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
    "@repo/tantrica-core": "workspace:*"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "esbuild": "^0.20.0",
    "typescript": "^5.9.0"
  }
}
```

## Web Player Impact

Multi-file `.tantrica` recordings need a small web player update to render file tabs. This is a follow-up task:

- Show file tabs above the Monaco editor
- On `FILE_SWITCH` event, switch the active tab and update Monaco content
- Each tab shows `fileName` from the event
- `files` map in session provides initial content per file

Single-file recordings are unaffected — no changes needed for existing playback.

## Future (Out of Scope)

- **Upload to backend**: API client with Google OAuth browser flow, upload progress
- **Web player multi-file**: File tabs UI in `/r/:id` player
- **Recording settings**: Configurable capture options (what to capture, debounce timing)
- **Annotations**: Timestamped text notes during recording
- **Terminal capture**: Record terminal commands alongside editor events
