'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import SloganText from '../components/SloganText';

export default function Home() {
  const [recordingCount, setRecordingCount] = useState(0);

  // Count saved recordings
  useEffect(() => {
    const countRecordings = () => {
      let count = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('recording_')) {
          count++;
        }
      }
      setRecordingCount(count);
    };

    countRecordings();

    // Update count when storage changes
    const handleStorageChange = () => {
      countRecordings();
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(countRecordings, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      {/* Hero Section */}
      <header className="flex-grow flex items-center justify-center text-center px-4 md:px-6">
        <div className="mb-8 max-w-4xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
            Interactive Video Code Editor
          </h1>

          <SloganText />
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mt-6 md:mt-8 px-4">
            <Link href="/record" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-black hover:bg-gray-100 font-semibold px-6 sm:px-8 md:px-12 py-3 md:py-4 text-base md:text-lg shadow-lg hover:shadow-xl transition-all duration-300 border-0 h-12 md:h-14 cursor-pointer"
              >
                Start Recording
              </Button>
            </Link>

            <Link href="/view" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-2 border-white/50 bg-transparent backdrop-blur-sm text-white hover:bg-white/10 hover:border-white/70 font-semibold px-6 sm:px-8 md:px-12 py-3 md:py-4 text-base md:text-lg shadow-lg transition-all duration-300 h-12 md:h-14 cursor-pointer"
              >
                <span className="hidden sm:inline">View Recordings</span>
                <span className="sm:hidden">
                  View ({recordingCount > 0 ? recordingCount : 0})
                </span>
                <span className="hidden sm:inline">
                  {recordingCount > 0 && ` (${recordingCount})`}
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
