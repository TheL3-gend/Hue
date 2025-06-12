import React, { useRef, useEffect } from 'react';
import * as monaco from 'monaco-editor';

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
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Effect for initializing and cleaning up the Monaco editor instance.
  // Runs once when the component mounts (or when language/onChange props change, though language is typically static).
  useEffect(() => {
    // Only create the editor if the ref is available and an editor instance doesn't already exist.
    if (editorRef.current && !monacoEditorRef.current) {
      try {
        monacoEditorRef.current = monaco.editor.create(editorRef.current, {
          value: value, // Set the initial value of the editor
          language: language, // Set the language for syntax highlighting
          theme: 'vs-dark', // Use the vs-dark theme
          scrollBeyondLastLine: false, // Disable scrolling beyond the last line
          fontSize: 14, // Set a default font size
          renderLineHighlight: 'gutter', // Highlight the active line in the gutter
          minimap: { enabled: false }, // Disable the minimap
          wordWrap: 'on', // Enable word wrapping
          automaticLayout: true, // Ensure the editor resizes automatically
          readOnly,
        });

        // Attach listener for content changes
        monacoEditorRef.current.onDidChangeModelContent(() => {
          if (onChange) {
            onChange(monacoEditorRef.current?.getValue() || '');
          }
        });
      } catch (error) {
        console.error('Failed to create Monaco editor:', error);
      }
    }

    // Cleanup function: dispose the editor instance when the component unmounts.
    return () => {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose();
        // Set the ref to null to indicate the editor instance is gone.
        // This helps in re-initialization if the component is remounted.
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
