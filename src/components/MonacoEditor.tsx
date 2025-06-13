import React, { useRef, useEffect } from 'react';
import type * as Monaco from 'monaco-editor';

interface MonacoEditorProps {
  language: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  language,
  value,
  onChange,
  readOnly = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

  // Effect for initializing and cleaning up the Monaco editor instance.
  // Uses dynamic import so the heavy editor code is split into a separate chunk.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!editorRef.current || monacoEditorRef.current) return;

      try {
        const monaco = await import('monaco-editor');
        if (cancelled || !editorRef.current) return;

        monacoEditorRef.current = monaco.editor.create(editorRef.current, {
          value,
          language,
          theme: 'vs-dark',
          scrollBeyondLastLine: false,
          fontSize: 14,
          renderLineHighlight: 'gutter',
          minimap: { enabled: false },
          wordWrap: 'on',
          automaticLayout: true,
          readOnly,
        });

        monacoEditorRef.current.onDidChangeModelContent(() => {
          if (onChange) {
            onChange(monacoEditorRef.current?.getValue() || '');
          }
        });
      } catch (error) {
        console.error('Failed to load Monaco editor:', error);
      }
    }

    init();

    // Cleanup function: dispose the editor instance when the component unmounts.
    return () => {
      cancelled = true;
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose();
        monacoEditorRef.current = null;
      }
    };
  }, [language, onChange]); // Dependencies: re-run if language or onChange handler changes.

  // Effect for handling updates to the `value` prop from outside the editor.
  // This ensures the editor's content stays in sync with the parent component's state.
  useEffect(() => {
    // If the editor instance exists and its current value is different from the prop value,
    // update the editor's value.
    if (monacoEditorRef.current && monacoEditorRef.current.getValue() !== value) {
      monacoEditorRef.current.setValue(value);
    }
  }, [value]); // Dependency: re-run only if the `value` prop changes.

  // Update readOnly option whenever the prop changes
  useEffect(() => {
    if (monacoEditorRef.current) {
      monacoEditorRef.current.updateOptions({ readOnly });
    }
  }, [readOnly]);

  return <div ref={editorRef} style={{ width: '100%', height: '500px' }} />;
};

export default MonacoEditor;
