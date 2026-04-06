'use client';

import { useState, useEffect } from 'react';
import { getRecordingStorage } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';

export function useRecordingCount(): number {
  const [count, setCount] = useState(0);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const refreshCount = async () => {
      try {
        const storage = getRecordingStorage(() => isAuthenticated);
        const result = await storage.list(1, 1);
        setCount(result.total);
      } catch {
        setCount(0);
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
  }, [isAuthenticated]);

  return count;
}
