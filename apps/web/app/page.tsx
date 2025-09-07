"use client";

import MonacoEditor from "./components/editor/MonacoEditor";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Interactive Video Code Editor
          </h1>
          <p className="text-gray-600">
            Record your coding sessions and create interactive learning experiences like Scrimba
          </p>
        </header>
        
        <main className="space-y-6">
          {/* Main Editor Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Recording Studio
              </h2>
              <p className="text-gray-600 text-sm">
                Use the controls below to start recording your coding session. All keystrokes, cursor movements, and selections will be captured.
              </p>
            </div>
            
            <div className="h-[700px]">
              <MonacoEditor />
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">🎯 How it works:</h3>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Click <strong>"Start Recording"</strong> to begin capturing your coding session</li>
              <li>2. Type code, move your cursor, select text - everything is recorded with precise timestamps</li>
              <li>3. Use <strong>"Pause"</strong> and <strong>"Resume"</strong> to control your recording</li>
              <li>4. Click <strong>"Stop"</strong> to finish and save your recording session</li>
              <li>5. Check the debug panel below to see your saved recordings and their data</li>
            </ol>
          </div>
        </main>
      </div>
    </div>
  );
}
