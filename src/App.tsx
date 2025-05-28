import React, { useState, useEffect, useCallback } from 'react';
import { Message, FilesState, PlanStep, AiActionType } from '@/types';
import { PROJECT_EXAMPLES, DEFAULT_PROJECT_KEY, GEMINI_SYSTEM_PROMPT_TEMPLATE } from '@/constants';
import FileExplorer from '@components/FileExplorer';
import ChatWindow from '@components/ChatWindow';
import MonacoEditor from '@components/MonacoEditor';
import { LoadingSpinner, SendIcon, BrainIcon, AlertTriangleIcon, ChevronDownIcon } from '@components/Icons';
import ThemeToggle from '@components/ThemeToggle'; // Add this line
import { useGenAI } from '@contexts/GenAIContext';
import { CreateChatParameters } from '@google/genai';

const getMonacoLanguage = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js': return 'javascript';
    case 'ts':
    case 'tsx': return 'typescript';
    case 'json': return 'json';
    case 'css': return 'css';
    case 'html': return 'html';
    case 'md': return 'markdown';
    case 'py': return 'python';
    default: return 'plaintext';
  }
};

const AppContent: React.FC = () => {
  const { initializeChatInContext, sendMessageStreamInContext, isGenAIInitialized, apiKeyMissing } = useGenAI();

  const [selectedProjectKey, setSelectedProjectKey] = useState<string>(DEFAULT_PROJECT_KEY);
  const [files, setFiles] = useState<FilesState>(PROJECT_EXAMPLES[DEFAULT_PROJECT_KEY].files);
  const [selectedFile, setSelectedFile] = useState<string>(Object.keys(PROJECT_EXAMPLES[DEFAULT_PROJECT_KEY].files)[0] || '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPlan, setCurrentPlan] = useState<PlanStep[]>([]);
  const [currentTaskDescription, setCurrentTaskDescription] = useState<string>('');

  const appLevelInitializeChat = useCallback((projectFiles: FilesState, projectKey: string) => {
    if (!isGenAIInitialized) {
      if (!apiKeyMissing) {
        setMessages([{ id: 'genai-init-fail-context', sender: 'system', text: 'AI initialization failed. Check API key or network.', type: 'error' }]);
      }
      return;
    }

    const fileNames = Object.keys(projectFiles).join(', ');
    const systemInstruction = GEMINI_SYSTEM_PROMPT_TEMPLATE.replace('{{FILE_NAMES}}', fileNames);
    const fileContents = Object.entries(projectFiles)
      .map(([name, entry]) => {
        const fileHeader = `File: \`${name}\``;
        const codeBlock = `\`\`\`${getMonacoLanguage(name)}\n${entry.content}\n\`\`\``;
        return `${fileHeader}\n${codeBlock}`;
      })
      .join('\n\n');

    const history = [
      { role: 'user', parts: [{ text: `Here is the initial state of the project files:\n${fileContents}\n\nMy first request will follow.` }] },
      { role: 'model', parts: [{ text: 'Understood. Ready for requests.' }] }
    ];

    const chatParams: CreateChatParameters = {
      model: 'gemini-2.5-flash-preview-04-17',
      config: { systemInstruction },
      history,
    };
    initializeChatInContext(chatParams);
    setMessages([{ id: 'init-chat', sender: 'system', text: `AI context initialized for ${PROJECT_EXAMPLES[projectKey]?.name || 'project'}.`, type: 'status' }]);
  }, [isGenAIInitialized, initializeChatInContext, apiKeyMissing]);

  useEffect(() => {
    if (isGenAIInitialized) {
      const project = PROJECT_EXAMPLES[selectedProjectKey];
      setFiles(project.files);
      const first = Object.keys(project.files)[0] || '';
      setSelectedFile(first);
      setMessages([]);
      setCurrentPlan([]);
      setCurrentTaskDescription('');
      setUserInput('');
      appLevelInitializeChat(project.files, selectedProjectKey);
    }
  }, [isGenAIInitialized, selectedProjectKey, appLevelInitializeChat]);

  const processAiResponse = useCallback((responseText?: string) => {
    const text = responseText || '';
    const lines = text.split(/\r?\n/);
    let fileName: string | null = null;
    let buffer: string[] = [];
    let inBlock = false;

    const newMsgs: Message[] = [];
    const newSteps: PlanStep[] = [];

    for (const raw of lines) {
      const line = raw.trim();
      if (line.startsWith(AiActionType.PLAN)) {
        const desc = line.slice(AiActionType.PLAN.length).trim();
        const step = { id: Date.now().toString(), description: desc };
        newSteps.push(step);
        newMsgs.push({ ...step, sender: 'ai', text: desc, type: 'plan_step' });
      } else if (line.startsWith(AiActionType.CODE_UPDATE)) {
        if (inBlock && fileName) {
          const content = buffer.join('\n');
          setFiles(prev => ({ ...prev, [fileName!]: { name: fileName!, content, isNew: !prev[fileName!] } }));
          newMsgs.push({ id: Date.now().toString(), sender: 'ai', text: `Updated file: ${fileName}`, type: 'code_update', fileName, codeContent: content });
        }
        fileName = line.slice(AiActionType.CODE_UPDATE.length).trim().replace(/`/g, '');
        inBlock = true;
        buffer = [];
      } else if (line.startsWith('```') && inBlock) {
        inBlock = false;
      } else if (inBlock && fileName) {
        buffer.push(raw);
      } else if (line.startsWith(AiActionType.SIMULATING_TEST)) {
        const msg = line.slice(AiActionType.SIMULATING_TEST.length).trim();
        newMsgs.push({ id: Date.now().toString(), sender: 'ai', text: `Simulating test: ${msg}`, type: 'test_log' });
      } else if (line.startsWith(AiActionType.TEST_RESULT)) {
        const msg = line.slice(AiActionType.TEST_RESULT.length).trim();
        newMsgs.push({ id: Date.now().toString(), sender: 'ai', text: `Test result: ${msg}`, type: 'test_log' });
      } else if (line.startsWith(AiActionType.TASK_COMPLETE)) {
        newMsgs.push({ id: Date.now().toString(), sender: 'ai', text: 'Task Complete!', type: 'task_complete' });
        setCurrentPlan([]);
        setCurrentTaskDescription('');
        setFiles(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(k => { updated[k].isNew = false; });
          return updated;
        });
      } else if (line.startsWith(AiActionType.ERROR)) {
        const msg = line.slice(AiActionType.ERROR.length).trim();
        newMsgs.push({ id: Date.now().toString(), sender: 'ai', text: `Error: ${msg}`, type: 'error' });
      } else if (line) {
        newMsgs.push({ id: Date.now().toString(), sender: 'ai', text: line });
      }
    }

    if (newSteps.length) setCurrentPlan(p => [...p, ...newSteps]);
    if (newMsgs.length) setMessages(m => [...m, ...newMsgs]);
  }, []);

  const handleSend = async () => {
    if (!userInput.trim() || isLoading || !isGenAIInitialized) {
      if (!isGenAIInitialized) {
        setMessages(prev => [...prev, { id: 'send-fail-no-init', sender: 'system', text: 'Cannot send: AI not initialized.', type: 'error' }]);
      }
      return;
    }
    const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: userInput };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    if (!currentTaskDescription) setCurrentTaskDescription(userInput);

    let streamBuffer = '';
    try {
      await sendMessageStreamInContext(
        userInput,
        chunk => { streamBuffer += chunk; },
        error => { setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'system', text: `API Stream Error: ${error}`, type: 'error' }]); setIsLoading(false); },
        () => { processAiResponse(streamBuffer); setIsLoading(false); }
      );
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'system', text: `Streaming Setup Error: ${e}`, type: 'error' }]);
      setIsLoading(false);
    }
  };

  const handleFileSelect = (fileName: string) => setSelectedFile(fileName);

  const handleCodeChange = (newContent: string) => {
    if (selectedFile) {
      setFiles(prev => ({ ...prev, [selectedFile]: { ...prev[selectedFile], content: newContent } }));
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => setSelectedProjectKey(e.target.value);

  if (apiKeyMissing) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="p-8 bg-red-800 rounded-lg shadow-xl text-center max-w-md">
          <AlertTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">API Key Configuration Error</h1>
          <p className="mb-1">The VITE_GEMINI_API_KEY environment variable appears to be missing or invalid.</p>
          <p className="text-sm text-red-200">Please configure it in your environment and restart.</p>
        </div>
      </div>
    );
  }

  if (!isGenAIInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="p-8 bg-yellow-700 rounded-lg shadow-xl text-center max-w-md">
          <BrainIcon className="w-16 h-16 text-yellow-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">AI Not Ready</h1>
          <p className="mb-1">The AI model is initializing or encountered a problem.</p>
          <p className="text-sm text-yellow-200">Please wait or refresh the page.</p>
          <LoadingSpinner className="w-8 h-8 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <div className="w-72 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="project-select" className="block text-sm font-medium text-gray-400">Current Project:</label>
            <ThemeToggle />
          </div>
          <div className="relative">
            <select id="project-select" value={selectedProjectKey} onChange={handleProjectChange} disabled={isLoading || !isGenAIInitialized} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
              {Object.entries(PROJECT_EXAMPLES).map(([key, proj]) => <option key={key} value={key}>{proj.name}</option>)}
            </select>
            <ChevronDownIcon className="w-5 h-5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        <FileExplorer files={files} selectedFile={selectedFile} onSelectFile={handleFileSelect} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {currentTaskDescription && (
          <div className="p-3 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center text-sm text-indigo-400">
              <BrainIcon className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="truncate">Current Task: {currentTaskDescription}</span>
              {isLoading && <LoadingSpinner className="w-4 h-4 ml-2 flex-shrink-0" />}
            </div>
            {currentPlan.length > 0 && (
              <div className="mt-2">
                <h3 className="text-xs font-semibold text-gray-400 mb-1">Plan:</h3>
                <ul className="list-disc list-inside pl-2 space-y-0.5">{currentPlan.map(step => <li key={step.id} className="text-xs text-gray-300 truncate">{step.description}</li>)}</ul>
              </div>
            )}
          </div>
        )}
        <ChatWindow messages={messages} />
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex items-center bg-gray-700 rounded-lg p-1">
            <textarea rows={1} placeholder="Describe changes..." value={userInput} onChange={e => setUserInput(e.target.value)} onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} disabled={isLoading || !isGenAIInitialized} className="flex-grow p-2 bg-transparent text-gray-100 focus:outline-none resize-none placeholder-gray-500" />
            <button onClick={handleSend} disabled={isLoading || !userInput.trim() || !isGenAIInitialized} aria-label="Send message" className="p-2 text-indigo-400 hover:text-indigo-300 disabled:text-gray-600 disabled:cursor-not-allowed">{isLoading ? <LoadingSpinner className="w-5 h-5" /> : <SendIcon className="w-5 h-5" />}</button>
          </div>
        </div>
      </div>

      <div className="w-1/3 bg-gray-850 border-l border-gray-700">
        {selectedFile && files[selectedFile] ? (
          <MonacoEditor language={getMonacoLanguage(selectedFile)} value={files[selectedFile].content} onChange={handleCodeChange} />
        ) : (
          <div className="p-6 flex flex-col items-center justify-center text-gray-500">
            <AlertTriangleIcon className="w-16 h-16 mb-4 text-yellow-500" />
            <p className="text-lg">No file selected or project empty.</p>
            <p className="text-sm">Select a project and a file to view content.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => <AppContent />;

export default App;
