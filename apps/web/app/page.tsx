'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <header className="text-center mb-16">
          <div className="mb-8">
            <h1 className="text-5xl font-bold text-gray-900 mb-4 leading-tight">
              Interactive Video Code Editor
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Record your coding sessions with precision timing and create
              interactive learning experiences like Scrimba. Capture every
              keystroke, cursor movement, and code change with millisecond
              accuracy.
            </p>
          </div>

          {/* Main Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Link
              href="/record"
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-3"
            >
              <span className="text-2xl">📹</span>
              Start Recording
            </Link>

            <Link
              href="/view"
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-3"
            >
              <span className="text-2xl">▶️</span>
              View Recordings {recordingCount > 0 && `(${recordingCount})`}
            </Link>
          </div>
        </header>

        {/* Features Grid */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Powerful Recording Features
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Recording Features */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Precision Capture
              </h3>
              <p className="text-gray-600">
                Records every keystroke, cursor movement, text selection, and
                code change with millisecond-precise timestamps.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Real-time Events
              </h3>
              <p className="text-gray-600">
                Captures editor focus, language changes, and all Monaco Editor
                events in real-time for complete session reconstruction.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">🎬</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Interactive Playback
              </h3>
              <p className="text-gray-600">
                Watch recordings with full playback controls: play/pause/stop,
                speed adjustment (0.25x-4x), and timeline scrubbing.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">💾</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Auto-Save
              </h3>
              <p className="text-gray-600">
                All recordings are automatically saved to browser storage with
                metadata including duration, event count, and creation date.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">�</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Monaco Integration
              </h3>
              <p className="text-gray-600">
                Built on Monaco Editor with full syntax highlighting,
                IntelliSense, and multi-language support preserved during
                playback.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Detailed Analytics
              </h3>
              <p className="text-gray-600">
                View comprehensive session data including event counts, timing
                analysis, and coding patterns for learning insights.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Start Guide */}
        <section className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
            Get Started in 3 Steps
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gradient-to-r from-red-100 to-red-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-red-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Record
              </h3>
              <p className="text-gray-600">
                Click "Start Recording", enter a session title, and begin
                coding. Every action is captured automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-indigo-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Save</h3>
              <p className="text-gray-600">
                Stop recording when finished. Your session is automatically
                saved with all events and metadata preserved.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-100 to-purple-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Replay
              </h3>
              <p className="text-gray-600">
                View your recordings with full interactive controls. Share
                sessions or use them for learning and teaching.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center mt-16 text-gray-500">
          <p>Built with Next.js, Monaco Editor, and TypeScript</p>
        </footer>
      </div>
    </div>
  );
}
