'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PlaybackViewer from '../../components/viewer/PlaybackViewer';
import { RecordingSession } from '../../types/recordings';

export default function ViewPage() {
  const [savedRecordings, setSavedRecordings] = useState<RecordingSession[]>(
    []
  );
  const [selectedRecording, setSelectedRecording] =
    useState<RecordingSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Load saved recordings from localStorage
  useEffect(() => {
    const loadSavedRecordings = () => {
      setLoading(true);
      const recordings: RecordingSession[] = [];

      // Iterate through localStorage to find recording sessions
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('recording_')) {
          try {
            const recordingData = localStorage.getItem(key);
            if (recordingData) {
              const session = JSON.parse(recordingData) as RecordingSession;
              // Convert date strings back to Date objects
              session.createdAt = new Date(session.createdAt);
              session.updatedAt = new Date(session.updatedAt);
              recordings.push(session);
            }
          } catch (error) {
            console.error('Error parsing recording:', key, error);
          }
        }
      }

      // Sort by creation date (newest first)
      recordings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setSavedRecordings(recordings);
      setLoading(false);
    };

    loadSavedRecordings();

    // Listen for new recordings being saved
    const handleStorageChange = () => {
      loadSavedRecordings();
    };

    window.addEventListener('storage', handleStorageChange);

    // Also check periodically in case recordings are saved in the same tab
    const interval = setInterval(loadSavedRecordings, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleRecordingSelect = (recording: RecordingSession) => {
    setSelectedRecording(recording);
  };

  const handleClosePlayback = () => {
    setSelectedRecording(null);
  };

  const deleteRecording = (recordingId: string) => {
    if (confirm('Are you sure you want to delete this recording?')) {
      localStorage.removeItem(`recording_${recordingId}`);
      setSavedRecordings((prev) => prev.filter((r) => r.id !== recordingId));
      if (selectedRecording?.id === recordingId) {
        setSelectedRecording(null);
      }
    }
  };

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Full-screen playback view
  if (selectedRecording) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50">
        <PlaybackViewer
          session={selectedRecording}
          onClose={handleClosePlayback}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recordings List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Saved Recordings ({savedRecordings.length})
              </h2>
              <p className="text-gray-600 text-sm">
                Click on any recording to start playback with full interactive
                controls
              </p>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
                <span className="text-sm">Loading...</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {savedRecordings.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-gray-400 text-8xl mb-6">🎬</div>
              <h3 className="text-2xl font-medium text-gray-900 mb-3">
                No recordings yet
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Create your first recording to see it here. All recordings are
                automatically saved and ready for playback.
              </p>
              <Link
                href="/record"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
              >
                <span>📹</span>
                Start Your First Recording
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {savedRecordings.map((recording) => (
                <div
                  key={recording.id}
                  className="group border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-indigo-300 transition-all duration-200 cursor-pointer bg-gradient-to-br from-white to-gray-50"
                  onClick={() => handleRecordingSelect(recording)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors truncate pr-2">
                      {recording.title}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRecording(recording.id);
                      }}
                      className="text-red-400 hover:text-red-600 transition-colors p-1 rounded opacity-0 group-hover:opacity-100"
                      title="Delete recording"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>

                  {recording.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {recording.description}
                    </p>
                  )}

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">⏱️</span>
                        <div>
                          <div className="font-medium text-gray-700">
                            {formatDuration(recording.duration)}
                          </div>
                          <div className="text-xs text-gray-500">Duration</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">📊</span>
                        <div>
                          <div className="font-medium text-gray-700">
                            {recording.events.length}
                          </div>
                          <div className="text-xs text-gray-500">Events</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">🔧</span>
                        <div>
                          <div className="font-medium text-gray-700">
                            {recording.language}
                          </div>
                          <div className="text-xs text-gray-500">Language</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">📅</span>
                        <div>
                          <div className="font-medium text-gray-700">
                            {recording.createdAt.toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">Created</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 group-hover:text-indigo-600 transition-colors">
                        Click to play recording
                      </span>
                      <div className="text-2xl group-hover:scale-110 transition-transform">
                        ▶️
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Playback Instructions */}
      {savedRecordings.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2 text-lg">
            🎬 Playback Features
          </h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-green-800">
            <div>
              <h4 className="font-medium mb-2">Interactive Controls</h4>
              <ul className="space-y-1">
                <li>• Play, pause, and stop playback at any time</li>
                <li>• Adjustable speed from 0.25x to 4x</li>
                <li>• Timeline scrubber for instant navigation</li>
                <li>• Real-time progress indicators</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Viewing Experience</h4>
              <ul className="space-y-1">
                <li>• Watch code appear exactly as typed</li>
                <li>• See cursor movements and selections</li>
                <li>• Perfect timing reproduction</li>
                <li>• Syntax highlighting preserved</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
