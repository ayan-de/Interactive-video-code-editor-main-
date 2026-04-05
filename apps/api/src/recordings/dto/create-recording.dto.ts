export interface EditorConfigDto {
  fontSize: number;
  tabSize: number;
  theme: string;
  wordWrap: boolean;
}

export interface CreateRecordingDto {
  title: string;
  description?: string;
  language: string;
  duration: number;
  eventCount: number;
  initialContent?: string;
  finalContent?: string;
  editorConfig?: EditorConfigDto;
  tags?: string[];
  isPublic?: boolean;
  events: Record<string, any>[];
}
