import { useState, useCallback, useRef, useEffect } from 'react';
import { RecordingManager } from '@/core/RecordingManager';
import type * as monacoType from 'monaco-editor';
import {
  RecordingSessionState,
  RecordingState,
  RecordingSession,
  Position,
  Selection,
  Range,
} from '@/types/recordings';
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

  handleEditorChange: (value: string | undefined, event: any) => void;
  handleEditorMount: (editor: any, monaco: any) => void;

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
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
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
  const disposablesRef = useRef<any[]>([]);

  const updateSessionState = useCallback(() => {
    const manager = getManager();
    const newState = manager.getRecordingState();
    setSessionState(newState);
    setCurrentDuration(manager.getCurrentDuration());
  }, [getManager]);

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
    [updateSessionState, onError, getManager]
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
    (value: string | undefined, event: any) => {
      const manager = getManager();
      if (!manager.isRecording() || !event) return;

      if (event.changes && Array.isArray(event.changes)) {
        const changes = event.changes.map((change: any) => ({
          range: {
            startLineNumber: change.range?.startLineNumber || 1,
            startColumn: change.range?.startColumn || 1,
            endLineNumber: change.range?.endLineNumber || 1,
            endColumn: change.range?.endColumn || 1,
          } as Range,
          rangeLength: change.rangeLength || 0,
          text: change.text || '',
        }));

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
      if (manager.isRecording()) {
        setupMonacoListeners(editor, monaco, manager);
      }
    },
    [getManager]
  );

  const setupMonacoListeners = useCallback(
    (editor: any, monaco: any, manager: RecordingManager) => {
      if (!editor || !monaco || !manager) {
        console.warn('Missing required dependencies for Monaco listeners');
        return;
      }

      disposablesRef.current.forEach((d) => d?.dispose?.());
      disposablesRef.current = [];

      try {
        const onDidChangeCursorPosition = editor.onDidChangeCursorPosition?.(
          (e: any) => {
            if (!manager.isRecording()) return;

            const position: Position = {
              lineNumber: e.position?.lineNumber || 1,
              column: e.position?.column || 1,
            };

            manager.recordCursorPosition(position);
          }
        );

        const onDidChangeCursorSelection = editor.onDidChangeCursorSelection?.(
          (e: any) => {
            if (!manager.isRecording()) return;

            const selection: Selection = {
              selectionStartLineNumber:
                e.selection?.selectionStartLineNumber || 1,
              selectionStartColumn: e.selection?.selectionStartColumn || 1,
              positionLineNumber: e.selection?.positionLineNumber || 1,
              positionColumn: e.selection?.positionColumn || 1,
            };

            manager.recordSelectionChange(selection);
          }
        );

        const onKeyDown = editor.onKeyDown?.((e: any) => {
          if (!manager.isRecording()) return;

          const position = editor.getPosition?.();
          if (!position) return;

          const pos: Position = {
            lineNumber: position.lineNumber || 1,
            column: position.column || 1,
          };

          manager.recordKeystroke(e.code || e.key || 'Unknown', pos, {
            altKey: e.altKey || false,
            ctrlKey: e.ctrlKey || false,
            metaKey: e.metaKey || false,
            shiftKey: e.shiftKey || false,
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
