'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import Aurora from './components/Aurora';

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
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Aurora Background */}
      <div className="absolute inset-0 z-0">
        <Aurora
          colorStops={['#7cff67', '#B19EEF', '#5227FF']}
          amplitude={1.2}
          blend={0.5}
          speed={0.8}
        />
      </div>

      <div className="relative z-10 min-h-screen bg-black/20 backdrop-blur-sm flex flex-col">
        {/* Hero Section */}
        <header className="flex-grow flex items-center justify-center text-center">
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
              Interactive Video Code Editor
            </h1>
            <div className="mb-6">
              <p className="text-2xl font-medium text-gray-300 mb-2 drop-shadow-md">
                "Stop recording pixels, instead capture DOM"
              </p>
            </div>
          </div>
        </header>
        <footer className="text-center py-6 text-gray-300">
          <p>
            Built with Next.js, Monaco Editor, and TypeScript by{' '}
            <a
              href="https://github.com/ayan-de"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent hover:from-purple-500 hover:to-cyan-400 transition-colors"
            >
              Ayan
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
