'use client';

import { Editor } from '@monaco-editor/react';
import React, { useState } from 'react';

export default function MonacoEditor(): React.JSX.Element {
  const [value, setValue] = useState('// Welcome to the Interactive Code Editor\n// Start typing your code here...\n\nfunction hello() {\n  console.log("Hello World!");\n}\n\n// Click "Start Recording" to begin capturing your coding session\n// All your keystrokes, cursor movements, and selections will be recorded');

  const handleEditorChange = (newValue: string | undefined) => {
    setValue(newValue || '');
  };

  return (
    <div className="w-full h-full flex flex-col gap-4">
      
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
            fontSize: 14,
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
        />
      </div>
    </div>
  );
}
