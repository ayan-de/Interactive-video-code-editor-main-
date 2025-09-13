'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface StudioLayoutProps {
  children: React.ReactNode;
}

export default function StudioLayout({ children }: StudioLayoutProps) {
  const pathname = usePathname();
  const [recordingCount, setRecordingCount] = useState(0);

  const isRecordPage = pathname?.includes('/record');
  const isViewPage = pathname?.includes('/view');

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
    <div
      className={`min-h-screen ${
        isRecordPage
          ? 'bg-gradient-to-br from-blue-50 to-indigo-100'
          : isViewPage
            ? 'bg-gradient-to-br from-indigo-50 to-purple-100'
            : 'bg-gray-50'
      }`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Common Header */}
        <header className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {isRecordPage
                  ? '📹 Recording Studio'
                  : isViewPage
                    ? '▶️ Recording Viewer'
                    : '🎬 Studio'}
              </h1>
              <p className="text-gray-600">
                {isRecordPage
                  ? 'Capture your coding sessions with precision timing and detailed event tracking'
                  : isViewPage
                    ? 'Watch and interact with your saved coding sessions'
                    : 'Your interactive coding workspace'}
              </p>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-3">
              {isRecordPage && (
                <Link
                  href="/view"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <span>▶️</span>
                  View Recordings {recordingCount > 0 && `(${recordingCount})`}
                </Link>
              )}

              {isViewPage && (
                <Link
                  href="/record"
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <span>📹</span>
                  New Recording
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Common Navigation */}
        <nav className="px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-2"
            >
              ← Back to Home
            </Link>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              <Link
                href="/record"
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${
                  isRecordPage
                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <span>📹</span>
                Record
              </Link>
              <Link
                href="/view"
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 ${
                  isViewPage
                    ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <span>▶️</span>
                View {recordingCount > 0 && `(${recordingCount})`}
              </Link>
            </div>
          </div>
        </nav>

        {/* Page Content */}
        <main className="p-6 pt-0">{children}</main>
      </div>
    </div>
  );
}
