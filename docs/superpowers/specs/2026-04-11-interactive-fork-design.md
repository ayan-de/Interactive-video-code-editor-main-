# Interactive Fork — Design Spec

## Goal

Allow viewers to pause a code recording at any timestamp, switch the Monaco editor to
editable mode, write their own code, and return to playback. Multiple independent forks
per recording. Viewer-side only — no backend or core package changes needed.

## Use Case

Teaching/tutorials — a student watching a recording pauses, tries their own approach at
that point in the code, then resumes watching. They can revisit their forks later.

## Phasing

- **Phase 3.1a — Web player** (this spec): Fork feature in `PlaybackViewer` on the web app
- **Phase 3.1b — VS Code extension** (follow-up): Fork in VS Code's recording playback webview.
  Uses the same data model and IndexedDB via the extension's webview storage.

## Scope

| In scope                                         | Out of scope (follow-up)           |
| ------------------------------------------------ | ---------------------------------- |
| Inline fork button on playback controls          | Sharing forks with others          |
| Mode switching (playback ↔ fork) on same Monaco | Split view / side-by-side editor   |
| Multiple independent forks per recording         | Fork as branch tree (branching)    |
| Fork persistence in IndexedDB                    | Fork export as new recording       |
| Timeline fork markers                            | Multi-file fork snapshots          |
| Auto-save fork edits                             | Fork diff view (original vs edits) |
| Fork list dropdown with open/delete actions      |                                    |

## Decisions

- **Architecture**: Mode-switching on same Monaco instance (Approach A)
- **Storage**: IndexedDB (`openscrim-forks` database)
- **Forks per recording**: Multiple independent forks (flat list, max 50)
- **Sharing**: Private only — forks are viewer-side, no backend sync
- **Core package**: No changes to `openscrim-core` — fork is purely a viewer feature

## Data Model

```typescript
interface Fork {
  id: string; // uuid
  recordingId: string; // which recording this fork belongs to
  timestamp: number; // ms into recording when fork was created
  content: string; // snapshot of Monaco content at fork time
  language: string; // language at fork time
  cursor: {
    lineNumber: number;
    column: number;
  };
  edits: string; // current state of user's edited content
  createdAt: number; // Date.now() when fork was created
  updatedAt: number; // Date.now() when edits were last saved
}
```

## Storage — `forkStorage.ts`

New file at `apps/web/app/lib/forkStorage.ts`.

- **Database**: `openscrim-forks`
- **Object store**: `forks`, keyed by `id`
- **Index**: `recordingId` for querying all forks for a recording

### API

```typescript
saveFork(fork: Fork): Promise<void>
getForks(recordingId: string): Promise<Fork[]>
getFork(id: string): Promise<Fork | null>
updateForkEdits(id: string, edits: string, cursor: { lineNumber: number; column: number }): Promise<void>
deleteFork(id: string): Promise<void>
```

### Auto-save

While in fork mode, debounce-save `edits` to IndexedDB every 2 seconds via
`editor.onDidChangeModelContent` listener.

### Limits

- Max 50 forks per recording
- If exceeded, oldest fork (by `createdAt`) is auto-deleted

## PlaybackViewer Mode Switching

### New state

```typescript
type ViewerMode = 'playback' | 'fork';

// Added to PlaybackViewer component state:
mode: ViewerMode;              // 'playback' by default
activeForkId: string | null;   // which fork is currently open
forks: Fork[];                 // all forks for this recording
```

### Fork flow

```
1. User clicks "Fork" button
   → Engine.pause()
   → Snapshot: content, cursor, timestamp, language from current state
   → Create Fork object, saveFork() to IndexedDB
   → Set mode = 'fork', activeForkId = fork.id
   → Switch Monaco to readOnly: false
   → Show "Return to Playback" banner
   → Show fork mode indicator ("Editing • Fork #3 at 1:23")

2. User edits code
   → Monaco is editable
   → Auto-save edits every 2s (debounced)
   → Timeline markers visible but grayed out
   → Playback controls disabled

3. User clicks "Return to Playback"
   → Final save of edits to IndexedDB
   → Switch Monaco to readOnly: true
   → Set mode = 'playback', activeForkId = null
   → Engine.seek(fork.timestamp)
   → Engine.play()
   → Fork marker appears on timeline
```

