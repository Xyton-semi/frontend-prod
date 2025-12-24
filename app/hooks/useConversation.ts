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
  deleteConversation,
  togglePinConversation,
  type Conversation,
  type Message,
} from '@/utils/conversation-api';
import type { FileAttachment } from '@/utils/file-upload';

interface UseConversationResult {
  // State
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  isDeleting: boolean;
  isPinning: boolean;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  createNewConversation: (initialMessage: string, attachments?: FileAttachment[]) => Promise<string>;
  selectConversation: (conversationId: string) => void;
  sendMessage: (message: string, attachments?: FileAttachment[]) => Promise<void>;
  stopResponse: () => void;
  deleteConversation: (conversationId: string) => Promise<void>;
  togglePin: (conversationId: string) => Promise<void>;
  clearError: () => void;
}

export function useConversation(): UseConversationResult {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingRef = useRef<Set<string>>(new Set());
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const streamingControllers = useRef<Map<string, () => void>>(new Map());

  /**
   * Load all conversations for the user and sort by created_at (newest first)
   * Pinned conversations will be at the top
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
      
      // Sort within each group (pinned and unpinned) by created_at (newest first)
      const pinnedConvs = data.filter(c => c.is_pinned).sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
      
      const unpinnedConvs = data.filter(c => !c.is_pinned).sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });
      
      // Pinned conversations first, then unpinned
      setConversations([...pinnedConvs, ...unpinnedConvs]);
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
    if (!conversationId) {
      console.warn('No conversation ID provided');
      setMessages([]);
      return;
    }

    setError(null); // Clear any previous errors
    
    try {
      const apiMessages = await getConversationMessages(conversationId);
      
      if (apiMessages.length > 0) {
        setMessages(apiMessages);
        
        if (typeof window !== 'undefined') {
          const key = `conversation_${conversationId}`;
          localStorage.setItem(key, JSON.stringify(apiMessages));
        }
      } else {
        // Check if we have local cache
        const localMessages = getLocalMessages(conversationId);
        if (localMessages.length > 0) {
          setMessages(localMessages);
        } else {
          // No messages at all - this is a new/empty conversation
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error loading messages from API:', error);
      
      // Set user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to load messages';
      
      // Only show error if it's not a "not found" error
      if (!errorMessage.toLowerCase().includes('not found')) {
        setError(errorMessage);
      }
      
      // Try to load from local cache
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
   * Create a new conversation with an initial message and optional attachments
   */
  const createNewConversation = useCallback(async (
    initialMessage: string,
    attachments?: FileAttachment[]
  ): Promise<string> => {
    setIsSending(true);
    setError(null);

    try {
      // Extract the original message (before table context if present)
      const originalMessage = initialMessage.split('\n\n[CURRENT')[0].trim();
      
      console.log('Creating new conversation with', attachments?.length || 0, 'attachments');
      
      const response = await startNewConversation(initialMessage, attachments);
      const { conversation_id, message_id, timestamp } = response;

      const userMessage: Message = {
        id: `user_${Date.now()}`,
        conversation_id,
        role: 'user',
        content: originalMessage,
        timestamp: timestamp || new Date().toISOString(),
        status: 'complete',
        attachments: attachments,
        filenames: attachments?.map(a => a.filename),
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
   * Send a message in the current conversation with optional attachments
   */
  const sendMessage = useCallback(async (
    messageContent: string,
    attachments?: FileAttachment[]
  ) => {
    if (!currentConversationId) {
      setError('No conversation selected');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      // Extract the original message (before table context if present)
      const originalMessage = messageContent.split('\n\n[CURRENT')[0].trim();
      
      console.log('Sending message with', attachments?.length || 0, 'attachments');
      
      const response = await sendMessageInConversation(
        currentConversationId, 
        messageContent,
        attachments
      );
      const { message_id, timestamp } = response;

      const userMessage: Message = {
        id: `user_${Date.now()}`,
        conversation_id: currentConversationId,
        role: 'user',
        content: originalMessage,
        timestamp,
        status: 'complete',
        attachments: attachments,
        filenames: attachments?.map(a => a.filename),
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

      // Don't set isSending to false here - let pollForResponse handle it
      pollForResponse(currentConversationId, message_id);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      setError(message);
      console.error('Error sending message:', err);
      setIsSending(false);
    }
  }, [currentConversationId]);

  /**
   * Delete a conversation
   */
  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    console.log('handleDeleteConversation called with:', conversationId);
    setIsDeleting(true);
    setError(null);

    try {
      console.log('Calling deleteConversation API...');
      const result = await deleteConversation(conversationId);
      console.log('Delete API result:', result);
      
      if (result.success) {
        // Remove from conversations list
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        
        // Clear messages if this was the active conversation
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null);
          setMessages([]);
        }
        
        console.log('Conversation deleted:', result.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete conversation';
      setError(message);
      console.error('Error deleting conversation:', err);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, [currentConversationId]);

  /**
   * Toggle pin status of a conversation
   */
  const handleTogglePin = useCallback(async (conversationId: string) => {
    console.log('handleTogglePin called with:', conversationId);
    setIsPinning(true);
    setError(null);

    try {
      console.log('Calling togglePinConversation API...');
      const result = await togglePinConversation(conversationId);
      console.log('Toggle pin API result:', result);
      
      if (result.success) {
        // Update the conversation in the list
        setConversations(prev => {
          const updated = prev.map(c => 
            c.id === conversationId 
              ? { ...c, is_pinned: result.is_pinned }
              : c
          );
          
          // Re-sort: pinned first, then unpinned, each sorted by date
          const pinnedConvs = updated.filter(c => c.is_pinned).sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA;
          });
          
          const unpinnedConvs = updated.filter(c => !c.is_pinned).sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA;
          });
          
          return [...pinnedConvs, ...unpinnedConvs];
        });
        
        console.log('Pin status toggled:', result.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle pin';
      setError(message);
      console.error('Error toggling pin:', err);
      throw err;
    } finally {
      setIsPinning(false);
    }
  }, []);

  /**
   * Poll for message response with streaming effect
   */
  const pollForResponse = useCallback(async (conversationId: string, messageId: string) => {
    const pollKey = `${conversationId}_${messageId}`;
    if (pollingRef.current.has(pollKey)) {
      console.log('⚠️ Already polling:', pollKey);
      return;
    }

    pollingRef.current.add(pollKey);
    console.log('🔄 Starting poll for:', messageId);

    // Create abort controller for this polling operation
    const abortController = new AbortController();
    abortControllers.current.set(messageId, abortController);

    try {
      const status = await pollUntilComplete(
        conversationId, 
        messageId, 
        undefined, 
        60, 
        1000, 
        5000,
        abortController.signal
      );
      console.log('✅ Poll complete! Message length:', status.message.length);

      // Cancel any existing stream for this message
      const existingCancel = streamingControllers.current.get(messageId);
      if (existingCancel) {
        console.log('🛑 Cancelling existing stream');
        existingCancel();
        streamingControllers.current.delete(messageId);
      }

      // Start streaming effect
      setTimeout(() => {
        console.log('🎬 Initiating streaming for:', messageId);
        streamMessage(conversationId, messageId, status.message, status.timestamp);
      }, 50);

      await loadConversations();

    } catch (err) {
      // Don't show error if user aborted
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('Polling aborted by user for:', messageId);
        
        // Mark message as complete with current content
        setMessages(prev => {
          return prev.map(msg => {
            if (msg.id === messageId && msg.status === 'processing') {
              const completedMessage: Message = {
                ...msg,
                status: 'complete',
              };
              
              if (currentConversationId) {
                storeMessageLocally(currentConversationId, completedMessage);
              }
              
              return completedMessage;
            }
            return msg;
          });
        });
        setIsSending(false);
      } else {
        console.error('Error polling for response:', err);
        
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
        setIsSending(false);
      }
    } finally {
      pollingRef.current.delete(pollKey);
      abortControllers.current.delete(messageId);
    }
  }, [loadConversations, currentConversationId]);

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
              console.log('Storing completed message:', messageId);
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
        const chunkSize = Math.min(
          Math.max(1, Math.floor(Math.random() * 3) + 1),
          fullText.length - currentIndex
        );
        currentIndex += chunkSize;

        const partial = fullText.substring(0, currentIndex);
        updateMessage(partial, false);

        setTimeout(streamChunk, 15);
      } else {
        console.log('✨ Streaming finished for:', messageId);
        updateMessage(fullText, true);
        streamingControllers.current.delete(messageId);
        setIsSending(false);
      }
    };

    streamChunk();

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
   * Stop the current streaming response
   */
  const stopResponse = useCallback(() => {
    console.log('Stopping all active streams and polling');
    
    // Abort all active polling operations
    abortControllers.current.forEach((controller, messageId) => {
      console.log('Aborting polling for message:', messageId);
      controller.abort();
    });
    abortControllers.current.clear();
    
    // Cancel all active streams
    streamingControllers.current.forEach((cancel, messageId) => {
      console.log('Cancelling stream for message:', messageId);
      cancel();
      
      // Mark the message as complete with current content
      setMessages(prev => {
        return prev.map(msg => {
          if (msg.id === messageId && msg.status === 'processing') {
            const completedMessage: Message = {
              ...msg,
              status: 'complete',
            };
            
            if (currentConversationId) {
              storeMessageLocally(currentConversationId, completedMessage);
            }
            
            return completedMessage;
          }
          return msg;
        });
      });
    });
    
    streamingControllers.current.clear();
    setIsSending(false);
    
    console.log('✅ All streams and polling stopped');
  }, [currentConversationId]);

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
      console.log('🧹 Cleaning up streams and polling');
      abortControllers.current.forEach(controller => controller.abort());
      abortControllers.current.clear();
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
    isDeleting,
    isPinning,
    error,
    loadConversations,
    createNewConversation,
    selectConversation,
    sendMessage,
    stopResponse,
    deleteConversation: handleDeleteConversation,
    togglePin: handleTogglePin,
    clearError,
  };
}