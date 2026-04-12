# Interactive Fork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow viewers to pause a recording at any timestamp, fork into editable mode, write their own code, and return to playback. Multiple independent forks per recording, persisted in IndexedDB.

**Architecture:** Mode-switching on the same Monaco instance inside `PlaybackViewer`. Fork is purely a viewer-side feature — no changes to `openscrim-core`. IndexedDB (`openscrim-forks` database) stores fork snapshots. Red dot markers on the timeline indicate fork points.

**Tech Stack:** React 19, Next.js 15, IndexedDB (raw API), Monaco Editor, Lucide React icons, Tailwind CSS v4.

---

## File Structure

| Action | File                                                | Responsibility                            |
| ------ | --------------------------------------------------- | ----------------------------------------- |
| Create | `apps/web/app/lib/forkStorage.ts`                   | IndexedDB CRUD for fork data              |
| Create | `apps/web/app/lib/forkTypes.ts`                     | Fork interface + ViewerMode type          |
| Modify | `apps/web/app/components/viewer/PlaybackViewer.tsx` | Fork mode switching, UI, timeline markers |

---

### Task 1: Fork Types

**Files:**

- Create: `apps/web/app/lib/forkTypes.ts`

- [x] **Step 1: Create the fork types file**

```typescript
export type ViewerMode = 'playback' | 'fork';

export interface Fork {
  id: string;
  recordingId: string;
  timestamp: number;
  content: string;
  language: string;
  cursor: {
    lineNumber: number;
    column: number;
  };
  edits: string;
  createdAt: number;
  updatedAt: number;
}
```

- [x] **Step 2: Verify the file compiles**

Run: `pnpm exec turbo check-types --filter=web`
Expected: PASS (no new errors)

- [x] **Step 3: Commit**

```bash
git add apps/web/app/lib/forkTypes.ts
git commit -m "feat(fork): add Fork type and ViewerMode type"
```

---

### Task 2: Fork Storage (IndexedDB)

**Files:**

- Create: `apps/web/app/lib/forkStorage.ts`

- [x] **Step 1: Create the fork storage module**

```typescript
import { v4 as uuidv4 } from 'uuid';
import type { Fork } from './forkTypes';

const DB_NAME = 'openscrim-forks';
const STORE_NAME = 'forks';
const DB_VERSION = 1;
const MAX_FORKS_PER_RECORDING = 50;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('recordingId', 'recordingId', {
          unique: false,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFork(fork: Fork): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(fork);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getForks(recordingId: string): Promise<Fork[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('recordingId');
    const request = index.getAll(recordingId);
    request.onsuccess = () => {
      resolve(
        (request.result as Fork[]).sort((a, b) => a.timestamp - b.timestamp)
      );
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getFork(id: string): Promise<Fork | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => {
      resolve((request.result as Fork) ?? null);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function updateForkEdits(
  id: string,
  edits: string,
  cursor: { lineNumber: number; column: number }
): Promise<void> {
  const fork = await getFork(id);
  if (!fork) return;
  fork.edits = edits;
  fork.cursor = cursor;
  fork.updatedAt = Date.now();
  await saveFork(fork);
}

export async function deleteFork(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function createFork(params: {
  recordingId: string;
  timestamp: number;
  content: string;
  language: string;
  cursor: { lineNumber: number; column: number };
}): Promise<Fork> {
  const forks = await getForks(params.recordingId);
  if (forks.length >= MAX_FORKS_PER_RECORDING) {
    const oldest = forks[0];
    if (oldest) {
      await deleteFork(oldest.id);
    }
  }

  const now = Date.now();
  const fork: Fork = {
    id: uuidv4(),
    recordingId: params.recordingId,
    timestamp: params.timestamp,
    content: params.content,
    language: params.language,
    cursor: params.cursor,
    edits: params.content,
    createdAt: now,
    updatedAt: now,
  };

  await saveFork(fork);
  return fork;
}
```

- [x] **Step 2: Verify the file compiles**

Run: `pnpm exec turbo check-types --filter=web`
Expected: PASS

- [x] **Step 3: Commit**

```bash
git add apps/web/app/lib/forkStorage.ts
git commit -m "feat(fork): add IndexedDB fork storage with CRUD and auto-limit"
```

---

### Task 3: Fork Mode State + Fork Button in PlaybackViewer

**Files:**

- Modify: `apps/web/app/components/viewer/PlaybackViewer.tsx`

This task adds the fork state variables, loads forks on session load, and adds the Fork button to the controls bar.

- [x] **Step 1: Add imports and fork state to PlaybackViewer**

Add these imports at the top of the file (after existing imports):

```typescript
import { GitBranch } from 'lucide-react';
import type { Fork, ViewerMode } from '@/lib/forkTypes';
import {
  createFork,
  getForks,
  updateForkEdits,
  deleteFork as deleteForkFromStorage,
} from '@/lib/forkStorage';
```

