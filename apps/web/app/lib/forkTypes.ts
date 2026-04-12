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
