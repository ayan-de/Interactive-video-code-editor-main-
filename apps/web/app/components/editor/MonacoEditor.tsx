'use client';

import { Editor } from '@monaco-editor/react';
import React, { useState, useRef } from 'react';
import type * as monacoType from 'monaco-editor';
import { useRecording } from '@/hooks/useRecordings';
import { RecordingSession } from '@/types/recordings';
import { env } from '@/config/env';

export default function MonacoEditor(): React.JSX.Element {
  const [value, setValue] = useState(
    '// Welcome to the Interactive Code Editor\n// Start typing your code here...\n\nfunction hello() {\n  console.log("Hello World!");\n}\n\n// Click "Start Recording" to begin capturing your coding session\n// All your keystrokes, cursor movements, and selections will be recorded'
  );

  const [sessionTitle, setSessionTitle] = useState('First Coding Session');

  const {
    isRecording,
    isPaused,
    currentDuration,
    eventCount,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    handleEditorChange: recordingHandleEditorChange,
    handleEditorMount: recordingHandleEditorMount,
    formatDuration,
  } = useRecording({
    autoSave: env.AUTO_SAVE_RECORDINGS,
    onSessionComplete: (session: RecordingSession) => {
      if (env.isDevelopment() && env.DEBUG_RECORDING) {
        console.log('recording completed', session);
      }

      localStorage.setItem(`recording_${session.id}`, JSON.stringify(session));

      alert(
        `Recording saved! Duration: ${formatDuration(session.duration)}, Events: ${session.events.length}`
      );
    },
    onError: (error: Error) => {
      console.error(' Recording error:', error);
      alert(`Recording error: ${error.message}`);
    },
  });

  const handleEditorChange = (newValue: string | undefined, event: any) => {
    setValue(newValue || '');

    //passing the change to the recording hook
    recordingHandleEditorChange(newValue, event);
  };

  function handleEditorDidMount(
    editor: monacoType.editor.IStandaloneCodeEditor,
    monaco: typeof monacoType
  ) {
    if (env.isDevelopment() && env.DEBUG_MONACO) {
      console.log('onMount: the editor instance:', editor);
      console.log('onMount: the monaco instance:', monaco);
    }

    //initializing recording for this editor
    recordingHandleEditorMount(editor, monaco);
  }

  // Recording control handlers
  const handleStartRecording = () => {
    startRecording(sessionTitle);
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="bg-gray-900 text-white p-4 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
          {/* Left side - Controls */}
          <div className="flex items-center gap-3">
            {/* Session Title Input */}
            <input
              type="text"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="Session title..."
              disabled={isRecording || isPaused}
              className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-400 disabled:opacity-50"
            />

            {/* Start Recording Button */}
            <button
              onClick={handleStartRecording}
              disabled={isRecording || isPaused}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
            >
              <div
                className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-300 animate-pulse' : 'bg-white'}`}
              />
              {isRecording ? 'Recording...' : 'Start Recording'}
            </button>

            {/* Pause/Resume Button */}
            <button
              onClick={handlePauseResume}
              disabled={!isRecording && !isPaused}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
            >
              {isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>

            {/* Stop Recording Button */}
            <button
              onClick={handleStopRecording}
              disabled={!isRecording && !isPaused}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
            >
              ⏹️ Stop
            </button>
          </div>

          {/* Right side - Stats */}
          <div className="flex items-center gap-6 text-sm">
            {/* Recording Status */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Status:</span>
              <span
                className={`font-semibold ${
                  isRecording
                    ? 'text-red-400'
                    : isPaused
                      ? 'text-yellow-400'
                      : 'text-gray-500'
                }`}
              >
                {isRecording
                  ? '🔴 Recording'
                  : isPaused
                    ? '⏸️ Paused'
                    : '⚪ Idle'}
              </span>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Duration:</span>
              <span className="font-mono text-white">
                {formatDuration(currentDuration)}
              </span>
            </div>

            {/* Event Count */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Events:</span>
              <span className="font-mono text-white">
                {eventCount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {(isRecording || isPaused) && (
          <div className="mt-3">
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  isRecording ? 'bg-red-500' : 'bg-yellow-500'
                }`}
                style={{
                  width: `${Math.min((currentDuration / env.MAX_RECORDING_DURATION) * 100, 100)}%`,
                }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {isRecording ? 'Recording in progress...' : 'Recording paused'}
            </div>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 border border-gray-300 rounded-lg overflow-hidden">
        <Editor
          height="100%"
          width="100%"
          defaultLanguage="javascript"
          value={value}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 20,
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            renderLineHighlight: 'gutter',
            contextmenu: true,
            mouseWheelZoom: true,
            selectOnLineNumbers: true,
            lineNumbers: 'on',
            glyphMargin: false,
            folding: true,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
            renderValidationDecorations: 'on',
          }}
          onMount={handleEditorDidMount}
        />
      </div>
    </div>
  );
}