Add these state variables inside the component (after `const [isReady, setIsReady] = useState<boolean>(false);`):

```typescript
const [mode, setMode] = useState<ViewerMode>('playback');
const [activeForkId, setActiveForkId] = useState<string | null>(null);
const [forks, setForks] = useState<Fork[]>([]);
const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const activeForkIdRef = useRef<string | null>(null);
```

Add this ref assignment after the existing `sessionRef.current = session;`:

```typescript
activeForkIdRef.current = activeForkId;
```

- [x] **Step 2: Add fork loading effect and mode reset on session change**

Add this effect after the existing session-loading `useEffect` (the one with `[session]` dependency):

```typescript
useEffect(() => {
  if (session) {
    getForks(session.id).then(setForks).catch(console.error);
  } else {
    setForks([]);
  }
  setMode('playback');
  setActiveForkId(null);
}, [session]);
```

- [x] **Step 3: Add fork creation handler**

Add this handler after `handleTimelineChange`:

```typescript
const handleCreateFork = async () => {
  if (!session || !editorRef.current || mode === 'fork') return;
  const engine = engineRef.current;
  if (!engine) return;

  engine.pause();

  const pos = engine.getPosition();
  const editor = editorRef.current;
  const cursorPos = editor.getPosition();
  const content = editor.getModel()?.getValue() ?? session.initialContent;

  try {
    const fork = await createFork({
      recordingId: session.id,
      timestamp: pos.currentTime,
      content,
      language: session.language,
      cursor: cursorPos
        ? { lineNumber: cursorPos.lineNumber, column: cursorPos.column }
        : { lineNumber: 1, column: 1 },
    });

    setForks((prev) =>
      [...prev, fork].sort((a, b) => a.timestamp - b.timestamp)
    );
    setActiveForkId(fork.id);
    activeForkIdRef.current = fork.id;
    setMode('fork');
    setEditorContent(content);

    editor.updateOptions({ readOnly: false });
  } catch (error) {
    console.error('Failed to create fork:', error);
  }
};
```

- [x] **Step 4: Add auto-save effect for fork edits**

Add this effect after `handleCreateFork`:

```typescript
useEffect(() => {
  if (mode !== 'fork' || !activeForkId || !editorRef.current) return;

  const editor = editorRef.current;
  const disposable = editor.onDidChangeModelContent(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      const currentForkId = activeForkIdRef.current;
      if (!currentForkId || !editorRef.current) return;
      const model = editorRef.current.getModel();
      if (!model) return;
      const cursorPos = editorRef.current.getPosition();
      updateForkEdits(
        currentForkId,
        model.getValue(),
        cursorPos
          ? { lineNumber: cursorPos.lineNumber, column: cursorPos.column }
          : { lineNumber: 1, column: 1 }
      ).catch(console.error);
    }, 2000);
  });

  return () => {
    disposable.dispose();
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
  };
}, [mode, activeForkId]);
```

- [x] **Step 5: Add return-to-playback handler**

Add this handler after the auto-save effect:

```typescript
const handleReturnToPlayback = async () => {
  const forkId = activeForkIdRef.current;
  if (forkId && editorRef.current) {
    const model = editorRef.current.getModel();
    const cursorPos = editorRef.current.getPosition();
    if (model) {
      try {
        await updateForkEdits(
          forkId,
          model.getValue(),
          cursorPos
            ? { lineNumber: cursorPos.lineNumber, column: cursorPos.column }
            : { lineNumber: 1, column: 1 }
        );
      } catch (error) {
        console.error('Failed to save fork edits:', error);
      }
    }
  }

  editorRef.current?.updateOptions({ readOnly: true });
  setMode('playback');
  setActiveForkId(null);
  activeForkIdRef.current = null;

  const engine = engineRef.current;
  if (engine && session) {
    const fork = forks.find((f) => f.id === forkId);
    if (fork) {
      engine.seek(fork.timestamp);
    }
    engine.play();
  }
};
```

- [x] **Step 6: Add re-enter existing fork handler**

```typescript
const handleOpenFork = async (fork: Fork) => {
  if (mode === 'fork') return;

  const engine = engineRef.current;
  if (engine) {
    engine.pause();
  }

  editorRef.current?.updateOptions({ readOnly: false });
  setActiveForkId(fork.id);
  activeForkIdRef.current = fork.id;
  setMode('fork');
  setEditorContent(fork.edits);

  if (editorRef.current) {
    editorRef.current.setPosition({
      lineNumber: fork.cursor.lineNumber,
      column: fork.cursor.column,
    });
  }
};
```

- [x] **Step 7: Add delete fork handler**

