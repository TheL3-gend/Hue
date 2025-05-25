import React, { useState, useEffect, useCallback } from 'react';
import { Message, FilesState, PlanStep, AiActionType } from '@/types';
import { PROJECT_EXAMPLES, DEFAULT_PROJECT_KEY, GEMINI_SYSTEM_PROMPT_TEMPLATE } from '@/constants';
import FileExplorer from '@components/FileExplorer';
import ChatWindow from '@components/ChatWindow';
import MonacoEditor from '@components/MonacoEditor';
import {
  LoadingSpinner,
  SendIcon,
  BrainIcon,
  AlertTriangleIcon,
  ChevronDownIcon,
} from '@components/Icons';
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
  const {
    initializeChatInContext,
    sendMessageStreamInContext,
    isGenAIInitialized,
    apiKeyMissing,
  } = useGenAI();

  const [selectedProjectKey, setSelectedProjectKey] = useState<string>(DEFAULT_PROJECT_KEY);
  const [files, setFiles] = useState<FilesState>(PROJECT_EXAMPLES[DEFAULT_PROJECT_KEY].files);
  const [selectedFile, setSelectedFile] = useState<string>(
    Object.keys(PROJECT_EXAMPLES[DEFAULT_PROJECT_KEY].files)[0] || ''
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPlan, setCurrentPlan] = useState<PlanStep[]>([]);
  const [currentTaskDescription, setCurrentTaskDescription] = useState<string>('');

  const appLevelInitializeChat = useCallback(
    (projectFiles: FilesState, projectKey: string) => {
      if (!isGenAIInitialized) {
        if (!apiKeyMissing) {
          setMessages([
            {
              id: 'genai-init-fail-context',
              sender: 'system',
              text: 'AI initialization failed. Check API key or network.',
              type: 'error',
            },
          ]);
        }
        return;
      }

      const fileNames = Object.keys(projectFiles).join(', ');
      const systemInstruction = GEMINI_SYSTEM_PROMPT_TEMPLATE.replace(
        '{{FILE_NAMES}}',
        fileNames
      );

      const fileContents = Object.entries(projectFiles)
        .map(
          ([name, entry]) =>
            `File: \`${name}\`\n\`\`\`${getMonacoLanguage(name)}\n${entry.content}\n\`\`\``
        )
        .join('\n\n');

      const history = [
        {
          role: 'user',
          parts: [
            {
              text: `Here is the initial state of the project files:\n${fileContents}\n\nMy first request will follow.`,
            },
          ],
        },
        { role: 'model', parts: [{ text: 'Understood. Ready for requests.' }] },
      ];

      const chatParams: CreateChatParameters = {
        model: 'gemini-2.5-flash-preview-04-17',
        config: { systemInstruction },
        history,
      };
      initializeChatInContext(chatParams);
      setMessages([
        {
          id: 'init-chat',
          sender: 'system',
          text: `AI context initialized for ${
            PROJECT_EXAMPLES[projectKey]?.name || 'project'
          }.`,
          type: 'status',
        },
      ]);
    },
    [isGenAIInitialized, initializeChatInContext, apiKeyMissing]
  );

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

  const processAiResponse = useCallback(
    (responseText?: string) => {
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
            setFiles((prev) => ({
              ...prev,
              [fileName!]: { name: fileName!, content, isNew: !prev[fileName!] },
            }));
            newMsgs.push({
              id: Date.now().toString(),
              sender: 'ai',
              text: `Updated file: ${fileName}`,
              type: 'code_update',
              fileName,
              codeContent: content,
            });
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
          newMsgs.push({
            id: Date.now().toString(),
            sender: 'ai',
            text: `Simulating test: ${msg}`,
            type: 'test_log',
          });
        } else if (line.startsWith(AiActionType.TEST_RESULT)) {
          const msg = line.slice(AiActionType.TEST_RESULT.length).trim();
          newMsgs.push({
            id: Date.now().toString(),
            sender: 'ai',
            text: `Test result: ${msg}`,
            type: 'test_log',
          });
        } else if (line.startsWith(AiActionType.TASK_COMPLETE)) {
          newMsgs.push({ id: Date.now().toString(), sender: 'ai', text: 'Task Complete!', type: 'task_complete' });
          setCurrentPlan([]);
          setCurrentTaskDescription('');
          setFiles((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((k) => (updated[k].isNew = false));
            return updated;
          });
        } else if (line.startsWith(AiActionType.ERROR)) {
          const msg = line.slice(AiActionType.ERROR.length).trim();
          newMsgs.push({ id: Date.now().toString(), sender: 'ai', text: `Error: ${msg}`, type: 'error' });
        } else if (line) {
          newMsgs.push({ id: Date.now().toString(), sender: 'ai', text: line });
        }
      }

      if (newSteps.length) setCurrentPlan((p) => [...p, ...newSteps]);
      if (newMsgs.length) setMessages((m) => [...m, ...newMsgs]);
    },
    [setFiles, setMessages, setCurrentPlan, setCurrentTaskDescription]
  );

  const handleSend = async () => {
    if (!userInput.trim() || isLoading || !isGenAIInitialized) {
      if (!isGenAIInitialized) {
        setMessages((prev) => [
          ...prev,
          {
            id: 'send-fail-no-init',
            sender: 'system',
            text: 'Cannot send: AI not initialized.',
            type: 'error',
          },
        ]);
      }
      return;
    }
    const userMessage: Message = { id: Date.now().toString(), sender: 'user', text: userInput };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    if (!currentTaskDescription) setCurrentTaskDescription(userInput);

              e selected or project empty.</p>
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