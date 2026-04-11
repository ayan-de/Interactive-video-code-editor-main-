# Audio Recording — Design Spec

## Goal

Add voice narration recording to the VS Code extension using FFmpeg. Audio is captured
alongside code events and exported as a sidecar `.mp3` file next to the `.tantrica` file.
The web player synchronizes audio playback with code replay. Designed to support future
video recording without re-architecting.

## Use Case

Teaching/tutorials — an instructor narrates while coding. Viewers hear voice alongside
code playback in the web player.

## Scope

| In scope                                      | Out of scope (follow-up)      |
| --------------------------------------------- | ----------------------------- |
| Microphone audio capture via FFmpeg           | Video/screen capture          |
| MP3 sidecar file export                       | Waveform visualization        |
| Audio metadata in `openscrim-core` types      | Cloud audio hosting (S3, Mux) |
| Web player audio sync (play/pause/seek/speed) | Multi-track audio             |
| Audio toggle in extension sidebar             | Audio editing/trimming        |
| FFmpeg detection + graceful degradation       | Recording device selection UI |

## Decisions

- **Capture method**: FFmpeg child process (Approach A)
- **Audio format**: MP3 via `libmp3lame`, 128kbps, 44100Hz, mono
- **Storage**: Sidecar file (`<basename>.mp3`) next to `.tantrica` file
- **Sync strategy**: Start-aligned — both audio and code events begin at t=0
- **Core types**: Media-format-agnostic `AudioTrack` type, extensible for future video

## Architecture

Three components:

1. **AudioRecorder** (`apps/vscode/src/audio/AudioRecorder.ts`) — spawns and manages
   the FFmpeg child process. Detects FFmpeg at startup. Records mic input to a temp
   `.mp3` file. Provides start/stop/pause/resume lifecycle.

2. **Audio metadata in `openscrim-core`** — `AudioTrack` type with filename, duration,
   format, mimeType. Added to `RecordingSession` and `TantricaFile` as optional `audio`
   field.

3. **Web player PlaybackSync** — controller that owns both `PlaybackEngine` and an
   HTML5 `<audio>` element, keeping them synchronized.

## Sidecar Convention

```
my-recording.tantrica   ← code events + audio metadata
my-recording.mp3        ← audio sidecar (same directory, same basename)
```

The `TantricaFile.audio.fileName` stores the basename (e.g. `"my-recording.mp3"`).
On import, the web player resolves the sidecar path relative to the `.tantrica` file.

## AudioRecorder — FFmpeg Integration

### FFmpeg Detection

On extension activation:

1. Run `ffmpeg -version` via `child_process.execFileSync`
2. Cache availability in extension global state
3. If not found, audio toggle is disabled in sidebar with message:
   "Install FFmpeg to enable audio recording"
4. Recording works without audio — no hard blocker

### Recording Flow

```
1. User enables audio toggle in sidebar before starting

2. Start Recording:
   → AudioRecorder.start(tempDir)
   → Detect OS via process.platform
   → Spawn ffmpeg with platform-specific input flags
   → ffmpeg writes to temp file continuously

3. Pause Recording:
   → Send SIGSTOP to ffmpeg process (pause without closing file)

4. Resume Recording:
   → Send SIGCONT to ffmpeg process

5. Stop Recording:
   → Send SIGTERM to ffmpeg
   → Wait for graceful exit (max 5s, then SIGKILL)
   → Temp file is the finished .mp3
   → AudioRecorder returns { tempPath, duration }
```

### Cross-Platform FFmpeg Flags

| OS      | Input flags                   | Default device     |
| ------- | ----------------------------- | ------------------ |
| Linux   | `-f pulse -i default`         | PulseAudio default |
| macOS   | `-f avfoundation -i ":0"`     | Built-in mic       |
| Windows | `-f dshow -i audio="default"` | Default mic        |

Full command template:

```
ffmpeg <input-flags> -acodec libmp3lame -ab 128k -ar 44100 -ac 1 -y <tempFile>.mp3
```

### Pause/Resume — Cross-Platform Handling

SIGSTOP/SIGCONT are Unix-only. On Windows:

- **Pause**: Write to a temp `.mp3`, on pause kill ffmpeg, on resume spawn new ffmpeg
  process that appends to the same file (using `-y` and seeking to existing duration).
- Alternative: use `child_process.stdin.write('q')` to gracefully stop ffmpeg on pause,
  then re-spawn on resume and concatenate segments with ffmpeg during finalization.

Decision: On Windows, pause stops the ffmpeg process and resume spawns a new one.
On stop, all segments are concatenated into a single `.mp3` using ffmpeg concat demuxer.
On Unix (macOS/Linux), SIGSTOP/SIGCONT is used for seamless pause/resume.

### Error Handling

| Error                   | Behavior                                                     |
| ----------------------- | ------------------------------------------------------------ |
| ffmpeg exits early      | Detect via `exit` event, notify user, continue without audio |
| Permission denied       | Show "Microphone access denied" message                      |
| No audio device found   | Show warning, disable audio for this session                 |
| ffmpeg not on PATH      | Audio toggle disabled, recording works normally              |
| Temp file write failure | Show error, export `.tantrica` without audio                 |

### Duration Detection

After recording stops, get audio duration:

1. Run `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 <tempFile>.mp3`
2. Parse output as seconds, convert to milliseconds
3. Store in `AudioTrack.duration`

## Type Changes to `@repo/openscrim-core`

### New types in `types.ts`

```typescript
export interface AudioTrack {
  fileName: string; // basename of sidecar file (e.g. "my-session.mp3")
  duration: number; // milliseconds
  format: 'mp3'; // extensible for future: 'webm', 'wav', etc.
  mimeType: 'audio/mpeg';
  sampleRate: number; // e.g. 44100
  channels: number; // 1 = mono, 2 = stereo
}
```

