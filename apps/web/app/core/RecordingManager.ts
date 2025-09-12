import { v4 as uuidv4 } from 'uuid';
import {
  RecordingEvent,
  RecordingEventType,
  RecordingSession,
  RecordingSessionState,
  RecordingState,
  RecordingConfig,
  DEFAULT_RECORDING_CONFIG,
  KeystrokeEvent,
  CursorPositionEvent,
  SelectionChangeEvent,
  ContentChangeEvent,
  Position,
  Selection,
  Range,
} from '@/types/recordings';

export class RecordingManger {
  private events: RecordingEvent[] = [];
  private sessionState: RecordingSessionState;
  private config: RecordingConfig;
  private eventBuffer: RecordingEvent[] = [];
  private lastEventTime: number = 0;

  constructor(config: Partial<RecordingConfig> = {}) {
    this.config = { ...DEFAULT_RECORDING_CONFIG, ...config };
    this.sessionState = {
      sessionId: null,
      state: RecordingState.IDLE,
      startTime: null,
      pausedTime: 0,
      currentDuration: 0,
      eventCount: 0,
      lastEventTimestamp: null,
    };
  }

  startRecording(sessionTitle: string = 'Untile session'): string {
    if (this.sessionState.state === RecordingState.RECORDING) {
      throw new Error('Recording already in Progress');
    }
    const sessionId = uuidv4();
    const now = Date.now();

    this.sessionState = {
      sessionId,
      sessionTitle,
      state: RecordingState.RECORDING,
      startTime: now,
      pausedTime: 0,
      currentDuration: 0,
      eventCount: 0,
      lastEventTimestamp: now,
    };

    this.events = [];
    //When eventBuffer reaches a certain size (e.g. 100), it is flushed into events.
    this.eventBuffer = [];

    this.addEvent({
      id: uuidv4(),
      type: RecordingEventType.RECORDING_START,
      timestamp: now,
      sessionId,
    });

    return sessionId;
  }

  pauseRecording(): void {
    if (this.sessionState.state !== RecordingState.RECORDING) {
      throw new Error('No active recording to pause');
    }

    const now = Date.now();
    this.sessionState.state = RecordingState.PAUSED;

    if (this.sessionState.startTime) {
      this.sessionState.currentDuration +=
        now - this.sessionState.startTime - this.sessionState.pausedTime;
    }

    this.addEvent({
      id: uuidv4(),
      type: RecordingEventType.RECORDING_PAUSE,
      timestamp: now,
      sessionId: this.sessionState.sessionId!,
    });
  }

  resumeRecording(): void {
    if (this.sessionState.state !== RecordingState.PAUSED) {
      throw new Error('No pause recording to resume');
    }
    const now = Date.now();
    this.sessionState.state = RecordingState.RECORDING;
    this.sessionState.pausedTime = now - (this.sessionState.startTime || now);

    this.addEvent({
      id: uuidv4(),
      type: RecordingEventType.RECORDING_RESUME,
      timestamp: now,
      sessionId: this.sessionState.sessionId!,
    });
  }

  stopRecording(
    sessionTitle: string = 'Untile session',
    description: string = 'Provide a description',
    finalContent: string = '',
    initialContent: string = ''
  ): RecordingSession | null {
    if (this.sessionState.state === RecordingState.IDLE) {
      throw new Error('No recording to stop');
    }

    const now = Date.now();
    let finalDuration = this.sessionState.currentDuration;

    if (
      this.sessionState.state === RecordingState.RECORDING &&
      this.sessionState.startTime
    ) {
      finalDuration +=
        now - this.sessionState.startTime - this.sessionState.pausedTime;
    }

    this.addEvent({
      id: uuidv4(),
      type: RecordingEventType.RECORDING_STOP,
      timestamp: now,
      sessionId: this.sessionState.sessionId!,
    });

    // Flushing any remaining events
    this.flushEventBuffer();

    const session: RecordingSession = {
      id: this.sessionState.sessionId!,
      title: sessionTitle,
      description: description,
      language: 'javascript', // This should be detected
      initialContent,
      finalContent,
      duration: finalDuration,
      events: [...this.events],
      createdAt: new Date(this.sessionState.startTime!),
      updatedAt: new Date(now),
      metadata: {},
    };

    // Reset state
    this.sessionState = {
      sessionId: null,
      state: RecordingState.IDLE,
      startTime: null,
      pausedTime: 0,
      currentDuration: 0,
      eventCount: 0,
      lastEventTimestamp: null,
    };

    this.events = [];
    this.eventBuffer = [];

    return session;
  }

