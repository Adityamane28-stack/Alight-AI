import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Conversation, Message } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface ChatContextType {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  messages: Message[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isStreaming: boolean;
  streamingContent: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  setModel: (model: string) => void;
  setSystemPrompt: (prompt: string) => void;
  setTemperature: (temp: number) => void;
  selectConversation: (id: string) => Promise<void>;
  createNewChat: () => void;
  deleteChat: (id: string) => Promise<void>;
  updateSettings: (params: { model?: string; systemPrompt?: string; temperature?: number; title?: string }) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // Current session settings
  const [model, setModel] = useState('openai/gpt-oss-120b');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeStreamContentRef = useRef('');

  // Load conversations when user logs in
  useEffect(() => {
    if (token) {
      loadConversations();
    } else {
      setConversations([]);
      setActiveConversationId(null);
      setMessages([]);
    }
  }, [token]);

  const loadConversations = async () => {
    try {
      setIsLoadingConversations(true);
      const list = await api.getConversations();
      setConversations(list);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const selectConversation = async (id: string) => {
    if (isStreaming) {
      stopStreaming();
    }
    try {
      setActiveConversationId(id);
      setIsLoadingMessages(true);
      const data = await api.getConversation(id);
      setMessages(data.messages || []);
      setModel(data.model || 'gemini-2.5-flash');
      setSystemPrompt(data.systemPrompt || '');
      setTemperature(data.temperature ?? 0.7);
    } catch (err) {
      console.error('Failed to fetch conversation messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const createNewChat = () => {
    if (isStreaming) {
      stopStreaming();
    }
    setActiveConversationId(null);
    setMessages([]);
    setStreamingContent('');
    // Keep or reset default settings
  };

  const deleteChat = async (id: string) => {
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        createNewChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const updateSettings = async (params: {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    title?: string;
  }) => {
    if (params.model !== undefined) setModel(params.model);
    if (params.systemPrompt !== undefined) setSystemPrompt(params.systemPrompt);
    if (params.temperature !== undefined) setTemperature(params.temperature);

    if (activeConversationId) {
      try {
        const updated = await api.updateConversation(activeConversationId, params);
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConversationId ? { ...c, ...updated } : c))
        );
      } catch (err) {
        console.error('Failed to update conversation settings:', err);
      }
    }
  };

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    let convId = activeConversationId;

    // If starting a fresh chat, create the conversation first
    if (!convId) {
      try {
        const newConv = await api.createConversation({
          title: content.trim().slice(0, 35),
          model,
          systemPrompt: systemPrompt || undefined,
          temperature,
        });
        convId = newConv.id;
        setActiveConversationId(convId);
        setConversations((prev) => [newConv, ...prev]);
      } catch (err) {
        console.error('Failed to create new conversation:', err);
        return;
      }
    }

    // Optimistic user message
    const optimisticUserMsg: Message = {
      id: `user-${Date.now()}`,
      conversationId: convId,
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setIsStreaming(true);
    setStreamingContent('');
    activeStreamContentRef.current = '';

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    await api.streamChatMessage({
      conversationId: convId,
      message: content.trim(),
      model,
      systemPrompt,
      temperature,
      signal: abortController.signal,
      onToken: (tokenChunk) => {
        activeStreamContentRef.current += tokenChunk;
        setStreamingContent(activeStreamContentRef.current);
      },
      onDone: (assistantMsgId) => {
        const finalContent = activeStreamContentRef.current;
        if (finalContent) {
          const newAssistantMsg: Message = {
            id: assistantMsgId || `asst-${Date.now()}`,
            conversationId: convId!,
            role: 'assistant',
            content: finalContent,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, newAssistantMsg]);
        }
        setStreamingContent('');
        activeStreamContentRef.current = '';
        setIsStreaming(false);
        abortControllerRef.current = null;
        loadConversations();
      },
      onError: (err) => {
        const errMsg: Message = {
          id: `err-${Date.now()}`,
          conversationId: convId!,
          role: 'assistant',
          content: `⚠️ **Error**: ${err.message || 'An unexpected error occurred while streaming response.'}`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errMsg]);
        setStreamingContent('');
        activeStreamContentRef.current = '';
        setIsStreaming(false);
        abortControllerRef.current = null;
      },
    });
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        activeConversation,
        messages,
        isLoadingConversations,
        isLoadingMessages,
        isStreaming,
        streamingContent,
        model,
        systemPrompt,
        temperature,
        setModel,
        setSystemPrompt,
        setTemperature,
        selectConversation,
        createNewChat,
        deleteChat,
        updateSettings,
        sendMessage,
        stopStreaming,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