### Re-entering an existing fork

```
1. User clicks fork marker on timeline
   → Engine.pause()
   → Load fork from IndexedDB
   → Set editor content to fork.edits (user's edited version)
   → Restore cursor to last saved position (from fork.cursor or end of edits)
   → Switch Monaco to readOnly: false
   → Set mode = 'fork', activeForkId = fork.id
   → Show "Return to Playback" banner
```

### Monaco editor behavior per mode

| Property       | Playback mode | Fork mode                   |
| -------------- | ------------- | --------------------------- |
| `readOnly`     | `true`        | `false`                     |
| Content source | Engine events | Fork edits                  |
| Cursor control | Engine drives | User drives                 |
| Visual cue     | Default       | Green left border on editor |

## UI Components

### Fork button

- Location: playback controls bar, between speed dropdown and time display
- Icon: code/branch icon (Lucide `GitBranch` or `Code2`)
- Label: "Fork"
- Tooltip: "Pause and edit code at this point"
- Disabled when: already in fork mode, or no session loaded
- Always visible (not hover-dependent)

### Return to Playback banner

- Location: thin banner at top of the editor area
- Left side: green dot + "Fork #3 • Paused at 1:23"
- Right side: "Return to Playback" button (primary action)
- Background: subtle green-tinted bar
- Non-dismissable — must click "Return to Playback" to exit

### Timeline fork markers

- Small colored dots on the timeline scrubber
- Color: green
- Position: proportional to `fork.timestamp / totalTime`
- Hover tooltip: "Fork #1 — 1:23" + first line preview of edited content
- Clickable — enters that fork's edit mode
- Grayed out / non-interactive while already in fork mode
- Close timestamps: stack dots with count badge

### Fork list dropdown

- Trigger: small counter badge next to fork button (e.g. "3 forks")
- Content: list of all forks for this recording:
  - Timestamp (e.g. "1:23")
  - Created time (e.g. "2 hours ago")
  - "Open" button (enters fork mode)
  - "Delete" button (removes fork with confirmation)
- Empty state: "No forks yet — click Fork to start editing"

### Playback controls in fork mode

- Play/Pause/Stop buttons: disabled
- Speed dropdown: disabled
- Timeline scrubber: disabled (grayed out)
- Only "Return to Playback" banner is interactive

## Audio Interaction

When audio recording is present (from audio feature):

- Enter fork mode → audio pauses (via `PlaybackSync.pause()`)
- While in fork mode → audio stays paused
- Return to playback → audio resumes from fork timestamp
  (via `PlaybackSync.seek()` + `play()`)

## Multi-file Extension (Future)

When multi-file support is added (FILE_SWITCH events), extend the Fork type:

```typescript
interface Fork {
  // ... existing fields ...
  filePath: string; // which file was active at fork time
  files?: Record<string, string>; // all tracked files' content at fork time
}
```

For single-file (initial implementation), only `content` and `edits` are used.

## No openscrim-core Changes

Fork is entirely a viewer-side feature. The existing `PlaybackEngine` API already supports:

- `pause()` — pause playback
- `seek(timeMs)` — jump to fork timestamp
- `getPosition()` — get current timestamp for fork creation
- `addEventHandler()` — listen for state changes

No new types, methods, or changes needed in the core package.

## Pre-requisite Checklist

- [ ] Create `apps/web/app/lib/forkStorage.ts` with IndexedDB CRUD
- [ ] Add `ViewerMode` type and fork state to `PlaybackViewer`
- [ ] Add Fork button to playback controls
- [ ] Implement mode-switching logic (playback → fork → playback)
- [ ] Implement auto-save of fork edits (2s debounce)
- [ ] Add "Return to Playback" banner component
- [ ] Add timeline fork markers rendering
- [ ] Add fork list dropdown with open/delete actions
- [ ] Load existing forks on session load (for markers)
- [ ] Handle fork limit (max 50, auto-delete oldest)