  recordKeystoke(
    key: string,
    position: Position,
    modifiers: {
      altKey: boolean;
      ctrlKey: boolean;
      metaKey: boolean;
      shiftKey: boolean;
    }
  ): void {
    if (!this.isRecording() || !this.config.captureKeystrokes) return;

    const event: KeystrokeEvent = {
      id: uuidv4(),
      type: RecordingEventType.KEYSTROKE,
      timestamp: Date.now(),
      sessionId: this.sessionState.sessionId!,
      key,
      position,
      ...modifiers,
    };

    this.addEvent(event);
  }

  // Record cursor position change
  recordCursorPosition(position: Position, previousPosition?: Position): void {
    if (!this.isRecording() || !this.config.captureCursorMovement) return;

    // Debounce rapid cursor movements
    const now = Date.now();
    if (now - this.lastEventTime < this.config.debounceDelay) {
      return;
    }

    const event: CursorPositionEvent = {
      id: uuidv4(),
      type: RecordingEventType.CURSOR_POSITION,
      timestamp: now,
      sessionId: this.sessionState.sessionId!,
      position,
      previousPosition,
    };

    this.addEvent(event);
    this.lastEventTime = now;
  }

  // Record selection change
  recordSelectionChange(
    selection: Selection,
    previousSelection?: Selection
  ): void {
    if (!this.isRecording() || !this.config.captureSelections) return;

    const event: SelectionChangeEvent = {
      id: uuidv4(),
      type: RecordingEventType.SELECTION_CHANGE,
      timestamp: Date.now(),
      sessionId: this.sessionState.sessionId!,
      selection,
      previousSelection,
    };

    this.addEvent(event);
  }

  private addEvent(event: RecordingEvent): void {
    this.sessionState.eventCount++;
    this.sessionState.lastEventTimestamp = event.timestamp;

    if (this.config.compressionEnabled) {
      this.eventBuffer.push(event);

      if (this.eventBuffer.length >= 100) {
        this.flushEventBuffer();
      } else {
        this.events.push(event);
      }

      // Prevent memory overflow
      if (this.events.length > this.config.maxEventBufferSize) {
        this.events.shift(); // Remove oldest event
      }
    }
  }

  // Flush buffered events to main events array
  private flushEventBuffer(): void {
    this.events.push(...this.eventBuffer);
    this.eventBuffer = [];
  }

  // Check if currently recording
  isRecording(): boolean {
    return this.sessionState.state === RecordingState.RECORDING;
  }

  // Check if recording is paused
  isPaused(): boolean {
    return this.sessionState.state === RecordingState.PAUSED;
  }

  // Get current recording state
  getRecordingState(): RecordingSessionState {
    return { ...this.sessionState };
  }

  // Get current event count
  getEventCount(): number {
    return this.sessionState.eventCount;
  }

  // Get current recording duration
  getCurrentDuration(): number {
    if (
      this.sessionState.state === RecordingState.RECORDING &&
      this.sessionState.startTime
    ) {
      const now = Date.now();
      return (
        this.sessionState.currentDuration +
        (now - this.sessionState.startTime - this.sessionState.pausedTime)
      );
    }
    return this.sessionState.currentDuration;
  }

  // Update recording configuration
  updateConfig(newConfig: Partial<RecordingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): RecordingConfig {
    return { ...this.config };
  }
}
