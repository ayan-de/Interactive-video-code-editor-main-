export type {
  Position,
  Range,
  Selection,
  BaseRecordingEvent,
  KeystrokeEvent,
  CursorPositionEvent,
  SelectionChangeEvent,
  ContentChangeEvent,
  EditorFocusEvent,
  EditorBlurEvent,
  LanguageChangeEvent,
  RecordingControlEvent,
  RecordingEvent,
  RecordingSession,
  RecordingSessionState,
  RecordingConfig,
} from './types';

export {
  RecordingEventType,
  RecordingState,
  DEFAULT_RECORDING_CONFIG,
} from './types';

export { RecordingManager } from './RecordingManager';

export { PlaybackEngine, PlaybackState } from './PlaybackEngine';

export type {
  PlaybackPosition,
  PlaybackOptions,
  PlaybackEventHandler,
  SchedulerOptions,
} from './PlaybackEngine';

export { compressEvents, decompressEvents } from './compression';

export type { TantricaFile } from './format';

export {
  sessionToTantricaFile,
  tantricaFileToSession,
  writeTantricaBuffer,
  readTantricaBuffer,
} from './format';