```typescript
const handleDeleteFork = async (forkId: string) => {
  try {
    await deleteForkFromStorage(forkId);
    setForks((prev) => prev.filter((f) => f.id !== forkId));
    if (activeForkId === forkId) {
      editorRef.current?.updateOptions({ readOnly: true });
      setMode('playback');
      setActiveForkId(null);
      activeForkIdRef.current = null;
    }
  } catch (error) {
    console.error('Failed to delete fork:', error);
  }
};
```

- [x] **Step 8: Verify the file compiles**

Run: `pnpm exec turbo check-types --filter=web`
Expected: PASS (we haven't wired the handlers to the UI yet, but the logic should compile)

- [x] **Step 9: Commit**

```bash
git add apps/web/app/components/viewer/PlaybackViewer.tsx
git commit -m "feat(fork): add fork state, handlers, and auto-save logic"
```

---

### Task 4: Fork Button + Return-to-Playback Banner UI

**Files:**

- Modify: `apps/web/app/components/viewer/PlaybackViewer.tsx`

- [x] **Step 1: Add the Fork button to playback controls**

In the JSX, inside the controls `<div className="flex items-center gap-4 mb-4">`, after the state indicator `</div>` (the one with `playbackState.toUpperCase()`), add the Fork button:

```tsx
{
  /* Fork button */
}
<div className="flex items-center gap-2">
  <button
    onClick={handleCreateFork}
    disabled={!isReady || mode === 'fork'}
    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors"
    title="Pause and edit code at this point"
  >
    <GitBranch size={14} />
    <span>Fork</span>
  </button>
  {forks.length > 0 && (
    <span className="text-xs text-gray-400">
      {forks.length} fork{forks.length !== 1 ? 's' : ''}
    </span>
  )}
</div>;
```

- [x] **Step 2: Add the Return-to-Playback banner**

In the JSX, between the `{/* Editor */}` comment and the `<div className="flex-1 relative">`, add the fork mode banner:

```tsx
{
  /* Fork mode banner */
}
{
  mode === 'fork' && (
    <div className="flex items-center justify-between px-4 py-2 bg-green-900/30 border-b border-green-700/50">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm text-green-300">
          Editing &bull; Fork at{' '}
          {formatTime(forks.find((f) => f.id === activeForkId)?.timestamp ?? 0)}
        </span>
      </div>
      <button
        onClick={handleReturnToPlayback}
        className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
      >
        Return to Playback
      </button>
    </div>
  );
}
```

- [x] **Step 3: Disable playback controls in fork mode**

Update the play/pause button's `disabled` prop — change `disabled={!isReady}` to `disabled={!isReady || mode === 'fork'}` on both the play/pause button and the stop button.

Update the speed dropdown's `disabled` prop — change `disabled={!isReady}` to `disabled={!isReady || mode === 'fork'}`.

Update the timeline scrubber's `disabled` prop — change `disabled={!isReady}` to `disabled={!isReady || mode === 'fork'}`.

Update the Fork button's `disabled` prop — it should remain `disabled={!isReady || mode === 'fork'}`.

- [x] **Step 4: Update the Editor readOnly option for fork mode**

In the `<Editor>` component's `options` prop, change:

```tsx
readOnly: true,
```

to:

```tsx
readOnly: mode !== 'fork',
```

Also add a visual border indicator. After the `<Editor>` component, before the `) : (` for the loading state, nothing extra needed — we'll use a CSS border approach. Add a className wrapper:

Wrap the existing `<Editor>` with:

```tsx
<div className={mode === 'fork' ? 'h-full border-l-2 border-green-500' : 'h-full'}>
  <Editor ... />
</div>
```

- [x] **Step 5: Verify the file compiles and renders**

Run: `pnpm exec turbo check-types --filter=web`
Expected: PASS

- [x] **Step 6: Commit**

**Files:**

- Modify: `apps/web/app/components/viewer/PlaybackViewer.tsx`

- [ ] **Step 1: Add timeline fork markers**

Replace the timeline scrubber section (the `<div className="flex items-center gap-2">` containing the `<input type="range">`) with this:

```tsx
{
  /* Timeline scrubber with fork markers */
}
<div className="flex items-center gap-2">
  <div className="flex-1 relative">
    <input
      type="range"
      min="0"
      max="100"
      step="0.1"
      value={position.progress * 100}
      onChange={handleTimelineChange}
      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer timeline-slider"
      disabled={!isReady || mode === 'fork'}
    />
    {position.totalTime > 0 &&
      forks.map((fork) => {
        const leftPercent = (fork.timestamp / position.totalTime) * 100;
        return (
          <button
            key={fork.id}
            onClick={() => handleOpenFork(fork)}
            disabled={mode === 'fork'}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border border-gray-900 transition-transform hover:scale-150 ${
              mode === 'fork'
                ? 'bg-gray-500 cursor-not-allowed opacity-50'
                : 'bg-red-500 hover:bg-red-400 cursor-pointer'
            }`}
            style={{ left: `${leftPercent}%` }}
            title={`Fork at ${formatTime(fork.timestamp)}`}
          />
        );
      })}
  </div>
