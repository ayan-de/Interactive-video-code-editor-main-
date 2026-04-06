'use client';

import { useState, useEffect } from 'react';
import { countRecordings as countRecordingsDB } from '@/lib/recordingStorage';
import { fetchRecordings } from '@/lib/recordingsApi';

export function useRecordingCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refreshCount = async () => {
      try {
        const res = await fetchRecordings(1, 1);
        setCount(res.total);
      } catch {
        try {
          const localCount = await countRecordingsDB();
          setCount(localCount);
        } catch {
          setCount(0);
        }
      }
    };

    refreshCount();

    const handleRecordingSaved = () => {
      refreshCount();
    };

    window.addEventListener('recording_saved', handleRecordingSaved);
    const interval = setInterval(refreshCount, 5000);

    return () => {
      window.removeEventListener('recording_saved', handleRecordingSaved);
      clearInterval(interval);
    };
  }, []);

  return count;
}
