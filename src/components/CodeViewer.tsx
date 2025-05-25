import React from 'react';
import { FileEntry } from '@/types'; // Using alias
import { EyeIcon, FileTextIcon } from '@components/Icons'; // Using alias

interface CodeViewerProps {
  file: FileEntry | undefined;
  onFileContentChange: (newContent: string) => void;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ file, onFileContentChange }) => {
  if (!file) {
    return (
      <div className="w-1/3 bg-gray-850 border-l border-gray-700 p-6 flex flex-col items-center justify-center text-gray-500">
        <EyeIcon className="w-16 h-16 mb-4" />
        <p className="text-lg">Select a file to view its content.</p>
      </div>
    );
  }

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onFileContentChange(event.target.value);
  };

  return (
    <div className="w-1/3 bg-gray-850 border-l border-gray-700 flex flex-col overflow-hidden">
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex items-center">
        <FileTextIcon className="w-5 h-5 mr-2 text-indigo-400" />
        <h2 className="text-md font-semibold text-gray-200 truncate">{file.name}</h2>
      </div>
      <div className="flex-1 bg-gray-900"> {/* Removed p-1 and overflow-auto here, textarea will handle scroll */}
        <textarea
          value={file.content}
          onChange={handleChange}
          className="w-full h-full p-4 text-sm text-gray-200 bg-gray-900 border-0 resize-none focus:outline-none font-mono"
          spellCheck="false" // Often good for code editors
        />
      </div>
       {file.isNew && (
        <div className="p-2 text-xs bg-green-800 text-green-200 text-center border-t border-green-700">
          This file was newly created by the AI. {/* This might need reconsideration if user edits mark it not new */}
        </div>
      )}
    </div>
  );
};

export default CodeViewer;
