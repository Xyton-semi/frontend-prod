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

export function useConversation(): UseConversationResult {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ref to track if we're currently polling to prevent duplicate polls
  const pollingRef = useRef<Set<string>>(new Set());

  /**
   * Load all conversations for the user
   */
  const loadConversations = useCallback(async () => {
    // Check if user is authenticated first
    const accessToken = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
    const userEmail = typeof window !== 'undefined' ? sessionStorage.getItem('userEmail') : null;
    
    if (!accessToken || !userEmail) {
      // User not authenticated, don't try to load conversations
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
      
      // If authentication error, clear the error since user needs to log in
      if (message.includes('authentication') || message.includes('log in')) {
        setError(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load messages for a specific conversation
   * First tries to load from API, falls back to localStorage
   */
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      // Try to load from API first
      const apiMessages = await getConversationMessages(conversationId);
      
      if (apiMessages.length > 0) {
        setMessages(apiMessages);
        
        // Update localStorage with fresh data
        if (typeof window !== 'undefined') {
          const key = `conversation_${conversationId}`;
          localStorage.setItem(key, JSON.stringify(apiMessages));
        }
      } else {
        // Fallback to localStorage if API returns empty
        const localMessages = getLocalMessages(conversationId);
        setMessages(localMessages);
      }
    } catch (error) {
      console.error('Error loading messages from API, using local cache:', error);
      // Fallback to localStorage on error
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
      // Start new conversation
      const response = await startNewConversation(initialMessage);
      const { conversation_id, message_id, timestamp } = response;

      // Add user message to local state
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

      // Add assistant message placeholder
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

      // Start polling for response
      pollForResponse(conversation_id, message_id);

      // Reload conversations list
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
      // Send message
      const response = await sendMessageInConversation(currentConversationId, messageContent);
      const { message_id, timestamp } = response;

      // Add user message to local state
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

      // Add assistant message placeholder
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

      // Start polling for response
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
   * Poll for message response
   */
  const pollForResponse = useCallback(async (conversationId: string, messageId: string) => {
    // Prevent duplicate polling for the same message
    const pollKey = `${conversationId}_${messageId}`;
    if (pollingRef.current.has(pollKey)) {
      return;
    }

    pollingRef.current.add(pollKey);

    try {
      const status = await pollUntilComplete(conversationId, messageId);

      // Update message with response
      setMessages(prev => {
        return prev.map(msg => {
          if (msg.id === messageId) {
            const updatedMessage: Message = {
              ...msg,
              content: status.message,
              status: 'complete',
              timestamp: status.timestamp,
            };
            
            // Update local storage
            storeMessageLocally(conversationId, updatedMessage);
            
            return updatedMessage;
          }
          return msg;
        });
      });

      // Reload conversations to update message count
      await loadConversations();

    } catch (err) {
      console.error('Error polling for response:', err);
      
      // Update message to show error
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