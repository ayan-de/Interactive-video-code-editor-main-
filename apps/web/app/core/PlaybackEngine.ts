import {
  RecordingEvent,
  RecordingEventType,
  RecordingSession,
  ContentChangeEvent,
  CursorPositionEvent,
  SelectionChangeEvent,
  KeystrokeEvent,
  LanguageChangeEvent,
  EditorFocusEvent,
  EditorBlurEvent,
  RecordingControlEvent,
  Position,
  Range,
  Selection,
} from '@/types/recordings';

export enum PlaybackState {
  IDLE = 'idle',
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  SEEKING = 'seeking',
}

export interface PlaybackPosition {
  currentTime: number;
  totalTime: number;
  currentEventIndex: number;
  progress: number; // 0-1
}

export interface PlaybackOptions {
  speed: number; // 0.5x, 1x, 2x etc
  skipPauses: boolean;
  autoLoop: boolean;
}

export type PlaybackEventHandler = (event: {
  type: 'stateChange' | 'positionUpdate' | 'eventProcessed' | 'error';
  data: any;
}) => void;

export class PlaybackEngine {
  private session: RecordingSession | null = null;
  private state: PlaybackState = PlaybackState.IDLE;
  private position: PlaybackPosition = {
    currentTime: 0,
    totalTime: 0,
    currentEventIndex: 0,
    progress: 0,
  };
  private options: PlaybackOptions = {
    speed: 1,
    skipPauses: false,
    autoLoop: false,
  };

  private eventHandlers: Set<PlaybackEventHandler> = new Set();
  private playbackTimer: NodeJS.Timeout | null = null;
  private lastUpdateTime: number = 0;
  private startTime: number = 0;

  constructor() {
    this.reset();
  }

  // Event handler management
  public addEventHandler(handler: PlaybackEventHandler): void {
    this.eventHandlers.add(handler);
  }