### Additions to existing types

```typescript
// RecordingSession — add optional field:
audio?: AudioTrack;

// TantricaFile (format.ts) — add optional field:
audio?: AudioTrack;
```

### Format updates in `format.ts`

- `sessionToTantricaFile()` — copy `session.audio` into `TantricaFile.audio` when present
- `tantricaFileToSession()` — restore `audio` field from file

### Export from `index.ts`

```typescript
export type { AudioTrack } from './types.js';
```

### Backward compatibility

- Recordings without `audio` field work exactly as before
- `TantricaFile.audio` is optional — old `.tantrica` files parse correctly
- Web player hides audio controls when no audio sidecar is found

## Export Flow Update

1. User clicks "Export .tantrica" in sidebar
2. Save dialog picks location (e.g. `~/Desktop/my-recording.tantrica`)
3. Build `RecordingSession` with `audio` field pointing to sidecar basename
4. Write `.tantrica` file via `writeTantricaBuffer()`
5. If audio was recorded:
   a. Copy temp `.mp3` to `~/Desktop/my-recording.mp3` (same base name, same directory)
   b. If copy fails, show warning: "Audio export failed" but keep the `.tantrica` file
6. Success notification: "Recording exported with audio"

## Web Player — PlaybackSync

### Controller

New `PlaybackSync` class in `apps/web`:

```
PlaybackSync
├── playbackEngine: PlaybackEngine
├── audioElement: HTMLAudioElement
├── state: 'playing' | 'paused' | 'idle'
│
├── play()      → audio.play() + playbackEngine.play()
├── pause()     → audio.pause() + playbackEngine.pause()
├── seek(ms)    → audio.currentTime = ms/1000 + playbackEngine.seek(ms)
├── setSpeed(r) → audio.playbackRate = r + playbackEngine.setSpeed(r)
├── setVolume(v)→ audio.volume = v
├── mute()      → audio.muted = true
├── unmute()    → audio.muted = false
│
└── onEnded()   → fires when both audio and code events have finished
```

### Sync Strategy

Start-aligned. Both audio and code events begin at t=0. Duration is
`max(audio.duration, lastEventTimestamp)`. No real-time clock sync needed —
both run on their own clocks from the same origin.

### UI Changes

- Audio player bar below the code editor
- Controls: play/pause button, seek bar, current time / total time, volume slider, mute toggle, speed selector
- If no audio sidecar found, audio bar is hidden entirely
- Seek bar scrubbing updates both audio position and code state

### Edge Cases

| Case                          | Behavior                                          |
| ----------------------------- | ------------------------------------------------- |
| Recording shorter than audio  | Audio continues, code stays at final state        |
| Audio shorter than recording  | Code continues, audio stays ended                 |
| Pause during playback         | Both pause at same timestamp                      |
| Resume after pause            | Both resume from paused position                  |
| Speed change                  | `audio.playbackRate` + engine speed both update   |
| Seek                          | Both audio.currentTime and engine position update |
| Audio sidecar missing on load | Audio bar hidden, playback works without audio    |

## Extension Structure Update

```
apps/vscode/
├── src/
│   ├── audio/
│   │   ├── AudioRecorder.ts      # FFmpeg child process manager
│   │   └── platform.ts           # OS-specific ffmpeg flags
│   ├── recording/
│   │   ├── VSCodeEventCapture.ts
│   │   ├── VSCodeRecordingManager.ts  # Updated: owns AudioRecorder
│   │   └── FileTracker.ts
│   ├── ...
```

### VSCodeRecordingManager Updates

- New `audioEnabled: boolean` option (set from sidebar toggle)
- On `start()`: if audio enabled, calls `AudioRecorder.start(tempDir)`
- On `pause()`: calls `AudioRecorder.pause()`
- On `resume()`: calls `AudioRecorder.resume()`
- On `stop()`:
  - Calls `AudioRecorder.stop()` → gets `{ tempPath, duration }`
  - Builds `AudioTrack` metadata with duration, fileName, format
  - Includes `audio` in `RecordingSession`
- Exposes `audioAvailable: boolean` (FFmpeg detected) for sidebar to check

### Sidebar Webview Updates

New UI elements in the idle state:

- Audio toggle switch (enabled only if FFmpeg detected)
- If FFmpeg not found: toggle is disabled with tooltip "Install FFmpeg to enable audio"
- Label: "Record microphone audio"

During recording state:

- Audio indicator icon (microphone with pulse animation) next to duration timer
- If audio recording fails mid-session, show warning banner

## Pre-requisite Checklist

These `openscrim-core` changes must land before the audio feature:

- [ ] Add `AudioTrack` interface to `types.ts`
- [ ] Add `audio?: AudioTrack` to `RecordingSession` in `types.ts`
- [ ] Add `audio?: AudioTrack` to `TantricaFile` in `format.ts`
- [ ] Update `sessionToTantricaFile()` to include `audio` when present
- [ ] Update `tantricaFileToSession()` to restore `audio`
- [ ] Export `AudioTrack` from `index.ts`
- [ ] Build + type-check passes

## Future: Video Recording

The `AudioTrack` type is designed to be generalized into a `MediaTrack` type:

```typescript
export interface MediaTrack {
  fileName: string;
  duration: number;
  format: string;
  mimeType: string;
  kind: 'audio' | 'video' | 'screen';
  sampleRate?: number;    // audio only
  channels?: number;      // audio only
  width?: number;         // video only
  height?: number;        // video only
  frameRate?: number;     // video only
}

// RecordingSession:
media?: MediaTrack[];     // replaces audio?: AudioTrack
```

This is a follow-up. The current `AudioTrack` type works as-is and can migrate
to `MediaTrack[]` when video is added.
