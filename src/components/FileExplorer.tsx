
import React from 'react';
import { FilesState, FileEntry } from '@/types'; // Using alias
import { FileTextIcon, FolderIcon, PlusCircleIcon } from '@components/Icons'; // Using alias

interface FileExplorerProps {
  files: FilesState;
  selectedFile: string;
  onSelectFile: (fileName: string) => void;
}

interface Directory {
  [key: string]: Directory | FileEntry;
}

const buildFileTree = (files: FilesState): Directory => {
  const tree: Directory = {};
  Object.values(files).forEach(file => {
    const parts = file.name.split('/');
    let currentLevel = tree;
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        currentLevel[part] = file;
      } else {
        if (!currentLevel[part] || !(typeof currentLevel[part] === 'object' && !('content' in currentLevel[part]))) {
          currentLevel[part] = {};
        }
        currentLevel = currentLevel[part] as Directory;
      }
    });
  });
  return tree;
};

const FileTreeItem: React.FC<{
  name: string;
  item: FileEntry | Directory;
  selectedFile: string;
  onSelectFile: (fileName: string) => void;
  path: string;
  level: number;
  // Fix: Add explicit React.ReactNode return type (already present in provided code)
}> = ({ name, item, selectedFile, onSelectFile, path, level }): React.ReactNode => {
  const currentPath = path ? `${path}/${name}` : name;

  if ('content' in item) { // It's a file
    const file = item as FileEntry;
    return (
      <li
        key={file.name}
        onClick={() => onSelectFile(file.name)}
        className={`flex items-center py-1.5 px-3 cursor-pointer text-sm rounded-md
                    ${selectedFile === file.name ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700 text-gray-300'}
                    transition-colors duration-150`}
        style={{ paddingLeft: `${level * 1 + 0.75}rem` }} // Indentation
        title={file.name}
      >
        <FileTextIcon className={`w-4 h-4 mr-2 flex-shrink-0 ${file.isNew ? 'text-green-400' : ''}`} />
        <span className="truncate">{name}</span>
        {file.isNew && <PlusCircleIcon className="w-3 h-3 ml-auto text-green-400 flex-shrink-0" title="Newly created file" />}
      </li>
    );
  } else { // It's a directory
    return (
      <li key={name} className="my-1">
        <div 
          className="flex items-center py-1.5 px-3 text-sm text-gray-400"
          style={{ paddingLeft: `${level * 1 + 0.75}rem` }}
          title={name}
        >
          <FolderIcon className="w-4 h-4 mr-2 flex-shrink-0 text-indigo-400" />
          <span className="font-medium truncate">{name}</span>
        </div>
        <ul className="pl-0">
          {Object.entries(item as Directory)
            .sort(([nameA], [nameB]) => nameA.localeCompare(nameB)) // Sort entries alphabetically
            .map(([subName, subItem]) => (
            <FileTreeItem
              key={subName}
              name={subName}
              item={subItem}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              path={currentPath}
              level={level + 1}
            />
          ))}
        </ul>
      </li>
    );
  }
};


const FileExplorer: React.FC<FileExplorerProps> = ({ files, selectedFile, onSelectFile }) => {
  const fileTree = buildFileTree(files);

  return (
    <div className="w-full p-4 overflow-y-auto flex-grow">
      <h2 className="text-lg font-semibold text-gray-200 mb-3 sr-only">Project Files</h2>
      {Object.keys(files).length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No files in this project.</p>
      ) : (
        <ul className="space-y-0.5">
          {Object.entries(fileTree)
            .sort(([nameA], [nameB]) => nameA.localeCompare(nameB)) // Sort top-level entries
            .map(([name, item]) => (
            <FileTreeItem
              key={name}
              name={name}
              item={item}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              path=""
              level={0}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default FileExplorer;