  public removeEventHandler(handler: PlaybackEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  private emit(
    type: 'stateChange' | 'positionUpdate' | 'eventProcessed' | 'error',
    data: any
  ): void {
    this.eventHandlers.forEach((handler) => {
      try {
        handler({ type, data });
      } catch (error) {
        console.error('Error in playback event handler:', error);
      }
    });
  }

  // Session management
  public loadSession(session: RecordingSession): void {
    this.stop();
    this.session = session;

    if (session.events.length > 0) {
      const firstEvent = session.events[0];
      const lastEvent = session.events[session.events.length - 1];
      if (firstEvent && lastEvent) {
        this.position.totalTime = lastEvent.timestamp - firstEvent.timestamp;
      } else {
        this.position.totalTime = session.duration;
      }
    } else {
      this.position.totalTime = session.duration;
    }

    this.reset();
    this.emit('stateChange', { state: this.state, session });
  }

  public getSession(): RecordingSession | null {
    return this.session;
  }

  // Playback controls
  public play(): void {
    if (!this.session || this.session.events.length === 0) {
      this.emit('error', { message: 'No session loaded or session is empty' });
      return;
    }

    if (this.state === PlaybackState.PLAYING) {
      return;
    }

    if (this.position.currentEventIndex >= this.session.events.length) {
      // At the end, restart from beginning
      this.seek(0);
    }

    this.state = PlaybackState.PLAYING;
    this.startTime =
      Date.now() - this.position.currentTime / this.options.speed;

    this.startPlaybackLoop();
    this.emit('stateChange', { state: this.state });
  }

  public pause(): void {
    if (this.state !== PlaybackState.PLAYING) {
      return;
    }

    this.state = PlaybackState.PAUSED;
    this.stopPlaybackLoop();
    this.emit('stateChange', { state: this.state });
  }

  public stop(): void {
    if (this.state === PlaybackState.IDLE) {
      return;
    }

    this.state = PlaybackState.STOPPED;
    this.stopPlaybackLoop();
    this.seek(0);
    this.emit('stateChange', { state: this.state });
  }

  public seek(timeMs: number): void {
    if (!this.session) {
      return;
    }

    const wasPlaying = this.state === PlaybackState.PLAYING;
    if (wasPlaying) {
      this.stopPlaybackLoop();
    }

    this.state = PlaybackState.SEEKING;

    // Clamp time to valid range
    timeMs = Math.max(0, Math.min(timeMs, this.position.totalTime));

    // Find the event index for this time
    const firstEvent =
      this.session.events.length > 0 ? this.session.events[0] : null;
    const firstEventTime = firstEvent ? firstEvent.timestamp : 0;
    const targetTime = firstEventTime + timeMs;

    let eventIndex = 0;
    for (let i = 0; i < this.session.events.length; i++) {
      const event = this.session.events[i];
      if (event && event.timestamp <= targetTime) {
        eventIndex = i;
      } else {
        break;
      }
    }

    this.position.currentTime = timeMs;
    this.position.currentEventIndex = eventIndex;
    this.position.progress =
      this.position.totalTime > 0 ? timeMs / this.position.totalTime : 0;

    // Apply all events up to the current position
    this.applyEventsUpToIndex(eventIndex);

    this.emit('positionUpdate', { ...this.position });

    if (wasPlaying) {
      this.state = PlaybackState.PLAYING;
      this.startTime =
        Date.now() - this.position.currentTime / this.options.speed;
      this.startPlaybackLoop();
    } else {
      this.state = PlaybackState.PAUSED;
    }

    this.emit('stateChange', { state: this.state });
  }

  // Playback options
  public setSpeed(speed: number): void {
    const wasPlaying = this.state === PlaybackState.PLAYING;
    if (wasPlaying) {
      this.pause();
    }

    this.options.speed = Math.max(0.25, Math.min(speed, 4));

    if (wasPlaying) {
      this.play();
    }
  }

  public setOptions(options: Partial<PlaybackOptions>): void {
    this.options = { ...this.options, ...options };
  }

  // Getters
  public getState(): PlaybackState {
    return this.state;
  }

  public getPosition(): PlaybackPosition {
    return { ...this.position };
  }

  public getOptions(): PlaybackOptions {
    return { ...this.options };
  }

  // Private methods
  private reset(): void {
    this.position = {
      currentTime: 0,
      totalTime: this.position.totalTime,
      currentEventIndex: 0,
      progress: 0,
    };
    this.state = PlaybackState.IDLE;
  }

  private startPlaybackLoop(): void {
    this.stopPlaybackLoop();
    this.lastUpdateTime = Date.now();
    this.playbackTimer = setInterval(() => this.updatePlayback(), 16); // ~60fps
  }

  private stopPlaybackLoop(): void {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  private updatePlayback(): void {
    if (!this.session || this.state !== PlaybackState.PLAYING) {
      return;
    }

    const now = Date.now();
    const realTimeElapsed = now - this.startTime;
    this.position.currentTime = realTimeElapsed * this.options.speed;

    // Update progress
    this.position.progress =
      this.position.totalTime > 0
        ? Math.min(1, this.position.currentTime / this.position.totalTime)
        : 0;

    // Process events that should have occurred by now
    const firstEvent =
      this.session.events.length > 0 ? this.session.events[0] : null;
    const firstEventTime = firstEvent ? firstEvent.timestamp : 0;
    const targetTime = firstEventTime + this.position.currentTime;

    while (this.position.currentEventIndex < this.session.events.length) {
      const currentEvent = this.session.events[this.position.currentEventIndex];
      if (!currentEvent || currentEvent.timestamp > targetTime) {
        break;
      }
      this.processEvent(currentEvent);
      this.position.currentEventIndex++;
    }

    // Check if we've reached the end
    if (this.position.currentEventIndex >= this.session.events.length) {
      if (this.options.autoLoop) {
        this.seek(0);
        return;
      } else {
        this.pause();
        return;
      }
    }

    // Emit position update
    this.emit('positionUpdate', { ...this.position });
  }

  private applyEventsUpToIndex(index: number): void {
    if (!this.session) return;

    // Reset to initial state first
    this.emit('eventProcessed', {
      type: 'reset',
      content: this.session.initialContent,
      language: this.session.language,
    });

    // Apply all events up to the index
    for (let i = 0; i <= index && i < this.session.events.length; i++) {
      const event = this.session.events[i];
      if (event) {
        this.processEvent(event);
      }
    }
  }

  private processEvent(event: RecordingEvent): void {
    try {
      switch (event.type) {
        case RecordingEventType.CONTENT_CHANGE:
          this.emit('eventProcessed', {
            type: 'contentChange',
            event: event as ContentChangeEvent,
          });
          break;

        case RecordingEventType.CURSOR_POSITION:
          this.emit('eventProcessed', {
            type: 'cursorPosition',
            event: event as CursorPositionEvent,
          });
          break;

        case RecordingEventType.SELECTION_CHANGE:
          this.emit('eventProcessed', {
            type: 'selectionChange',
            event: event as SelectionChangeEvent,
          });
          break;

        case RecordingEventType.KEYSTROKE:
          this.emit('eventProcessed', {
            type: 'keystroke',
            event: event as KeystrokeEvent,
          });
          break;

        case RecordingEventType.LANGUAGE_CHANGE:
          this.emit('eventProcessed', {
            type: 'languageChange',
            event,
          });
          break;

        // Control events don't need special handling during playback
        case RecordingEventType.RECORDING_START:
        case RecordingEventType.RECORDING_PAUSE:
        case RecordingEventType.RECORDING_RESUME:
        case RecordingEventType.RECORDING_STOP:
        case RecordingEventType.EDITOR_FOCUS:
        case RecordingEventType.EDITOR_BLUR:
          break;

        default:
          console.warn(
            'Unknown event type during playback:',
            (event as any).type
          );
          break;
      }
    } catch (error) {
      console.error('Error processing event:', error, event);
      this.emit('error', { message: 'Error processing event', event, error });
    }
  }

  // Cleanup
  public destroy(): void {
    this.stop();
    this.eventHandlers.clear();
    this.session = null;
  }
}
