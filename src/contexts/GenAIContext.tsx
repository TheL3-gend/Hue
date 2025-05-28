import { createContext, useContext, useMemo, ReactNode, useState, useCallback } from 'react';
// Corrected: Changed CreateChatParams to CreateChatParameters
import { GoogleGenAI, Chat, CreateChatParameters } from '@google/genai';

interface GenAIContextProps {
  ai: GoogleGenAI | null;
  chat: Chat | null;
  // Corrected: Changed CreateChatParams to CreateChatParameters
  initializeChatInContext: (params: CreateChatParameters) => void;
  sendMessageStreamInContext: (
    messageContent: string,
    onChunk: (chunkText: string) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ) => Promise<void>;
  isGenAIInitialized: boolean;
  apiKeyMissing: boolean;
}

const GenAIContext = createContext<GenAIContextProps | undefined>(undefined);

export function GenAIProvider({ children }: { children: ReactNode }) {
  const [aiClient, setAiClient] = useState<GoogleGenAI | null>(null);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [isGenAIInitialized, setIsGenAIInitialized] = useState<boolean>(false);
  const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(false);

  useMemo(() => {
    // Use import.meta.env for Vite environment variables
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey) {
      try {
        // Ensure apiKey is passed as { apiKey: apiKeyString }
        const client = new GoogleGenAI({ apiKey });
        setAiClient(client);
        setIsGenAIInitialized(true);
        setApiKeyMissing(false);
      } catch (error) {
        console.error("Failed to initialize GoogleGenAI client with VITE_GEMINI_API_KEY from import.meta.env:", error);
        setIsGenAIInitialized(false);
        setApiKeyMissing(true); 
      }
    } else {
      console.warn("VITE_GEMINI_API_KEY environment variable not found. Ensure it's set in your .env file.");
      setIsGenAIInitialized(false);
      setApiKeyMissing(true);
    }
  }, []); // Empty dependency array ensures this runs once on mount

  // Corrected: Changed CreateChatParams to CreateChatParameters
  const initializeChatInContext = useCallback((params: CreateChatParameters) => {
    if (!aiClient) {
      console.error("GenAI client not initialized yet. Cannot create chat.");
      // Optionally, set an error state or throw
      return;
    }
    // Ensure model is part of params, e.g., params.model = params.model || 'gemini-2.5-flash-preview-04-17'
    if (!params.model) {
        console.error("Model must be specified in CreateChatParameters");
        return;
    }
    const chatInstance = aiClient.chats.create(params);
    setCurrentChat(chatInstance);
  }, [aiClient]);

  const sendMessageStreamInContext = useCallback(async (
    messageContent: string,
    onChunk: (chunkText: string) => void,
    onError: (error: Error) => void,
    onComplete: () => void
  ) => {
    if (!currentChat) {
      onError(new Error("Chat is not initialized."));
      return;
    }
    try {
      const stream = await currentChat.sendMessageStream({ message: messageContent });
      for await (const chunk of stream) { // chunk type is GenerateContentResponse
        const text = chunk.text; // Use .text property
        if (text) { // Ensure text is not empty or undefined
          onChunk(text);
        }
      }
      onComplete();
    } catch (error) {
      console.error("Error sending message stream via context:", error);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [currentChat]);

  return (
    <GenAIContext.Provider
      value={{ 
        ai: aiClient, 
        chat: currentChat, 
        initializeChatInContext, 
        sendMessageStreamInContext, 
        isGenAIInitialized,
        apiKeyMissing 
      }}
    >
      {children}
    </GenAIContext.Provider>
  );
}

export function useGenAI(): GenAIContextProps {
  const context = useContext(GenAIContext);
  if (context === undefined) {
    throw new Error('useGenAI must be used within a GenAIProvider');
  }
  return context;
}
