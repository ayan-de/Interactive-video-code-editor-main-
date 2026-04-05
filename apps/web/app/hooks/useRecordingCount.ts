'use client';

import { useState, useEffect } from 'react';

export function useRecordingCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const countRecordings = () => {
      let c = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('recording_')) {
          c++;
        }
      }
      setCount(c);
    };

    countRecordings();

    const handleStorageChange = () => {
      countRecordings();
    };

    const handleRecordingSaved = () => {
      countRecordings();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('recording_saved', handleRecordingSaved);
    const interval = setInterval(countRecordings, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('recording_saved', handleRecordingSaved);
      clearInterval(interval);
    };
  }, []);

  return count;
}
