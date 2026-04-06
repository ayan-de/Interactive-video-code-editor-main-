# Tantrica Core Package — Design Spec

## Goal

Extract shared recording engine into `packages/tantrica-core` so the web app, API, and future VS Code extension all use the same types, capture engine, playback engine, compression, and .tantrica file format.

## Package Structure

```
packages/tantrica-core/
├── src/
│   ├── types.ts           # All RecordingEvent types, enums, interfaces
│   ├── RecordingManager.ts # Capture engine (moved from apps/web)
│   ├── PlaybackEngine.ts   # Replay engine (moved from apps/web)
│   ├── compression.ts      # Delta encoding, cursor dedup, keystroke batching
│   ├── format.ts           # .tantrica file reader/writer
│   └── index.ts            # Public API barrel export
├── package.json
└── tsconfig.json
```

## What Moves

| Source                                              | Destination                                      |
| --------------------------------------------------- | ------------------------------------------------ |
| `apps/web/app/types/recordings.ts`                  | `packages/tantrica-core/src/types.ts`            |
| `apps/web/app/core/RecordingManager.ts`             | `packages/tantrica-core/src/RecordingManager.ts` |
| `apps/web/app/core/PlaybackEngine.ts`               | `packages/tantrica-core/src/PlaybackEngine.ts`   |
| Inline logic in `apps/api/recordings.controller.ts` | `packages/tantrica-core/src/format.ts`           |

## New Files

### `compression.ts`

Event compression applied at serialization time:

1. **Delta encoding for positions**: Store `[-2, 3]` (delta from previous) instead of `{lineNumber: 15, column: 23}`
2. **Cursor dedup**: Skip cursor events where position unchanged within 50ms
3. **Keystroke batching**: Group rapid keydown events within same 16ms frame
4. **Remove redundant fields**: Omit `altKey: false`, `ctrlKey: false` etc. when false

### `format.ts`

.tantrica binary file reader and writer:

- `TantricaFileWriter.write(session): Buffer` — serializes to TNTC binary format with gzip
- `TantricaFileReader.read(buffer): TantricaFile` — parses TNTC binary, handles both binary and plain JSON
- Magic bytes: `TNTC` (4 bytes)
- Version: uint16 (2 bytes)
- Header length: uint32 (4 bytes)
- JSON header (variable)
- Gzipped event stream

## Design Decisions

1. **No DOM/API dependencies in tantrica-core**: `RecordingManager` only uses `Date.now()` and `uuid`. `PlaybackEngine` currently uses `requestAnimationFrame` — we make the scheduler injectable via constructor option so VS Code can use `setInterval`.

2. **Compression is opt-in**: Applied at format write time, not during capture. In-memory events remain uncompressed for simplicity.

3. **Backward compatible**: Web app imports change from `@/types/recordings` to `@repo/tantrica-core` but all type names remain identical.

4. **API uses format.ts**: The inline .tantrica parse/write code in `recordings.controller.ts` is replaced with `TantricaFileReader.read()` and `TantricaFileWriter.write()`.

## Import Changes

### Web app

| Old import                | New import            |
| ------------------------- | --------------------- |
| `@/types/recordings`      | `@repo/tantrica-core` |
| `@/core/RecordingManager` | `@repo/tantrica-core` |
| `@/core/PlaybackEngine`   | `@repo/tantrica-core` |

### API

| Old                          | New                                             |
| ---------------------------- | ----------------------------------------------- |
| Inline zlib + buffer parsing | `TantricaFileReader` from `@repo/tantrica-core` |
| Inline zlib + buffer writing | `TantricaFileWriter` from `@repo/tantrica-core` |

## Files Changed

### Web app (import updates only):

- `hooks/useRecordings.ts`
- `components/editor/MonacoEditor.tsx`
- `components/viewer/PlaybackViewer.tsx`
- `lib/storage/types.ts`
- `lib/storage/ApiStorageAdapter.ts`
- `lib/storage/IndexedDBStorageAdapter.ts`
- `lib/storage/SmartStorageAdapter.ts`
- `lib/recordingStorage.ts`
- `r/[id]/page.tsx`
- `(studio)/view/page.tsx`

### API:

- `recordings/recordings.controller.ts` — replace inline format logic with package imports

### Deleted:

- `apps/web/app/types/recordings.ts` — moved to package
- `apps/web/app/core/RecordingManager.ts` — moved to package
- `apps/web/app/core/PlaybackEngine.ts` — moved to package

## Scheduler Injection (PlaybackEngine)

```typescript
interface SchedulerOptions {
  requestAnimationFrame?: (cb: (time: number) => void) => number;
  cancelAnimationFrame?: (id: number) => void;
}
```

Browser uses default `window.requestAnimationFrame`. VS Code extension passes `setInterval`/`clearInterval` wrapper.
