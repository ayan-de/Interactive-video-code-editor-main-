'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import type * as monacoType from 'monaco-editor';
import {
  PlaybackEngine,
  PlaybackState,
  PlaybackPosition,
  PlaybackEventHandler,
} from '@/core/PlaybackEngine';
import {
  RecordingSession,
  ContentChangeEvent,
  RecordingEventType,
} from '@/types/recordings';

interface PlaybackViewerProps {
  session: RecordingSession | null;
  onClose?: () => void;
}

export default function PlaybackViewer({
  session,
  onClose,
}: PlaybackViewerProps): React.JSX.Element {
  // State management
  const [playbackState, setPlaybackState] = useState<PlaybackState>(
    PlaybackState.IDLE
  );
  const [position, setPosition] = useState<PlaybackPosition>({
    currentTime: 0,
    totalTime: 0,
    currentEventIndex: 0,
    progress: 0,
  });
  const [speed, setSpeed] = useState<number>(1);
  const [editorContent, setEditorContent] = useState<string>('');
  const [isReady, setIsReady] = useState<boolean>(false);

  // Refs
  const engineRef = useRef<PlaybackEngine | null>(null);
  const editorRef = useRef<monacoType.editor.IStandaloneCodeEditor | null>(
    null
  );
  const monacoRef = useRef<typeof monacoType | null>(null);

  // Initialize playback engine
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new PlaybackEngine();
    }

    const engine = engineRef.current;

    const eventHandler: PlaybackEventHandler = ({ type, data }) => {
      switch (type) {
        case 'stateChange':
          setPlaybackState(data.state);
          break;

        case 'positionUpdate':
          setPosition(data);
          break;

        case 'eventProcessed':
          handleEventProcessed(data);
          break;

        case 'error':
          console.error('Playback error:', data);
          alert(`Playback error: ${data.message}`);
          break;
      }
    };

    engine.addEventHandler(eventHandler);

    return () => {
      engine.removeEventHandler(eventHandler);
      engine.destroy();
    };
  }, []);

  // Load session when it changes
  useEffect(() => {
    if (session && engineRef.current) {
      engineRef.current.loadSession(session);
      setEditorContent(session.initialContent);
      setIsReady(true);
    } else {
      setIsReady(false);
      setEditorContent('');
    }
  }, [session]);

  // Handle processed events
  const handleEventProcessed = useCallback(
    (data: any) => {
      if (!editorRef.current || !monacoRef.current) return;

      const editor = editorRef.current;
      const monaco = monacoRef.current;

      switch (data.type) {
        case 'reset':
          setEditorContent(data.content);
          if (data.language && session) {
            monaco.editor.setModelLanguage(editor.getModel()!, data.language);
          }
          break;

        case 'contentChange':
          const contentEvent = data.event as ContentChangeEvent;
          const model = editor.getModel();
          if (model && contentEvent.changes) {
            // Apply changes to the editor
            const edits = contentEvent.changes.map((change) => ({
              range: new monaco.Range(
                change.range.startLineNumber,
                change.range.startColumn,
                change.range.endLineNumber,
                change.range.endColumn
              ),
              text: change.text,
            }));
            model.applyEdits(edits);
          }
          break;

        case 'cursorPosition':
          const cursorEvent = data.event;
          if (cursorEvent.position) {
            editor.setPosition({
              lineNumber: cursorEvent.position.lineNumber,
              column: cursorEvent.position.column,
            });
          }
          break;

        case 'selectionChange':
          const selectionEvent = data.event;
          if (selectionEvent.selection) {
            editor.setSelection({
              startLineNumber:
                selectionEvent.selection.selectionStartLineNumber,
              startColumn: selectionEvent.selection.selectionStartColumn,
              endLineNumber: selectionEvent.selection.positionLineNumber,
              endColumn: selectionEvent.selection.positionColumn,
            });
          }
          break;

        case 'languageChange':
          const langEvent = data.event;
          if (langEvent.language) {
            const model = editor.getModel();
            if (model) {
              monaco.editor.setModelLanguage(model, langEvent.language);
            }
          }
          break;
      }
    },
    [session]
  );

  // Editor mount handler
  const handleEditorMount = (
    editor: monacoType.editor.IStandaloneCodeEditor,
    monaco: typeof monacoType
  ) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Make editor read-only
    editor.updateOptions({ readOnly: true });
  };

  // Playback control handlers
  const handlePlay = () => {
    engineRef.current?.play();
  };

  const handlePause = () => {
    engineRef.current?.pause();
  };

  const handleStop = () => {
    engineRef.current?.stop();
  };

  const handleSeek = (timeMs: number) => {
    engineRef.current?.seek(timeMs);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    engineRef.current?.setSpeed(newSpeed);
  };

  // Timeline scrubber handler
  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const progress = parseFloat(e.target.value);
    const timeMs = (progress * position.totalTime) / 100;
    handleSeek(timeMs);
  };

  // Utility functions
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

  if (!session) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Recording Selected</h2>
          <p className="text-gray-400">
            Please select a recording session to view.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div>
          <h2 className="text-lg font-semibold">{session.title}</h2>
          <p className="text-sm text-gray-400">
            {formatDuration(session.duration)} • {session.events.length} events
            • {session.language}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
          >
            Close
          </button>
        )}
      </div>

      {/* Playback Controls */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-4 mb-4">
          {/* Play/Pause/Stop controls */}
          <div className="flex items-center gap-2">
            {playbackState === PlaybackState.PLAYING ? (
              <button
                onClick={handlePause}
                className="w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors"
                disabled={!isReady}
              >
                <span className="text-lg">⏸️</span>
              </button>
            ) : (
              <button
                onClick={handlePlay}
                className="w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors"
                disabled={!isReady}
              >
                <span className="text-lg">▶️</span>
              </button>
            )}

            <button
              onClick={handleStop}
              className="w-10 h-10 bg-gray-600 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors"
              disabled={!isReady}
            >
              <span className="text-lg">⏹️</span>
            </button>
          </div>

          {/* Speed control */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Speed:</label>
            <select
              value={speed}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
              disabled={!isReady}
            >
              {speedOptions.map((option) => (
                <option key={option} value={option}>
                  {option}x
                </option>
              ))}
            </select>
          </div>

          {/* Time display */}
          <div className="text-sm text-gray-400">
            {formatTime(position.currentTime)} /{' '}
            {formatTime(position.totalTime)}
          </div>

          {/* State indicator */}
          <div className="text-sm">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                playbackState === PlaybackState.PLAYING
                  ? 'bg-green-600 text-white'
                  : playbackState === PlaybackState.PAUSED
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-600 text-gray-300'
              }`}
            >
              {playbackState.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Timeline scrubber */}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={position.progress * 100}
            onChange={handleTimelineChange}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer timeline-slider"
            disabled={!isReady}
          />
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        {isReady ? (
          <Editor
            height="100%"
            language={session.language}
            value={editorContent}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              readOnly: true,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fontSize: 14,
              lineNumbers: 'on',
              cursorStyle: 'line',
              selectionHighlight: true,
              occurrencesHighlight: 'singleFile',
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-gray-400">Loading recording...</p>
            </div>
          </div>
        )}
      </div>

      {/* Session Info (optional footer) */}
      {session.description && (
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <p className="text-sm text-gray-300">{session.description}</p>
        </div>
      )}

      <style jsx>{`
        .timeline-slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1f2937;
        }

        .timeline-slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1f2937;
        }
      `}</style>
    </div>
  );
}
