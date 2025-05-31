// src/hooks/useAiHelper.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAiHelper } from './useAiHelper';
import { AiActionType, MessageType, FilesState } from '@/types';
import * as GenAIContext from '@contexts/GenAIContext';
import { GEMINI_MODEL_NAME, GEMINI_SYSTEM_PROMPT_TEMPLATE, PROJECT_EXAMPLES, DEFAULT_PROJECT_KEY } from '@/constants';

// Mock dependencies
vi.mock('@contexts/GenAIContext');

describe('useAiHelper', () => {
  let mockSetMessages: ReturnType<typeof vi.fn>;
  let mockSetFiles: ReturnType<typeof vi.fn>;
  let mockSetSelectedFile: ReturnType<typeof vi.fn>;
  let mockSetCurrentPlan: ReturnType<typeof vi.fn>;
  let mockSetCurrentTaskDescription: ReturnType<typeof vi.fn>;
  let mockInitializeChatInContext: ReturnType<typeof vi.fn>;
  let mockSendMessageStreamInContext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetMessages = vi.fn();
    mockSetFiles = vi.fn();
    mockSetSelectedFile = vi.fn();
    mockSetCurrentPlan = vi.fn();
    mockSetCurrentTaskDescription = vi.fn();
    mockInitializeChatInContext = vi.fn();
    mockSendMessageStreamInContext = vi.fn();

    (GenAIContext.useGenAI as vi.Mock).mockReturnValue({
      initializeChatInContext: mockInitializeChatInContext,
      sendMessageStreamInContext: mockSendMessageStreamInContext,
      isGenAIInitialized: true,
      apiKeyMissing: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const getHook = () => {
    const { result } = renderHook(() => useAiHelper({
      setMessages: mockSetMessages,
      setFiles: mockSetFiles,
      setSelectedFile: mockSetSelectedFile,
      setCurrentPlan: mockSetCurrentPlan,
      setCurrentTaskDescription: mockSetCurrentTaskDescription,
    }));
    return result.current;
  };

  describe('processAiResponse', () => {
    it('should process PLAN steps correctly', () => {
      const { processAiResponse } = getHook();
      const planDescription = 'This is a plan step.';
      const aiResponse = `${AiActionType.PLAN} ${planDescription}`;

      act(() => {
        processAiResponse(aiResponse);
      });

      expect(mockSetCurrentPlan).toHaveBeenCalledOnce();
      expect(mockSetCurrentPlan).toHaveBeenCalledWith(expect.any(Function));

      expect(mockSetMessages).toHaveBeenCalledOnce();
      expect(mockSetMessages).toHaveBeenCalledWith(expect.any(Function));

      // Check if the functions were called with a callback that updates the state correctly
      const setCurrentPlanUpdater = mockSetCurrentPlan.mock.calls[0][0];
      const initialPlan: any[] = [];
      const newPlan = setCurrentPlanUpdater(initialPlan);
      expect(newPlan[0].description).toBe(planDescription);

      const setMessagesUpdater = mockSetMessages.mock.calls[0][0];
      const initialMessages: any[] = [];
      const newMessages = setMessagesUpdater(initialMessages);
      expect(newMessages[0].text).toBe(planDescription);
      expect(newMessages[0].type).toBe(MessageType.PLAN_STEP);
    });

    it('should process CODE_UPDATE correctly and create a new file', () => {
      const { processAiResponse } = getHook();
      const fileName = 'src/components/NewComponent.tsx';
      const codeContent = 'const NewComponent = () => <div>New</div>;';
      const aiResponse = `${AiActionType.CODE_UPDATE} \`${fileName}\`
\`\`\`tsx
${codeContent}
\`\`\``;

      act(() => {
        processAiResponse(aiResponse);
      });

      expect(mockSetFiles).toHaveBeenCalledOnce();
      const setFilesUpdater = mockSetFiles.mock.calls[0][0];
      const initialFiles: FilesState = {};
      const newFiles = setFilesUpdater(initialFiles);
      expect(newFiles[fileName]).toBeDefined();
      expect(newFiles[fileName].content).toBe(codeContent);
      expect(newFiles[fileName].isNew).toBe(true);

      expect(mockSetSelectedFile).toHaveBeenCalledWith(fileName);

      expect(mockSetMessages).toHaveBeenCalledOnce();
      const setMessagesUpdater = mockSetMessages.mock.calls[0][0];
      const initialMessages: any[] = [];
      const newMessages = setMessagesUpdater(initialMessages);
      expect(newMessages[0].type).toBe(MessageType.CODE_UPDATE);
      expect(newMessages[0].fileName).toBe(fileName);
      expect(newMessages[0].codeContent).toBe(codeContent);
    });

    it('should process CODE_UPDATE correctly for an existing file', () => {
      const { processAiResponse } = getHook();
      const fileName = 'src/App.tsx';
      const codeContent = 'const App = () => <div>Updated App</div>;';
      const aiResponse = `${AiActionType.CODE_UPDATE} ${fileName}
\`\`\`tsx
${codeContent}
\`\`\``; // No backticks around filename this time

      act(() => {
        processAiResponse(aiResponse);
      });

      expect(mockSetFiles).toHaveBeenCalledOnce();
      const setFilesUpdater = mockSetFiles.mock.calls[0][0];
      const initialFiles: FilesState = { [fileName]: { name: fileName, content: "old content", isNew: false } };
      const newFiles = setFilesUpdater(initialFiles);
      expect(newFiles[fileName].content).toBe(codeContent);
      expect(newFiles[fileName].isNew).toBe(false); // Should remain false for existing file

      expect(mockSetSelectedFile).toHaveBeenCalledWith(fileName);
    });

    it('should process AiActionType.ERROR correctly', () => {
      const { processAiResponse } = getHook();
      const errorMessage = 'This is a test error.';
      const aiResponse = `${AiActionType.ERROR} ${errorMessage}`;

      act(() => {
        processAiResponse(aiResponse);
      });

      expect(mockSetMessages).toHaveBeenCalledOnce();
      const setMessagesUpdater = mockSetMessages.mock.calls[0][0];
      const newMessages = setMessagesUpdater([]);
      expect(newMessages[0].text).toBe(`Error: ${errorMessage}`);
      expect(newMessages[0].type).toBe(MessageType.ERROR);
      expect(newMessages[0].sender).toBe('ai');
    });

    it('should handle unterminated code block and add system warning', () => {
      const { processAiResponse } = getHook();
      const fileName = 'src/components/Unterminated.tsx';
      const codeContent = 'const Unterminated = () => {'; // Missing closing brace and backticks
      const aiResponse = `${AiActionType.CODE_UPDATE} \`${fileName}\`
\`\`\`tsx
${codeContent}`;

      act(() => {
        processAiResponse(aiResponse);
      });

      expect(mockSetFiles).toHaveBeenCalledOnce();
      const setFilesUpdater = mockSetFiles.mock.calls[0][0];
      const newFiles = setFilesUpdater({});
      expect(newFiles[fileName].content).toBe(codeContent);

      expect(mockSetSelectedFile).toHaveBeenCalledWith(fileName);

      expect(mockSetMessages).toHaveBeenCalledOnce();
      const setMessagesUpdater = mockSetMessages.mock.calls[0][0];
      const newMessages = setMessagesUpdater([]);
      // Expect two messages: system warning and AI code update
      expect(newMessages.length).toBe(2);
      expect(newMessages[0].sender).toBe('system');
      expect(newMessages[0].type).toBe(MessageType.ERROR); // System warnings are typed as error for visibility
      expect(newMessages[0].text).toContain(`AI response for ${fileName} might be incomplete`);

      expect(newMessages[1].type).toBe(MessageType.CODE_UPDATE);
      expect(newMessages[1].fileName).toBe(fileName);
    });

    it('should handle nested code blocks and add system warning', () => {
      const { processAiResponse } = getHook();
      const firstFileName = 'src/First.tsx';
      const firstCode = 'const First = () => <p>First</p>;';
      const secondFileName = 'src/Second.tsx';
      const secondCode = 'const Second = () => <p>Second</p>;';

      const aiResponse = `${AiActionType.CODE_UPDATE} \`${firstFileName}\`
\`\`\`tsx
${firstCode}
${AiActionType.CODE_UPDATE} \`${secondFileName}\`
\`\`\`tsx
${secondCode}
\`\`\``;

      act(() => {
        processAiResponse(aiResponse);
      });

      expect(mockSetFiles).toHaveBeenCalledTimes(2); // Called for first file (nested), then second file (closing)

      const firstSetFilesUpdater = mockSetFiles.mock.calls[0][0];
      const firstFilesState = firstSetFilesUpdater({});
      expect(firstFilesState[firstFileName].content).toBe(firstCode);

      const secondSetFilesUpdater = mockSetFiles.mock.calls[1][0];
      // Provide the state after the first update to the second updater
      const secondFilesState = secondSetFilesUpdater(firstFilesState);
      expect(secondFilesState[secondFileName].content).toBe(secondCode);

      expect(mockSetSelectedFile).toHaveBeenNthCalledWith(1, firstFileName);
      expect(mockSetSelectedFile).toHaveBeenNthCalledWith(2, secondFileName);

      expect(mockSetMessages).toHaveBeenCalledOnce();
      const setMessagesUpdater = mockSetMessages.mock.calls[0][0];
      const newMessages = setMessagesUpdater([]);

      // Expect three messages: system warning, AI code update for first, AI code update for second
      expect(newMessages.length).toBe(3);
      expect(newMessages[0].sender).toBe('system');
      expect(newMessages[0].type).toBe(MessageType.ERROR);
      expect(newMessages[0].text).toContain(`AI sent an unusual code update structure. I've tried to apply the previous block for: ${firstFileName}`);

      expect(newMessages[1].type).toBe(MessageType.CODE_UPDATE);
      expect(newMessages[1].fileName).toBe(firstFileName);

      expect(newMessages[2].type).toBe(MessageType.CODE_UPDATE);
      expect(newMessages[2].fileName).toBe(secondFileName);
    });
  });

  describe('appLevelInitializeChat', () => {
    it('should call initializeChatInContext with correct parameters', () => {
      const { appLevelInitializeChat } = getHook();
      const projectKey = DEFAULT_PROJECT_KEY;
      const projectFiles = PROJECT_EXAMPLES[projectKey].files;
      const fileNames = Object.keys(projectFiles).join(', ');
      const expectedSystemInstruction = GEMINI_SYSTEM_PROMPT_TEMPLATE.replace('{{FILE_NAMES}}', fileNames);

      act(() => {
        appLevelInitializeChat(projectFiles, projectKey);
      });

      expect(mockInitializeChatInContext).toHaveBeenCalledOnce();
      const callArgs = mockInitializeChatInContext.mock.calls[0][0];

      expect(callArgs.model).toBe(GEMINI_MODEL_NAME);
      expect(callArgs.config.systemInstruction.content).toBe(expectedSystemInstruction); // Assuming systemInstruction is an object with a content property
      expect(callArgs.history.length).toBe(2); // Initial user and model messages
      expect(callArgs.history[0].role).toBe("user");
      expect(callArgs.history[0].parts[0].text).toContain("Here is the initial state of the project files:");
      expect(callArgs.history[1].role).toBe("model");

      expect(mockSetMessages).toHaveBeenCalledOnce();
      const setMessagesUpdater = mockSetMessages.mock.calls[0][0];
      const newMessages = setMessagesUpdater([]);
      expect(newMessages[0].text).toContain(`AI context initialized for ${PROJECT_EXAMPLES[projectKey]?.name}`);
    });

    it('should set error message if GenAI is not initialized and API key is present', () => {
      (GenAIContext.useGenAI as vi.Mock).mockReturnValue({
        initializeChatInContext: mockInitializeChatInContext,
        sendMessageStreamInContext: mockSendMessageStreamInContext,
        isGenAIInitialized: false, // Key difference
        apiKeyMissing: false,
      });
      const { appLevelInitializeChat } = getHook(); // Re-get hook with new mock value

      act(() => {
        appLevelInitializeChat(PROJECT_EXAMPLES[DEFAULT_PROJECT_KEY].files, DEFAULT_PROJECT_KEY);
      });

      expect(mockInitializeChatInContext).not.toHaveBeenCalled();
      expect(mockSetMessages).toHaveBeenCalledOnce();
      const setMessagesUpdater = mockSetMessages.mock.calls[0][0];
      const newMessages = setMessagesUpdater([]);
      expect(newMessages[0].type).toBe(MessageType.ERROR);
      expect(newMessages[0].text).toContain("AI functionality failed to initialize.");
    });

     it('should not set error message if GenAI is not initialized and API key is missing (handled by UI)', () => {
      (GenAIContext.useGenAI as vi.Mock).mockReturnValue({
        initializeChatInContext: mockInitializeChatInContext,
        sendMessageStreamInContext: mockSendMessageStreamInContext,
        isGenAIInitialized: false,
        apiKeyMissing: true, // Key difference
      });
      const { appLevelInitializeChat } = getHook();

      act(() => {
        appLevelInitializeChat(PROJECT_EXAMPLES[DEFAULT_PROJECT_KEY].files, DEFAULT_PROJECT_KEY);
      });

      expect(mockInitializeChatInContext).not.toHaveBeenCalled();
      expect(mockSetMessages).not.toHaveBeenCalled(); // Should not set a message here
    });
  });
});
