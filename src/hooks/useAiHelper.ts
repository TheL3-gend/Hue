// src/hooks/useAiHelper.ts
import React, { useCallback } from 'react';
import { useGenAI } from '@contexts/GenAIContext';
import { CreateChatParameters } from '@google/genai';
import { Message, FilesState, PlanStep, AiActionType } from '@/types';
import { PROJECT_EXAMPLES, GEMINI_SYSTEM_PROMPT_TEMPLATE, GEMINI_MODEL_NAME } from '@/constants';

interface UseAiHelperProps {
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setFiles: React.Dispatch<React.SetStateAction<FilesState>>;
  setSelectedFile: React.Dispatch<React.SetStateAction<string>>;
  setCurrentPlan: React.Dispatch<React.SetStateAction<PlanStep[]>>;
  setCurrentTaskDescription: React.Dispatch<React.SetStateAction<string>>;
}

export const useAiHelper = ({
  setMessages,
  setFiles,
  setSelectedFile,
  setCurrentPlan,
  setCurrentTaskDescription,
}: UseAiHelperProps) => {
  const { initializeChatInContext, isGenAIInitialized, apiKeyMissing } = useGenAI();

  const appLevelInitializeChat = useCallback((projectFiles: FilesState, projectKey: string) => {
    if (!isGenAIInitialized) {
      if (!apiKeyMissing) {
         console.error("GenAI Client not initialized, but API key is supposedly present. Check GenAIContext initialization.");
         setMessages([{id: 'genai-init-fail-context', sender: 'system', text: "AI functionality failed to initialize. Please try refreshing the page or ensure your connection is stable.", type: 'error'}]);
      }
      return;
    }

    const initialFileNames = Object.keys(projectFiles).join(', ');
    // Ensure AiActionType is available in the template if it was part of it.
    // For this refactor, assuming AiActionType is globally available or not directly interpolated here.
    // The prompt string from constants should already have placeholders like '${AiActionType.PLAN}'
    const systemInstruction = GEMINI_SYSTEM_PROMPT_TEMPLATE.replace('{{FILE_NAMES}}', initialFileNames);


    const initialFileContents = Object.entries(projectFiles)
      .map(([name, entry]) => `File: \`${name}\`\n\`\`\`tsx\n${entry.content}\n\`\`\``)
      .join('\n\n');

    const history = [
      { role: "user", parts: [{ text: `Here is the initial state of the project files:\n${initialFileContents}\n\nMy first request will follow.` }] },
      { role: "model", parts: [{ text: "Understood. I am ready for your request." }] }
    ];
    
    const chatParams: CreateChatParameters = {
      model: GEMINI_MODEL_NAME, // Use the constant here
      config: { systemInstruction },
      history: history
    };
    initializeChatInContext(chatParams); 

    setMessages([{id: 'init-chat', sender: 'system', text: `AI context initialized for ${PROJECT_EXAMPLES[projectKey]?.name || 'project'}. Ready for your request.`}]);
  }, [isGenAIInitialized, initializeChatInContext, apiKeyMissing, setMessages]);

  const processAiResponse = useCallback((responseText: string | null | undefined) => {
    const textToProcess = responseText ?? "";
    const lines = textToProcess.split(/\r?\n/);
    let currentCodeBlockFileName: string | null = null;
    let currentCodeBlockContent: string[] = [];
    let inCodeBlock = false;

    const newMessages: Message[] = [];
    const newPlanSteps: PlanStep[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim(); 

      if (line.startsWith(AiActionType.PLAN)) {
        const description = line.substring(AiActionType.PLAN.length).trim();
        const planStep = { id: Date.now().toString() + Math.random(), description };
        newPlanSteps.push(planStep);
        newMessages.push({ id: planStep.id, sender: 'ai', text: description, type: 'plan_step' });
      } else if (line.startsWith(AiActionType.CODE_UPDATE)) {
        if (inCodeBlock && currentCodeBlockFileName) {
          const nestedUpdateMessage = `AI sent an unusual code update structure. I've tried to apply the previous block for: ${currentCodeBlockFileName}. A new code block will follow.`;
          newMessages.push({ id: Date.now().toString() + Math.random(), sender: 'system', text: nestedUpdateMessage, type: 'error' });
          console.warn("Nested CODE_UPDATE detected. Processing previous block for:", currentCodeBlockFileName);
          const codeContent = currentCodeBlockContent.join('\n');
          setFiles(prevFiles => ({
            ...prevFiles,
            [currentCodeBlockFileName!]: { name: currentCodeBlockFileName!, content: codeContent, isNew: !prevFiles[currentCodeBlockFileName!] }
          }));
          newMessages.push({ id: Date.now().toString() + Math.random(), sender: 'ai', text: `Updated file: ${currentCodeBlockFileName}`, type: 'code_update', fileName: currentCodeBlockFileName, codeContent });
          setSelectedFile(currentCodeBlockFileName);
          currentCodeBlockContent = []; 
        }
        currentCodeBlockFileName = line.substring(AiActionType.CODE_UPDATE.length).trim().replace(/^`+|`+$/g, '');
        inCodeBlock = true;
        currentCodeBlockContent = []; 
      } else if (line.startsWith('```tsx') && inCodeBlock) {
        // Start of code
      } else if (line.startsWith('```') && inCodeBlock && currentCodeBlockFileName) {
        const codeContent = currentCodeBlockContent.join('\n');
        setFiles(prevFiles => {
          const isNew = !prevFiles[currentCodeBlockFileName!];
          return {
            ...prevFiles,
            [currentCodeBlockFileName!]: { name: currentCodeBlockFileName!, content: codeContent, isNew }
          }
        });
        newMessages.push({ id: Date.now().toString(), sender: 'ai', text: `Updated file: ${currentCodeBlockFileName}`, type: 'code_update', fileName: currentCodeBlockFileName, codeContent });
        setSelectedFile(currentCodeBlockFileName);
        inCodeBlock = false;
        currentCodeBlockFileName = null;
        currentCodeBlockContent = [];
      } else if (inCodeBlock) {
        currentCodeBlockContent.push(rawLine);
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
          const updatedFiles = { ...prevFiles };
          Object.keys(updatedFiles).forEach(key => {
            if (updatedFiles[key].isNew) {
              updatedFiles[key] = { ...updatedFiles[key], isNew: false };
            }
          });
          return updatedFiles;
        });
      } else if (line.startsWith(AiActionType.ERROR)) {
        const text = line.substring(AiActionType.ERROR.length).trim();
        newMessages.push({ id: Date.now().toString(), sender: 'ai', text: `Error: ${text}`, type: 'error' });
      } else if (line) { 
        newMessages.push({ id: Date.now().toString(), sender: 'ai', text: line });
      }
    }
    if (inCodeBlock && currentCodeBlockFileName) {
      const unterminatedMessage = `AI response for ${currentCodeBlockFileName} might be incomplete, but I've applied what was received.`;
      newMessages.push({ id: Date.now().toString() + Math.random(), sender: 'system', text: unterminatedMessage, type: 'error' });
      console.warn("AI response ended with an unterminated code block for:", currentCodeBlockFileName);
      const codeContent = currentCodeBlockContent.join('\n');
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
  }, [setFiles, setSelectedFile, setCurrentPlan, setCurrentTaskDescription, setMessages]);

  return { appLevelInitializeChat, processAiResponse };
};
