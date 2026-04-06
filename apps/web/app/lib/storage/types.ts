import type { RecordingSession, RecordingEvent } from '@repo/tantrica-core';

export interface RecordingListResult {
  recordings: RecordingSession[];
  total: number;
}

export interface RecordingStorage {
  save(session: RecordingSession): Promise<void>;
  load(id: string): Promise<RecordingSession | null>;
  list(page?: number, limit?: number): Promise<RecordingListResult>;
  delete(id: string): Promise<void>;
  getEvents(id: string): Promise<RecordingEvent[]>;
}
