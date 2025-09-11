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
}
