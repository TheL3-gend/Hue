import React, { useState, useEffect } from 'react';
import { Message, FilesState, PlanStep } from '@/types';
import { PROJECT_EXAMPLES, DEFAULT_PROJECT_KEY } from '@/constants';
import FileExplorer from '@components/FileExplorer';
import ChatWindow from '@components/ChatWindow';
import CodeViewer from '@components/CodeViewer';
import { LoadingSpinner, SendIcon, BrainIcon, AlertTriangleIcon, ChevronDownIcon } from '@components/Icons';
import { useGenAI } from '@contexts/GenAIContext';
import { useAiHelper } from '@/hooks/useAiHelper';

const AppContent: React.FC = () => {
  const { sendMessageStreamInContext, isGenAIInitialized, apiKeyMissing } = useGenAI();
  
  const [selectedProjectKey, setSelectedProjectKey] = useState<string>(DEFAULT_PROJECT_KEY);
  const [files, setFiles] = useState<FilesState>(PROJECT_EXAMPLES[DEFAULT_PROJECT_KEY].files);
  const [selectedFile, setSelectedFile] = useState<string>(Object.keys(PROJECT_EXAMPLES[DEFAULT_PROJECT_KEY].files)[0] || '');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPlan, setCurrentPlan] = useState<PlanStep[]>([]);
  const [currentTaskDescription, setCurrentTaskDescription] = useState<string>('');

  const { appLevelInitializeChat, processAiResponse } = useAiHelper({
    setMessages,
    setFiles,
    setSelectedFile,
    setCurrentPlan,
    setCurrentTaskDescription,
  });
  
  let accumulatedResponseForStream = "";

  useEffect(() => {
    console.log("[App.tsx] Files state changed:", files);
  }, [files]);

  useEffect(() => {
    console.log("[App.tsx] SelectedFile changed:", selectedFile);
    if (selectedFile && files[selectedFile]) {
      console.log(`[App.tsx] Content for new selectedFile ('${selectedFile}'):`, files[selectedFile].content.substring(0, 200) + "...");
    } else if (selectedFile) {
      console.warn(`[App.tsx] SelectedFile is '${selectedFile}', but no corresponding data found in files state.`);
    }
  }, [selectedFile, files]);


  useEffect(() => {
    if (isGenAIInitialized) {
      const currentProject = PROJECT_EXAMPLES[selectedProjectKey];
      if (currentProject) {
        console.log(`[App.tsx] Project changed to: ${selectedProjectKey}. Initializing with files:`, currentProject.files);
        setFiles(currentProject.files);
        const firstFile = Object.keys(currentProject.files)[0];
        setSelectedFile(firstFile || '');
        setMessages([]); // Clear messages for new project
        setCurrentPlan([]);
        setCurrentTaskDescription('');
        setUserInput('');
        appLevelInitializeChat(currentProject.files, selectedProjectKey);
      }
    } else if (apiKeyMissing) {
        console.warn("[App.tsx] GenAI not initialized due to missing API Key.");
    }
  }, [isGenAIInitialized, selectedProjectKey, appLevelInitializeChat, apiKeyMissing]); // Removed state setters like setFiles, setSelectedFile from here to avoid potential re-trigger loops. They are set before appLevelInitializeChat.


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
    setUserInput('');
    accumulatedResponseForStream = ""; 

    try {
      await sendMessageStreamInContext(
        userInput,
        (chunkText) => { 
          accumulatedResponseForStream += chunkText;
        },
        (error) => { 
          console.error("[App.tsx] Error from sendMessageStreamInContext (onError callback):", error);
          const errorMessageText = error instanceof Error ? error.message : "An unexpected error occurred while receiving the AI's response.";
          setMessages(prevMessages => [...prevMessages, { id: Date.now().toString(), sender: 'system', text: `Stream Error: ${errorMessageText} Please try again.`, type: 'error' }]);
          setIsLoading(false);
        },
        () => { 
          console.log("[App.tsx] STREAM COMPLETE. Full AI response to process:", accumulatedResponseForStream);
          processAiResponse(accumulatedResponseForStream);
          setIsLoading(false);
        }
      );
    } catch (error) { 
      console.error("[App.tsx] Error calling sendMessageStreamInContext:", error);
      const errorMessageText = error instanceof Error ? error.message : "An unexpected error occurred before starting the AI communication.";
      setMessages(prevMessages => [...prevMessages, { id: Date.now().toString(), sender: 'system', text: `Error: ${errorMessageText} Please check your setup or try again.`, type: 'error' }]);
      setIsLoading(false);
    }
  };
  
  const handleFileSelect = (fileName: string) => {
    console.log(`[App.tsx] handleFileSelect: User selected file '${fileName}'`);
    setSelectedFile(fileName);
  };

  const handleFileContentChange = (newContent: string) => {
    if (selectedFile && files[selectedFile]) {
      setFiles(prevFiles => {
        const updatedFileEntry = {
          ...prevFiles[selectedFile],
          content: newContent,
          isNew: false, 
        };
        const newState = {
          ...prevFiles,
          [selectedFile]: updatedFileEntry,
        };
        console.log("[App.tsx] handleFileContentChange - User edit. New files state:", newState);
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
        <ChatWindow messages={messages} />
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
        <CodeViewer 
          key={selectedFile} // MODIFICATION: Added key prop here
          file={files[selectedFile]} 
          onFileContentChange={handleFileContentChange} 
        />
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