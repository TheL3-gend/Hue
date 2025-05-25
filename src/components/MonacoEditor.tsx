import React, { useRef, useEffect } from 'react';
import * as monaco from 'monaco-editor';

interface MonacoEditorProps {
  language: string;
  value: string;
  onChange?: (value: string) => void;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  language,
  value,
  onChange,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (editorRef.current) {
      monacoEditorRef.current = monaco.editor.create(editorRef.current, {
        value: value,
        language: language,
        minimap: { enabled: false },
        wordWrap: 'on',
        automaticLayout: true,
      });

      monacoEditorRef.current.onDidChangeModelContent(() => {
        if (onChange) {
          onChange(monacoEditorRef.current?.getValue() || '');
        }
      });
    }

    return () => {
      monacoEditorRef.current?.dispose();
    };
  }, [language, value, onChange]);

  return <div ref={editorRef} style={{ width: '100%', height: '500px' }} />;
};

export default MonacoEditor;
