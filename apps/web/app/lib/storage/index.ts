export type { RecordingStorage, RecordingListResult } from './types';
export { IndexedDBStorageAdapter } from './IndexedDBStorageAdapter';
export { ApiStorageAdapter } from './ApiStorageAdapter';
export { SmartStorageAdapter } from './SmartStorageAdapter';

import { SmartStorageAdapter } from './SmartStorageAdapter';

let storageInstance: SmartStorageAdapter | null = null;

export function getRecordingStorage(
  getIsAuthenticated: () => boolean
): SmartStorageAdapter {
  if (!storageInstance) {
    storageInstance = new SmartStorageAdapter(getIsAuthenticated);
  }
  return storageInstance;
}

export function resetRecordingStorage(): void {
  storageInstance = null;
}
