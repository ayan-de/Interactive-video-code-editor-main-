'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PlaybackViewer from '../../components/viewer/PlaybackViewer';
import { useAuth } from '@/hooks/useAuth';
import { useLoading } from '@/context/LoadingContext';
import {
  fetchRecordings,
  fetchRecordingEvents,
  deleteRecording as deleteRecordingApi,
  convertApiRecordingToSession,
  type RecordingFromApi,
} from '@/lib/recordingsApi';
import { formatDuration } from '@/lib/formatDuration';
import type { RecordingSession } from '@/types/recordings';

export default function ViewPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { showError } = useLoading();
  const [recordings, setRecordings] = useState<RecordingFromApi[]>([]);
  const [selectedSession, setSelectedSession] =
    useState<RecordingSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      setLoading(false);
      return;
    }
    if (!isAuthenticated) return;

    setLoading(true);
    fetchRecordings()
      .then((data) => {
        setRecordings(data.recordings);
      })
      .catch((err) => {
        console.error('Error loading recordings:', err);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated, authLoading]);

  const handleRecordingSelect = async (recording: RecordingFromApi) => {
    try {
      const events = await fetchRecordingEvents(recording._id);
      const session = convertApiRecordingToSession(
        recording,
        events
      ) as RecordingSession;
      setSelectedSession(session);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load recording events';
      showError(message);
    }
  };

  const handleClosePlayback = () => {
    setSelectedSession(null);
  };

  const handleDelete = async (recordingId: string) => {
    if (!confirm('Are you sure you want to delete this recording?')) return;
    try {
      await deleteRecordingApi(recordingId);
      setRecordings((prev) => prev.filter((r) => r._id !== recordingId));
      if (selectedSession?.id === recordingId) {
        setSelectedSession(null);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete recording';
      console.error('Error deleting recording:', err);
      showError(message);
    }
  };

  if (selectedSession) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50">
        <PlaybackViewer
          session={selectedSession}
          onClose={handleClosePlayback}
        />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-16">
        <h3 className="text-2xl font-medium text-white mb-3">
          Sign in to view your recordings
        </h3>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Recordings are stored in your account. Sign in to access them.
        </p>
        <Link
          href="/"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
        >
          Go Home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Saved Recordings ({recordings.length})
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
          {recordings.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-gray-400 text-8xl mb-6">&#127909;</div>
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
                <span>&#128249;</span>
                Start Your First Recording
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recordings.map((recording) => (
                <div
                  key={recording._id}
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
                        handleDelete(recording._id);
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
                        <span className="text-gray-400">&#9201;&#65039;</span>
                        <div>
                          <div className="font-medium text-gray-700">
                            {formatDuration(recording.duration, 'short')}
                          </div>
                          <div className="text-xs text-gray-500">Duration</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">&#128202;</span>
                        <div>
                          <div className="font-medium text-gray-700">
                            {recording.eventCount}
                          </div>
                          <div className="text-xs text-gray-500">Events</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">&#128295;</span>
                        <div>
                          <div className="font-medium text-gray-700">
                            {recording.language}
                          </div>
                          <div className="text-xs text-gray-500">Language</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">&#128197;</span>
                        <div>
                          <div className="font-medium text-gray-700">
                            {new Date(recording.createdAt).toLocaleDateString()}
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
                        &#9654;&#65039;
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {recordings.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2 text-lg">
            &#127916; Playback Features
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
