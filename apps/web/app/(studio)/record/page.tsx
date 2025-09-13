'use client';

import MonacoEditor from '../../components/editor/MonacoEditor';

export default function RecordPage() {
  return (
    <div className="space-y-6">
      {/* Recording Studio */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Interactive Code Editor
          </h2>
          <p className="text-gray-600 text-sm">
            Start typing and use the recording controls to capture your coding
            session. All keystrokes, cursor movements, and code changes will be
            recorded with precise timestamps.
          </p>
        </div>

        <div className="h-[700px]">
          <MonacoEditor />
        </div>
      </div>

      {/* Instructions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            🎯 How to Record
          </h3>
          <ol className="text-sm text-blue-800 space-y-2">
            <li className="flex gap-2">
              <span className="font-medium">1.</span>
              <span>Enter a descriptive session title in the input field</span>
            </li>
            <li className="flex gap-2">
              <span className="font-medium">2.</span>
              <span>
                Click <strong>"Start Recording"</strong> to begin capturing
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-medium">3.</span>
              <span>
                Type code, move cursor, select text - everything is recorded
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-medium">4.</span>
              <span>
                Use <strong>"Pause"</strong> and <strong>"Resume"</strong> for
                breaks
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-medium">5.</span>
              <span>
                Click <strong>"Stop"</strong> to finish and auto-save your
                session
              </span>
            </li>
          </ol>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            ✨ What Gets Recorded
          </h3>
          <ul className="text-sm text-green-800 space-y-2">
            <li className="flex gap-2">
              <span className="text-green-600">•</span>
              <span>
                <strong>Keystrokes:</strong> Every key press with modifier keys
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">•</span>
              <span>
                <strong>Cursor Movement:</strong> Precise position tracking
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">•</span>
              <span>
                <strong>Text Selection:</strong> Multi-line and partial
                selections
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">•</span>
              <span>
                <strong>Code Changes:</strong> All text insertions and deletions
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">•</span>
              <span>
                <strong>Language Changes:</strong> Syntax highlighting updates
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-green-600">•</span>
              <span>
                <strong>Timing:</strong> Millisecond-precise timestamps
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
          💡 Pro Tips
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-amber-800">
          <ul className="space-y-1">
            <li>• Use descriptive session titles for easy identification</li>
            <li>• Pause recording during breaks to keep sessions focused</li>
            <li>
              • Start with an empty editor for the best playback experience
            </li>
          </ul>
          <ul className="space-y-1">
            <li>• Recordings are saved automatically to localStorage</li>
            <li>• Sessions can be replayed at different speeds (0.25x - 4x)</li>
            <li>• Navigate to the View tab to watch your recordings</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
