"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAllConversations,
  startNewConversation,
  sendMessageInConversation,
  pollUntilComplete,
  getLocalMessages,
  storeMessageLocally,
  getConversationMessages,
  type Conversation,
  type Message,
} from '@/utils/conversation-api';

interface UseConversationResult {
  // State
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  createNewConversation: (initialMessage: string) => Promise<string>;
  selectConversation: (conversationId: string) => void;
  sendMessage: (message: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Simulate typing effect by gradually revealing text
 * IMPROVED VERSION with better control
 */
function useStreamingText(
  messageId: string,
  fullText: string,
  onUpdate: (partial: string, isDone: boolean) => void,
  speed: number = 15
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);
  const isCancelledRef = useRef(false);

  const startStreaming = useCallback(() => {
    console.log('🎬 Starting stream for message:', messageId, 'Length:', fullText.length);
    isCancelledRef.current = false;
    indexRef.current = 0;

    const reveal = () => {
      if (isCancelledRef.current) {
        console.log('❌ Stream cancelled:', messageId);
        return;
      }

      if (indexRef.current < fullText.length) {
        // Reveal in chunks of 1-3 characters
        const chunkSize = Math.min(
          Math.max(1, Math.floor(Math.random() * 3) + 1),
          fullText.length - indexRef.current
        );
        indexRef.current += chunkSize;
        
        const partial = fullText.substring(0, indexRef.current);
        console.log('📝 Streaming:', messageId, `(${indexRef.current}/${fullText.length})`);
        
        onUpdate(partial, false);
        
        timeoutRef.current = setTimeout(reveal, speed);
      } else {
        console.log('✅ Stream complete:', messageId);
        onUpdate(fullText, true);
      }
    };

    // Start the reveal process
    reveal();
  }, [messageId, fullText, onUpdate, speed]);

  const cancelStreaming = useCallback(() => {
    console.log('🛑 Cancelling stream:', messageId);
    isCancelledRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [messageId]);

  useEffect(() => {
    return () => {
      cancelStreaming();
    };
  }, [cancelStreaming]);

  return { startStreaming, cancelStreaming };
}

export function useConversation(): UseConversationResult {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<Set<string>>(new Set());
  const streamingControllers = useRef<Map<string, () => void>>(new Map());

  /**
   * Load all conversations for the user
   */
  const loadConversations = useCallback(async () => {
    const accessToken = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
    const userEmail = typeof window !== 'undefined' ? sessionStorage.getItem('userEmail') : null;
    
    if (!accessToken || !userEmail) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getAllConversations();
      setConversations(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(message);
      console.error('Error loading conversations:', err);
      
      if (message.includes('authentication') || message.includes('log in')) {
        setError(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load messages for a specific conversation
   */
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const apiMessages = await getConversationMessages(conversationId);
      
      if (apiMessages.length > 0) {
        setMessages(apiMessages);
        
        if (typeof window !== 'undefined') {
          const key = `conversation_${conversationId}`;
          localStorage.setItem(key, JSON.stringify(apiMessages));
        }
      } else {
        const localMessages = getLocalMessages(conversationId);
        setMessages(localMessages);
      }
    } catch (error) {
      console.error('Error loading messages from API, using local cache:', error);
      const localMessages = getLocalMessages(conversationId);
      setMessages(localMessages);
    }
  }, []);

  /**
   * Select a conversation and load its messages
   */
  const selectConversation = useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
    loadMessages(conversationId);
  }, [loadMessages]);

  /**
   * Create a new conversation with an initial message
   */
  const createNewConversation = useCallback(async (initialMessage: string): Promise<string> => {
    setIsSending(true);
    setError(null);

    try {
      const response = await startNewConversation(initialMessage);
      const { conversation_id, message_id, timestamp } = response;

      const userMessage: Message = {
        id: `user_${Date.now()}`,
        conversation_id,
        role: 'user',
        content: initialMessage,
        timestamp,
        status: 'complete',
      };

      storeMessageLocally(conversation_id, userMessage);
      setMessages([userMessage]);
      setCurrentConversationId(conversation_id);

      const assistantMessage: Message = {
        id: message_id,
        conversation_id,
        role: 'assistant',
        content: '',
        timestamp,
        status: 'processing',
      };

      storeMessageLocally(conversation_id, assistantMessage);
      setMessages(prev => [...prev, assistantMessage]);

      pollForResponse(conversation_id, message_id);

      await loadConversations();

      return conversation_id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(message);
      console.error('Error creating conversation:', err);
      throw err;
    } finally {
      setIsSending(false);
    }
  }, [loadConversations]);

  /**
   * Send a message in the current conversation
   */
  const sendMessage = useCallback(async (messageContent: string) => {
    if (!currentConversationId) {
      setError('No conversation selected');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await sendMessageInConversation(currentConversationId, messageContent);
      const { message_id, timestamp } = response;

      const userMessage: Message = {
        id: `user_${Date.now()}`,
        conversation_id: currentConversationId,
        role: 'user',
        content: messageContent,
        timestamp,
        status: 'complete',
      };

      storeMessageLocally(currentConversationId, userMessage);
      setMessages(prev => [...prev, userMessage]);

      const assistantMessage: Message = {
        id: message_id,
        conversation_id: currentConversationId,
        role: 'assistant',
        content: '',
        timestamp,
        status: 'processing',
      };

      storeMessageLocally(currentConversationId, assistantMessage);
      setMessages(prev => [...prev, assistantMessage]);

      pollForResponse(currentConversationId, message_id);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      setError(message);
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  }, [currentConversationId]);

  /**
   * Poll for message response with streaming effect
   * IMPROVED VERSION
   */
  const pollForResponse = useCallback(async (conversationId: string, messageId: string) => {
    const pollKey = `${conversationId}_${messageId}`;
    if (pollingRef.current.has(pollKey)) {
      console.log('⚠️ Already polling:', pollKey);
      return;
    }

    pollingRef.current.add(pollKey);
    console.log('🔄 Starting poll for:', messageId);

    try {
      const status = await pollUntilComplete(conversationId, messageId);
      console.log('✅ Poll complete! Message length:', status.message.length);

      // Cancel any existing stream for this message
      const existingCancel = streamingControllers.current.get(messageId);
      if (existingCancel) {
        console.log('🛑 Cancelling existing stream');
        existingCancel();
        streamingControllers.current.delete(messageId);
      }

      // Start streaming effect with a slight delay to ensure React has rendered
      setTimeout(() => {
        console.log('🎬 Initiating streaming for:', messageId);
        streamMessage(conversationId, messageId, status.message, status.timestamp);
      }, 50);

      await loadConversations();

    } catch (err) {
      console.error('❌ Error polling for response:', err);
      
      setMessages(prev => {
        return prev.map(msg => {
          if (msg.id === messageId) {
            return {
              ...msg,
              status: 'error',
              error: err instanceof Error ? err.message : 'Failed to get response',
            };
          }
          return msg;
        });
      });
    } finally {
      pollingRef.current.delete(pollKey);
    }
  }, [loadConversations]);

  /**
   * Stream a message character by character
   */
  const streamMessage = useCallback((
    conversationId: string,
    messageId: string,
    fullText: string,
    timestamp: string
  ) => {
    console.log('📺 Setting up stream for:', messageId);
    
    let currentIndex = 0;
    let isCancelled = false;

    const updateMessage = (content: string, isComplete: boolean) => {
      if (isCancelled) return;

      setMessages(prev => {
        return prev.map(msg => {
          if (msg.id === messageId) {
            const updatedMessage: Message = {
              ...msg,
              content,
              status: isComplete ? 'complete' : 'processing',
              timestamp: isComplete ? timestamp : msg.timestamp,
            };

            if (isComplete) {
              console.log('💾 Storing completed message:', messageId);
              storeMessageLocally(conversationId, updatedMessage);
            }

            return updatedMessage;
          }
          return msg;
        });
      });
    };

    const streamChunk = () => {
      if (isCancelled) {
        console.log('Stream cancelled');
        return;
      }

      if (currentIndex < fullText.length) {
        // Reveal 1-3 characters at a time
        const chunkSize = Math.min(
          Math.max(1, Math.floor(Math.random() * 3) + 1),
          fullText.length - currentIndex
        );
        currentIndex += chunkSize;

        const partial = fullText.substring(0, currentIndex);
        updateMessage(partial, false);

        // Schedule next chunk
        setTimeout(streamChunk, 15); // 15ms between chunks
      } else {
        // Finished streaming
        console.log('✨ Streaming finished for:', messageId);
        updateMessage(fullText, true);
        streamingControllers.current.delete(messageId);
      }
    };

    // Start streaming
    streamChunk();

    // Store cancel function
    const cancel = () => {
      isCancelled = true;
    };
    streamingControllers.current.set(messageId, cancel);

  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Load conversations on mount
   */
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  /**
   * Load messages when conversation changes
   */
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    }
  }, [currentConversationId, loadMessages]);

  /**
   * Cleanup streaming on unmount
   */
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up streams');
      streamingControllers.current.forEach(cancel => cancel());
      streamingControllers.current.clear();
    };
  }, []);

  return {
    conversations,
    currentConversationId,
    messages,
    isLoading,
    isSending,
    error,
    loadConversations,
    createNewConversation,
    selectConversation,
    sendMessage,
    clearError,
  };
}