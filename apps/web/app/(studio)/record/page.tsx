'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import MonacoEditor from '../../components/editor/MonacoEditor';

function RecordPageContent() {
  const searchParams = useSearchParams();
  const title = searchParams.get('title') || '';

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden">
        <div className="p-6 border-b border-border bg-primary/5">
          <h2 className="text-xl font-semibold text-card-foreground mb-2">
            Interactive Code Editor
          </h2>
          <p className="text-muted-foreground text-sm">
            Start typing and use the recording controls to capture your coding
            session. All keystrokes, cursor movements, and code changes will be
            recorded with precise timestamps.
          </p>
        </div>

        <div className="h-[700px]">
          <MonacoEditor initialTitle={title} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
          <h3 className="font-semibold text-card-foreground mb-3 flex items-center gap-2">
            How to Record
          </h3>
          <ol className="text-sm text-muted-foreground space-y-2">
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

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
          <h3 className="font-semibold text-card-foreground mb-3 flex items-center gap-2">
            What Gets Recorded
          </h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex gap-2">
              <span>-</span>
              <span>
                <strong>Keystrokes:</strong> Every key press with modifier keys
              </span>
            </li>
            <li className="flex gap-2">
              <span>-</span>
              <span>
                <strong>Cursor Movement:</strong> Precise position tracking
              </span>
            </li>
            <li className="flex gap-2">
              <span>-</span>
              <span>
                <strong>Text Selection:</strong> Multi-line and partial
                selections
              </span>
            </li>
            <li className="flex gap-2">
              <span>-</span>
              <span>
                <strong>Code Changes:</strong> All text insertions and deletions
              </span>
            </li>
            <li className="flex gap-2">
              <span>-</span>
              <span>
                <strong>Language Changes:</strong> Syntax highlighting updates
              </span>
            </li>
            <li className="flex gap-2">
              <span>-</span>
              <span>
                <strong>Timing:</strong> Millisecond-precise timestamps
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
        <h3 className="font-semibold text-card-foreground mb-3 flex items-center gap-2">
          Pro Tips
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
          <ul className="space-y-1">
            <li>- Use descriptive session titles for easy identification</li>
            <li>- Pause recording during breaks to keep sessions focused</li>
            <li>
              - Start with an empty editor for the best playback experience
            </li>
          </ul>
          <ul className="space-y-1">
            <li>- Recordings are saved automatically to localStorage</li>
            <li>- Sessions can be replayed at different speeds (0.25x - 4x)</li>
            <li>- Navigate to the View tab to watch your recordings</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function RecordPage() {
  return (
    <Suspense>
      <RecordPageContent />
    </Suspense>
  );
}
