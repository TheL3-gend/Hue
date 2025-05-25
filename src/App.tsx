import React, { useState, useEffect, useCallback } from 'react';
import { Message, FilesState, PlanStep, AiActionType } from '@/types';
import { PROJECT_EXAMPLES, DEFAULT_PROJECT_KEY, GEMINI_SYSTEM_PROMPT_TEMPLATE } from '@/constants';
import FileExplorer from '@components/FileExplorer';
import ChatWindow from '@components/ChatWindow';
import MonacoEditor from '@components/MonacoEditor'; // Switched to MonacoEditor
import { LoadingSpinner, SendIcon, BrainIcon, AlertTriangleIcon, CheckCircleIcon, ChevronDownIcon } from '@components/Icons';
import { useGenAI } from '@contexts/GenAIContext';
import { CreateChatParameters } from '@google/genai';

// Helper function to determine Monaco language mode based on file extension
const getMonacoLanguage = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'js':
      return 'javascript';
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'typescript'; // Monaco uses 'typescript' for tsx
    case 'json':
      return 'json';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'md':
      return 'markdown';
    case 'py':
      return 'python';
    default:
      return 'plaintext';
  }
};

const AppContent: React.FC = () => {
  const { initializeChatInContext, sendMessageStreamInContext, isGenAIInitialized, apiKeyMissing } = useGenAI(); // Added initializeChatInContext
  
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
         console.error("GenAI Client not initialized, but API key is supposedly present. Check GenAIContext initialization.");
         setMessages([{id: 'genai-init-fail-context', sender: 'system', text: "AI Client initialization failed in context. Check console.", type: 'error'}]);
      }
      return;
    }

    const initialFileNames = Object.keys(projectFiles).join(', ');
    const systemInstruction = GEMINI_SYSTEM_PROMPT_TEMPLATE.replace('{{FILE_NAMES}}', initialFileNames);

    const initialFileContents = Object.entries(projectFiles)
      .map(([name, entry]) => `File: \`${name}\`
\`\`\`${getMonacoLanguage(name)}
${entry.content}
\`\`\``)
      .join('

');

    const history = [
      { role: "user", parts: [{ text: `Here is the initial state of the project files:
${initialFileContents}

My first request will follow.` }] },
      { role: "model", parts: [{ text: "Understood. I am ready for your request." }] }
    ];
    
    const chatParams: CreateChatParameters = {
      model: 'gemini-2.5-flash-preview-04-17', 
      config: { systemInstruction },
      history: history
    };
    initializeChatInContext(chatParams); 

    setMessages([{id: 'init-chat', sender: 'system', text: `AI context initialized for ${PROJECT_EXAMPLES[projectKey]?.name || 'project'}. Ready for your request.`}]);
  }, [isGenAIInitialized, initializeChatInContext, apiKeyMissing]);

  useEffect(() => {
    if (isGenAIInitialized) {
      const currentProject = PROJECT_EXAMPLES[selectedProjectKey];
      if (currentProject) {
        console.log(`[App.tsx] Project changed to: ${selectedProjectKey}. Initializing with files:`, currentProject.files);
        setFiles(currentProject.files);
        const firstFile = Object.keys(currentProject.files)[0];
        setSelectedFile(firstFile || '');
        setMessages([]); 
        setCurrentPlan([]);
        setCurrentTaskDescription('');
        setUserInput('');
        appLevelInitializeChat(currentProject.files, selectedProjectKey);
      }
    } else if (apiKeyMissing) {
        console.warn("[App.tsx] GenAI not initialized due to missing API Key.");
    }
  }, [isGenAIInitialized, selectedProjectKey, appLevelInitializeChat, apiKeyMissing]);

  const processAiResponse = (responseText: string | null | undefined) => {
    const textToProcess = responseText ?? "";
    const lines = textToProcess.split(new RegExp('?
')); // Using RegExp constructor
    let currentCodeBlockFileName: string | null = null;
    let currentCodeBlockContent: string[] = [];
    let inCodeBlock = false;

    const newMessages: Message[] = [];
    const newPlanSteps: PlanStep[] = [];

    for (const line of lines) {
      if (line.startsWith(AiActionType.PLAN)) {
        const description = line.substring(AiActionType.PLAN.length).trim();
        const planStep = { id: Date.now().toString() + Math.random(), description };
        newPlanSteps.push(planStep);
        newMessages.push({ id: planStep.id, sender: 'ai', text: description, type: 'plan_step' });
      } else if (line.startsWith(AiActionType.CODE_UPDATE)) {
        if (inCodeBlock && currentCodeBlockFileName) { 
           console.warn("Nested CODE_UPDATE detected. Processing previous block for:", currentCodeBlockFileName);
           const codeContent = currentCodeBlockContent.join('
');
           setFiles(prevFiles => ({
             ...prevFiles,
             [currentCodeBlockFileName!]: { name: currentCodeBlockFileName!, content: codeContent, isNew: !prevFiles[currentCodeBlockFileName!] }
           }));
           newMessages.push({ id: Date.now().toString() + Math.random(), sender: 'ai', text: `Updated file: ${currentCodeBlockFileName}`, type: 'code_update', fileName: currentCodeBlockFileName, codeContent });
           setSelectedFile(currentCodeBlockFileName);
        }
        currentCodeBlockFileName = line.substring(AiActionType.CODE_UPDATE.length).trim().replace(/[\`]/g, '');
        inCodeBlock = true;
        currentCodeBlockContent = []; 
      } else if (line.startsWith('\`\`\`') && inCodeBlock && currentCodeBlockFileName) { // Simplified code block end detection
        const codeContent = currentCodeBlockContent.join('
'); 
        setFiles(prevFiles => {
          const isNew = !prevFiles[currentCodeBlockFileName!];
          return {
          ...prevFiles,
          [currentCodeBlockFileName!]: { name: currentCodeBlockFileName!, content: codeContent, isNew }
        }});
        newMessages.push({ id: Date.now().toString(), sender: 'ai', text: `Updated file: ${currentCodeBlockFileName}`, type: 'code_update', fileName: currentCodeBlockFileName, codeContent });
        setSelectedFile(currentCodeBlockFileName);
        inCodeBlock = false;
        currentCodeBlockFileName = null;
        currentCodeBlockContent = [];
      } else if (inCodeBlock) {
         // Check for language specifier (e.g., ```tsx) and skip if it's the first line of code block content
        if (currentCodeBlockContent.length === 0 && line.match(/^\`\`\`[a-zA-Z]*$/)) {
          // This line is likely the language specifier, e.g., ```tsx or ```python
          // We don't want to add it to the code content itself.
        } else {
          currentCodeBlockContent.push(line);
        }
      } else if (line.startsWith(AiActionType.SIMULATING_TEST)) {
        const text = line.substring(AiActionType.SIMULATING_TEST.length).trim();
        newMessages.push({ id: Date.now().toString(), sender: 'ai', text: `Simulating test: ${text}`, type: 'test_log' });
      } else if (line.startsWith(AiActionType.TEST_RESULT)) {
        const text = line.substring(AiActionType.TEST_RESULT.length).trim();
        newMessages.push({ id: Date.now().toString(), sender: 'ai', text: `Test result: ${text}`, type: 'test_log' });
      } else if (line.startsWith(AiActionType.TASK_COMPLETE)) {
        newMessages.push({ id: Date.now().toString(), sender: 'ai', text: 'Task Complete!', type: 'task_complete' });
        setCurrentPlan([]);
        setCurrentTaskDescription('');
        setFiles(prevFiles => {
          const updatedFiles = {...prevFiles};
          Object.keys(updatedFiles).forEach(key => {
            if(updatedFiles[key].isNew) {
              updatedFiles[key] = {...updatedFiles[key], isNew: false};
            }
          });
          return updatedFiles;
        });
      } else if (line.startsWith(AiActionType.ERROR)) {
        const text = line.substring(AiActionType.ERROR.length).trim();
        newMessages.push({ id: Date.now().toString(), sender: 'ai', text: `Error: ${text}`, type: 'error' });
      } else if (line.trim()) { 
        newMessages.push({ id: Date.now().toString(), sender: 'ai', text: line });
      }
    }
    if (inCodeBlock && currentCodeBlockFileName) {
      console.warn("AI response ended with an unterminated code block for:", currentCodeBlockFileName);
      const codeContent = currentCodeBlockContent.join('
');
      setFiles(prevFiles => {
        const isNew = !prevFiles[currentCodeBlockFileName!];
        return {
        ...prevFiles,
        [currentCodeBlockFileName!]: { name: currentCodeBlockFileName!, content: codeContent, isNew }
      }});
      newMessages.push({ id: Date.now().toString(), sender: 'ai', text: `Force-closed code update for ${currentCodeBlockFileName}`, type: 'code_update', fileName: currentCodeBlockFileName, codeContent });
      setSelectedFile(currentCodeBlockFileName);
    }
    
    if (newPlanSteps.length > 0) {
      setCurrentPlan(prev => [...prev, ...newPlanSteps]);
    }
    if (newMessages.length > 0) {
      setMessages(prev => [...prev, ...newMessages]);
    }
  };

  const handleSend = async () => {
    if (!userInput.trim() || isLoading || !isGenAIInitialized) {
        if(!isGenAIInitialized) {
             setMessages(prev => [...prev, {id: 'send-fail-no-init', sender: 'system', text: "Cannot send: AI is not initialized. Please check your API Key setup or try refreshing.", type: 'error'}]);
        }
        return;
    }

    const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: userInput };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setIsLoading(true);
    if (!currentTaskDescription) setCurrentTaskDescription(userInput); 
    
    let accumulatedResponseForStream = ""; // Reset for each send operation
    setUserInput('');

    try {
      await sendMessageStreamInContext(
        userInput,
        (chunkText) => { 
          accumulatedResponseForStream += chunkText;
        },
        (error) => { 
          console.error("Error from sendMessageStreamInContext (onError callback):", error);
          const errorMessageText = error instanceof Error ? error.message : "An unknown streaming error occurred";
          setMessages(prevMessages => [...prevMessages, { id: Date.now().toString(), sender: 'system', text: `API Stream Error: ${errorMessageText}`, type: 'error' }]);
          setIsLoading(false);
        },
        () => { // onComplete
          processAiResponse(accumulatedResponseForStream);
          setIsLoading(false);
        }
      );
    } catch (error) { 
      console.error("Error calling sendMessageStreamInContext:", error);
      const errorMessageText = error instanceof Error ? error.message : "An unknown error occurred setting up stream";
      setMessages(prevMessages => [...prevMessages, { id: Date.now().toString(), sender: 'system', text: `Streaming Setup Error: ${errorMessageText}`, type: 'error' }]);
      setIsLoading(false);
    }
  };
  
  const handleFileSelect = (fileName: string) => {
    console.log(`[App.tsx] handleFileSelect: User selected file '${fileName}'`);
    setSelectedFile(fileName);
  };

  // Renamed to handleCodeChange and to be used with MonacoEditor
  const handleCodeChange = (newContent: string) => {
    if (selectedFile && files[selectedFile]) {
      setFiles(prevFiles => {
        const updatedFileEntry = {
          ...prevFiles[selectedFile],
          content: newContent,
        };
        const newState = {
          ...prevFiles,
          [selectedFile]: updatedFileEntry,
        };
        // console.log("[App.tsx] handleCodeChange - User edit. New files state:", newState); // Optional: for debugging
        return newState;
      });
    }
  };

  const handleProjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newProjectKey = event.target.value;
    console.log(`[App.tsx] handleProjectChange: User selected project '${newProjectKey}'`);
    setSelectedProjectKey(newProjectKey);
  };

  if (apiKeyMissing) { 
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="p-8 bg-red-800 rounded-lg shadow-xl text-center max-w-md">
          <AlertTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">API Key Configuration Error</h1>
          <p className="mb-1">The VITE_GEMINI_API_KEY environment variable appears to be missing or invalid, preventing the AI from initializing.</p>
          <p className="text-sm text-red-200">Please refer to the setup instructions to ensure the API key is correctly configured in your environment and restart the application.</p>
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
          <p className="mb-1">The AI model is currently initializing or encountered a problem during startup.</p>
          <p className="text-sm text-yellow-200">Please wait a few moments. If this message persists, try refreshing the page. If the issue continues, ensure your API key is valid and your internet connection is stable.</p>
           <LoadingSpinner className="w-8 h-8 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen font-sans bg-gray-900 text-gray-100">
      <div className="w-72 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <label htmlFor="project-select" className="block text-sm font-medium text-gray-400 mb-1">
            Current Project:
          </label>
          <div className="relative">
            <select
              id="project-select"
              value={selectedProjectKey}
              onChange={handleProjectChange}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
              disabled={isLoading || !isGenAIInitialized}
            >
              {Object.entries(PROJECT_EXAMPLES).map(([key, proj]) => (
                <option key={key} value={key}>
                  {proj.name}
                </option>
              ))}
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
                <ul className="list-disc list-inside pl-2 space-y-0.5">
                  {currentPlan.map(step => (
                    <li key={step.id} className="text-xs text-gray-300 truncate">{step.description}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <ChatWindow messages={messages} isLoading={isLoading} /> {/* Added isLoading prop */}
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="flex items-center bg-gray-700 rounded-lg p-1">
            <textarea
              rows={1}
              className="flex-grow p-2 bg-transparent text-gray-100 focus:outline-none resize-none placeholder-gray-500"
              placeholder={isGenAIInitialized ? "Describe the changes you want to make..." : "AI not available. Check API Key."}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isLoading || !isGenAIInitialized}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !userInput.trim() || !isGenAIInitialized}
              className="p-2 text-indigo-400 hover:text-indigo-300 disabled:text-gray-600 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              {isLoading ? <LoadingSpinner className="w-5 h-5" /> : <SendIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
      
      {Object.keys(files).length > 0 && selectedFile && files[selectedFile] ? (
        // Switched to MonacoEditor and passed necessary props
        <div className="w-1/3 bg-gray-850 border-l border-gray-700">
           <MonacoEditor 
             language={getMonacoLanguage(selectedFile)}
             value={files[selectedFile].content} 
             onChange={handleCodeChange} // Use handleCodeChange
           />
        </div>
      ) : (
         <div className="w-1/3 bg-gray-850 border-l border-gray-700 p-6 flex flex-col items-center justify-center text-gray-500">
           <AlertTriangleIcon className="w-16 h-16 mb-4 text-yellow-500" />
           <p className="text-lg">No file selected or project empty.</p>
           <p className="text-sm">Select a project and a file to view content.</p>
         </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return <AppContent />; 
};

export default App;