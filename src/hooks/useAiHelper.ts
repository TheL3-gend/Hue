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
    let textBuffer: string[] = [];

    // Helper function to process accumulated plain text lines into a single message
    const flushTextBuffer = () => {
      if (textBuffer.length > 0) {
        // Join buffered lines and create a new message object
        newMessages.push({ id: Date.now().toString() + Math.random(), sender: 'ai', text: textBuffer.join('\n') });
        // Reset the buffer
        textBuffer = [];
      }
    };

    for (const rawLine of lines) {
      const line = rawLine.trim(); 

      // Before processing any special AI action line, flush any accumulated text
      if (line.startsWith(AiActionType.PLAN)) {
        flushTextBuffer();
        const description = line.substring(AiActionType.PLAN.length).trim();
        const planStep = { id: Date.now().toString() + Math.random(), description };
        newPlanSteps.push(planStep);
        newMessages.push({ id: planStep.id, sender: 'ai', text: description, type: 'plan_step' });
      } else if (line.startsWith(AiActionType.CODE_UPDATE)) {
        flushTextBuffer(); // Flush text before handling code update
        if (inCodeBlock && currentCodeBlockFileName) {
          // This handles a rare case where a new CODE_UPDATE might appear before the previous one was closed.
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
        // Start of a code block, typically no text to flush immediately before this specific marker
      } else if (line.startsWith('```') && inCodeBlock && currentCodeBlockFileName) {
        flushTextBuffer(); // Ensure any text preceding the code block's closing backticks is flushed
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
        // Add raw line to preserve indentation within code blocks
        currentCodeBlockContent.push(rawLine);
      } else if (line.startsWith(AiActionType.SIMULATING_TEST)) {
        flushTextBuffer(); // Flush text before test simulation message
        const text = line.substring(AiActionType.SIMULATING_TEST.length).trim();
        newMessages.push({ id: Date.now().toString(), sender: 'ai', text: `Simulating test: ${text}`, type: 'test_log' });
      } else if (line.startsWith(AiActionType.TEST_RESULT)) {
        flushTextBuffer(); // Flush text before test result message
        const text = line.substring(AiActionType.TEST_RESULT.length).trim();
        newMessages.push({ id: Date.now().toString(), sender: 'ai', text: `Test result: ${text}`, type: 'test_log' });
      } else if (line.startsWith(AiActionType.TASK_COMPLETE)) {
        flushTextBuffer(); // Flush text before task complete message
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
        flushTextBuffer(); // Flush text before error message
        const text = line.substring(AiActionType.ERROR.length).trim();
        newMessages.push({ id: Date.now().toString(), sender: 'ai', text: `Error: ${text}`, type: 'error' });
      } else if (line) { 
        // If the line is not empty and not an AI action, buffer it for potential grouping
        textBuffer.push(line);
      }
    }

    // After processing all lines, ensure any remaining buffered text is flushed.
    // This handles cases where the AI response ends with plain text.
    flushTextBuffer();

    if (inCodeBlock && currentCodeBlockFileName) {
      // This handles cases where the AI response ends mid-code-block.
      // Any text preceding this unterminated block would have been flushed by the logic above.
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