</div>;
```

- [ ] **Step 2: Verify compilation**

Run: `pnpm exec turbo check-types --filter=web`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/components/viewer/PlaybackViewer.tsx
git commit -m "feat(fork): add red dot fork markers on timeline scrubber"
```

---

### Task 6: Fork List Dropdown

**Files:**

- Modify: `apps/web/app/components/viewer/PlaybackViewer.tsx`

- [ ] **Step 1: Add showForkList state and toggle handler**

Add this state alongside the other fork state variables:

```typescript
const [showForkList, setShowForkList] = useState<boolean>(false);
const forkListRef = useRef<HTMLDivElement>(null);
```

Add a click-outside effect to auto-close the dropdown:

```typescript
useEffect(() => {
  if (!showForkList) return;
  const handleClickOutside = (e: MouseEvent) => {
    if (
      forkListRef.current &&
      !forkListRef.current.contains(e.target as Node)
    ) {
      setShowForkList(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [showForkList]);
```

- [ ] **Step 2: Add fork list dropdown UI**

In the playback controls, after the fork count span (`{forks.length > 0 && ...}`), add:

```tsx
{
  /* Fork list dropdown */
}
<div className="relative" ref={forkListRef}>
  {forks.length > 0 && (
    <button
      onClick={() => setShowForkList(!showForkList)}
      disabled={mode === 'fork'}
      className="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
    >
      {showForkList ? 'Hide' : 'List'}
    </button>
  )}
  {showForkList && (
    <div className="absolute top-full mt-2 right-0 w-72 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
      {forks.length === 0 ? (
        <div className="p-4 text-sm text-gray-400 text-center">
          No forks yet — click Fork to start editing
        </div>
      ) : (
        forks.map((fork, idx) => (
          <div
            key={fork.id}
            className="flex items-center justify-between px-3 py-2 hover:bg-gray-700 border-b border-gray-700 last:border-b-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <span className="text-sm text-white truncate">
                Fork #{idx + 1}
              </span>
              <span className="text-xs text-gray-400">
                {formatTime(fork.timestamp)}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => {
                  handleOpenFork(fork);
                  setShowForkList(false);
                }}
                disabled={mode === 'fork'}
                className="px-2 py-0.5 text-xs bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
              >
                Open
              </button>
              <button
                onClick={() => handleDeleteFork(fork.id)}
                className="px-2 py-0.5 text-xs bg-red-600 hover:bg-red-700 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )}
</div>;
```

- [ ] **Step 3: Verify compilation**

Run: `pnpm exec turbo check-types --filter=web`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/components/viewer/PlaybackViewer.tsx
git commit -m "feat(fork): add fork list dropdown with open/delete actions"
```

---

### Task 7: Final Polish + Lint + Type-Check

**Files:**

- Modify: `apps/web/app/components/viewer/PlaybackViewer.tsx` (cleanup)

- [ ] **Step 1: Run lint and fix any issues**

Run: `pnpm exec turbo lint --filter=web`
Expected: PASS (no warnings treated as errors)

If lint fails, fix the reported issues.

- [ ] **Step 2: Run type-check**

Run: `pnpm exec turbo check-types --filter=web`
Expected: PASS

- [ ] **Step 3: Run format**

Run: `pnpm format`

- [ ] **Step 4: Commit any formatting/lint fixes**

```bash
git add -A
git commit -m "chore(fork): lint and format fixes"
```

---

## Self-Review

### Spec Coverage

| Requirement                             | Task                           |
| --------------------------------------- | ------------------------------ |
| Fork types (`Fork`, `ViewerMode`)       | Task 1                         |
| IndexedDB CRUD for forks                | Task 2                         |
| Fork button in playback controls        | Task 4                         |
| Mode switching (playback ↔ fork)       | Task 3 (handlers), Task 4 (UI) |
| Auto-save fork edits (2s debounce)      | Task 3                         |
| Return-to-Playback banner               | Task 4                         |
| Timeline fork markers (red dots)        | Task 5                         |
| Fork list dropdown with open/delete     | Task 6                         |
| Load existing forks on session load     | Task 3                         |
| Fork limit (max 50, auto-delete oldest) | Task 2                         |
| Monaco readOnly switching               | Task 4                         |

### Placeholder Scan

No TBD, TODO, or placeholder patterns found.

### Type Consistency

- `Fork` interface defined in Task 1 (`forkTypes.ts`), used consistently in Tasks 2-6.
- `ViewerMode` type defined in Task 1, used in Task 3 state.
- All handler parameter types match the `Fork` interface fields.
- `formatTime` function signature unchanged from existing code.
