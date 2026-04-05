'use client';

import { useState, useEffect } from 'react';
import { countRecordings as countRecordingsDB } from '@/lib/recordingStorage';

export function useRecordingCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refreshCount = () => {
      countRecordingsDB()
        .then(setCount)
        .catch(() => setCount(0));
    };

    refreshCount();

    const handleStorageChange = () => {
      refreshCount();
    };

    const handleRecordingSaved = () => {
      refreshCount();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('recording_saved', handleRecordingSaved);
    const interval = setInterval(refreshCount, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('recording_saved', handleRecordingSaved);
      clearInterval(interval);
    };
  }, []);

  return count;
}
