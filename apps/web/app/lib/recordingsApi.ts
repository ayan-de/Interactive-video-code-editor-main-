import { get, post, patch, del } from './api';

export interface RecordingFromApi {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  language: string;
  duration: number;
  eventCount: number;
  fileSize: number;
  initialContent: string;
  finalContent: string;
  editorConfig: {
    fontSize: number;
    tabSize: number;
    theme: string;
    wordWrap: boolean;
  };
  tags: string[];
  isPublic: boolean;
  playCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecordingsListResponse {
  recordings: RecordingFromApi[];
  total: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RecordingEventPayload = Record<string, any>;

interface ApiListResponse {
  status: number;
  code: string;
  message: string;
  data: RecordingsListResponse;
}

interface ApiSingleResponse {
  status: number;
  code: string;
  message: string;
  data: RecordingFromApi;
}

interface ApiEventsResponse {
  status: number;
  code: string;
  message: string;
  data: {
    events: RecordingEventPayload[];
    total: number;
  };
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export async function fetchRecordings(
  page = 1,
  limit = 20
): Promise<RecordingsListResponse> {
  const res = await get<ApiListResponse>(
    `/recordings?page=${page}&limit=${limit}`
  );
  return res.data;
}

export async function fetchPublicRecordings(
  page = 1,
  limit = 20
): Promise<RecordingsListResponse> {
  const res = await get<ApiListResponse>(
    `/recordings/public?page=${page}&limit=${limit}`
  );
  return res.data;
}

export async function fetchRecording(id: string): Promise<RecordingFromApi> {
  const res = await get<ApiSingleResponse>(`/recordings/${id}`);
  return res.data;
}

export async function fetchRecordingEvents(
  id: string
): Promise<RecordingEventPayload[]> {
  const res = await get<ApiEventsResponse>(`/recordings/${id}/events/all`);
  return res.data.events;
}

export async function createRecording(data: {
  title: string;
  description?: string;
  language: string;
  duration: number;
  eventCount: number;
  initialContent: string;
  finalContent: string;
  editorConfig?: {
    fontSize: number;
    tabSize: number;
    theme: string;
    wordWrap: boolean;
  };
  tags?: string[];
  events: RecordingEventPayload[];
}): Promise<RecordingFromApi> {
  const res = await post<ApiSingleResponse>('/recordings', data);
  return res.data;
}

export async function updateRecording(
  id: string,
  data: {
    title?: string;
    description?: string;
    tags?: string[];
    isPublic?: boolean;
  }
): Promise<RecordingFromApi> {
  const res = await patch<ApiSingleResponse>(`/recordings/${id}`, data);
  return res.data;
}

export async function deleteRecording(id: string): Promise<void> {
  await del(`/recordings/${id}`);
}

export async function uploadTantricaFile(
  file: File
): Promise<RecordingFromApi> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/recordings/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.message || `Upload failed with status ${response.status}`
    );
  }

  const res = (await response.json()) as ApiSingleResponse;
  return res.data;
}

export async function incrementPlayCount(id: string): Promise<void> {
  await post(`/recordings/${id}/play`);
}

export function convertApiRecordingToSession(
  recording: RecordingFromApi,
  events: RecordingEventPayload[]
) {
  return {
    id: recording._id,
    title: recording.title,
    description: recording.description,
    language: recording.language,
    initialContent: recording.initialContent,
    finalContent: recording.finalContent,
    duration: recording.duration,
    events,
    createdAt: new Date(recording.createdAt),
    updatedAt: new Date(recording.updatedAt),
    metadata: {
      editorTheme: recording.editorConfig?.theme,
      fontSize: recording.editorConfig?.fontSize,
      tabSize: recording.editorConfig?.tabSize,
    },
  };
}
