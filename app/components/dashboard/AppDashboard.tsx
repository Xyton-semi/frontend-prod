"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LeftSidebar from './LeftSidebar';
import CanvasArea from './CanvasArea';
import RightConfigPanel from './RightConfigPanel';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useConversation } from '@/hooks/useConversation';

type TabType = 'schematic' | 'testbench' | 'layout';

const AppDashboard = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('schematic');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const accessToken = sessionStorage.getItem('accessToken');
      const userEmail = sessionStorage.getItem('userEmail');
      
      if (!accessToken || !userEmail) {
        // Not authenticated, redirect to login
        router.push('/login');
        return;
      }
      
      setIsCheckingAuth(false);
    }
  }, [router]);

  // Use conversation hook
  const {
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
  } = useConversation();

  /**
   * Handle creating a new conversation
   */
  const handleNewConversation = async () => {
    // Clear current conversation to show empty chat
    selectConversation('');
    
    // Open right sidebar if closed
    if (!rightSidebarOpen) {
      setRightSidebarOpen(true);
    }
  };

  /**
   * Handle sending a message
   */
  const handleSendMessage = async (messageContent: string) => {
    try {
      if (!currentConversationId) {
        // Create new conversation with initial message
        await createNewConversation(messageContent);
      } else {
        // Send message in existing conversation
        await sendMessage(messageContent);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      // Error is handled by the hook
    }
  };

  /**
   * Handle checking for initial message from welcome page
   */
  useEffect(() => {
    if (isCheckingAuth) return; // Wait for auth check
    
    const initialMessage = sessionStorage.getItem('initialMessage');
    if (initialMessage) {
      sessionStorage.removeItem('initialMessage');
      
      // Create conversation with initial message
      createNewConversation(initialMessage).catch(err => {
        console.error('Failed to create initial conversation:', err);
      });
    }
  }, [createNewConversation, isCheckingAuth]);

  /**
   * Show error toast if there's an error
   */
  useEffect(() => {
    if (error) {
      // Auto-clear error after 5 seconds
      const timer = setTimeout(() => {
        clearError();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white dark:bg-gray-900 overflow-hidden transition-colors">
      {/* Top-right theme toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Error Toast */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md animate-in fade-in slide-in-from-top-2">
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="flex-shrink-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Left Sidebar with Conversations */}
      <LeftSidebar 
        isOpen={leftSidebarOpen} 
        setIsOpen={setLeftSidebarOpen}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={selectConversation}
        onNewConversation={handleNewConversation}
        isLoadingConversations={isLoading}
      />

      {/* Canvas Area */}
      <CanvasArea
        leftSidebarOpen={leftSidebarOpen} 
        setLeftSidebarOpen={setLeftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen} 
        setRightSidebarOpen={setRightSidebarOpen}
      />

      {/* Right Config Panel with Chat */}
      <RightConfigPanel
        isOpen={rightSidebarOpen}
        setIsOpen={setRightSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        messages={messages}
        onSendMessage={handleSendMessage}
        isSendingMessage={isSending}
        hasActiveConversation={!!currentConversationId && messages.length > 0}
      />
    </div>
  );
};

export default AppDashboard;