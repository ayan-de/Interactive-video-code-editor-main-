import { useState, useCallback, useRef, useEffect } from 'react';
import { RecordingManager, RecordingState } from '@repo/openscrim-core';
import type {
  RecordingSessionState,
  RecordingSession,
  Position,
  Selection,
  Range,
} from '@repo/openscrim-core';
import type * as monacoType from 'monaco-editor';
import { formatDuration } from '@/lib/formatDuration';

export interface UseRecordingProps {
  autoSave?: boolean;
  onSessionComplete?: (session: RecordingSession) => void;
  onError?: (error: Error) => void;
}

export interface UseRecordingReturn {
  sessionState: RecordingSessionState;
  isRecording: boolean;
  isPaused: boolean;
  currentDuration: number;
  eventCount: number;

  startRecording: (title?: string) => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => RecordingSession | null;

  handleEditorChange: (
    value: string | undefined,
    event: monacoType.editor.IModelContentChangedEvent
  ) => void;
  handleEditorMount: (
    editor: monacoType.editor.IStandaloneCodeEditor,
    monaco: typeof monacoType
  ) => void;

  formatDuration: (ms: number) => string;
  getRecordingManager: () => RecordingManager;
}

export function useRecording({
  autoSave = false,
  onSessionComplete,
  onError,
}: UseRecordingProps): UseRecordingReturn {
  const recordingManagerRef = useRef<RecordingManager | null>(null);
  const getManager = useCallback(() => {
    if (!recordingManagerRef.current) {
      recordingManagerRef.current = new RecordingManager();
    }
    return recordingManagerRef.current;
  }, []);
  const editorRef = useRef<monacoType.editor.IStandaloneCodeEditor | null>(
    null
  );
  const monacoRef = useRef<typeof monacoType | null>(null);
  const initialContentRef = useRef<string>('');

  const [sessionState, setSessionState] = useState<RecordingSessionState>({
    sessionId: null,
    state: RecordingState.IDLE,
    startTime: null,
    pausedTime: 0,
    currentDuration: 0,
    eventCount: 0,
    lastEventTimestamp: null,
  });

  const [currentDuration, setCurrentDuration] = useState(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const disposablesRef = useRef<monacoType.IDisposable[]>([]);

  const updateSessionState = useCallback(() => {
    const manager = getManager();
    const newState = manager.getRecordingState();
    setSessionState(newState);
    setCurrentDuration(manager.getCurrentDuration());
  }, [getManager]);

  const setupMonacoListeners = useCallback(
    (
      editor: monacoType.editor.IStandaloneCodeEditor,
      monaco: typeof monacoType,
      manager: RecordingManager
    ) => {
      if (!editor || !monaco || !manager) {
        console.warn('Missing required dependencies for Monaco listeners');
        return;
      }

      disposablesRef.current.forEach((d) => d?.dispose?.());
      disposablesRef.current = [];

      try {
        const onDidChangeCursorPosition = editor.onDidChangeCursorPosition(
          (e: monacoType.editor.ICursorPositionChangedEvent) => {
            if (!manager.isRecording()) return;

            const position: Position = {
              lineNumber: e.position.lineNumber,
              column: e.position.column,
            };

            manager.recordCursorPosition(position);
          }
        );

        const onDidChangeCursorSelection = editor.onDidChangeCursorSelection(
          (e: monacoType.editor.ICursorSelectionChangedEvent) => {
            if (!manager.isRecording()) return;

            const selection: Selection = {
              selectionStartLineNumber: e.selection.selectionStartLineNumber,
              selectionStartColumn: e.selection.selectionStartColumn,
              positionLineNumber: e.selection.positionLineNumber,
              positionColumn: e.selection.positionColumn,
            };

            manager.recordSelectionChange(selection);
          }
        );

        const onKeyDown = editor.onKeyDown((e: monacoType.IKeyboardEvent) => {
          if (!manager.isRecording()) return;

          const position = editor.getPosition();
          if (!position) return;

          const pos: Position = {
            lineNumber: position.lineNumber,
            column: position.column,
          };

          manager.recordKeystroke(e.code || 'Unknown', pos, {
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey,
          });
        });

        if (onDidChangeCursorPosition)
          disposablesRef.current.push(onDidChangeCursorPosition);
        if (onDidChangeCursorSelection)
          disposablesRef.current.push(onDidChangeCursorSelection);
        if (onKeyDown) disposablesRef.current.push(onKeyDown);
      } catch (error) {
        console.warn('Failed to set up some Monaco event listeners:', error);
      }
    },
    []
  );

  const startRecording = useCallback(
    (title: string = 'Untitled Session') => {
      try {
        const manager = getManager();

        if (editorRef.current) {
          initialContentRef.current = editorRef.current.getValue() || '';
        }

        const sessionId = manager.startRecording(title);
        updateSessionState();

        durationIntervalRef.current = setInterval(() => {
          setCurrentDuration(manager.getCurrentDuration());
        }, 100);

        if (editorRef.current && monacoRef.current) {
          setupMonacoListeners(editorRef.current, monacoRef.current, manager);
        }

        console.log(`Started recording session: ${sessionId}`);
      } catch (error) {
        onError?.(error as Error);
      }
    },
    [updateSessionState, onError, getManager, setupMonacoListeners]
  );

  const pauseRecording = useCallback(() => {
    try {
      const manager = getManager();
      manager.pauseRecording();
      updateSessionState();

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }, [updateSessionState, onError, getManager]);

  const resumeRecording = useCallback(() => {
    try {
      const manager = getManager();
      manager.resumeRecording();
      updateSessionState();

      durationIntervalRef.current = setInterval(() => {
        setCurrentDuration(manager.getCurrentDuration());
      }, 100);
    } catch (error) {
      onError?.(error as Error);
    }
  }, [updateSessionState, onError, getManager]);

  const stopRecording = useCallback(() => {
    try {
      const manager = getManager();
      const finalContent = editorRef.current?.getValue() || '';

      const session = manager.stopRecording(
        sessionState.sessionTitle || 'Untitled Session',
        'Recorded coding session',
        finalContent,
        initialContentRef.current
      );
      updateSessionState();

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      disposablesRef.current.forEach((d) => d?.dispose?.());
      disposablesRef.current = [];

      if (session) {
        onSessionComplete?.(session);

        if (autoSave) {
          console.log('Auto-saving recording session:', session.id);
        }
      }

      return session;
    } catch (error) {
      onError?.(error as Error);
      return null;
    }
  }, [
    updateSessionState,
    onSessionComplete,
    autoSave,
    onError,
    sessionState,
    getManager,
  ]);

  const handleEditorChange = useCallback(
    (
      value: string | undefined,
      event: monacoType.editor.IModelContentChangedEvent
    ) => {
      const manager = getManager();
      if (!manager.isRecording() || !event) return;

      if (event.changes && Array.isArray(event.changes)) {
        const changes = event.changes.map(
          (change: monacoType.editor.IModelContentChange) => ({
            range: {
              startLineNumber: change.range.startLineNumber,
              startColumn: change.range.startColumn,
              endLineNumber: change.range.endLineNumber,
              endColumn: change.range.endColumn,
            } as Range,
            rangeLength: change.rangeLength,
            text: change.text,
          })
        );

        manager.recordContentChange(
          changes,
          event.versionId || 0,
          '\n',
          false,
          false,
          false
        );
      }
    },
    [getManager]
  );

  const handleEditorMount = useCallback(
    (
      editor: monacoType.editor.IStandaloneCodeEditor,
      monaco: typeof monacoType
    ) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      const manager = getManager();
      const model = editor.getModel();
      if (model) {
        manager.setLanguage(model.getLanguageId());
      }

      const onDidChangeLanguage = monaco.editor.onDidChangeModelLanguage(
        (e) => {
          if (model && model.uri === e.model.uri) {
            manager.setLanguage(e.model.getLanguageId());
          }
        }
      );
      if (onDidChangeLanguage) disposablesRef.current.push(onDidChangeLanguage);

      if (manager.isRecording()) {
        setupMonacoListeners(editor, monaco, manager);
      }
    },
    [getManager, setupMonacoListeners]
  );

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      disposablesRef.current.forEach((d) => d?.dispose?.());
    };
  }, []);

  return {
    sessionState,
    isRecording: sessionState.state === RecordingState.RECORDING,
    isPaused: sessionState.state === RecordingState.PAUSED,
    currentDuration,
    eventCount: sessionState.eventCount,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    handleEditorChange,
    handleEditorMount,
    formatDuration: (ms: number) => formatDuration(ms, 'timer'),
    getRecordingManager: getManager,
  };
}
