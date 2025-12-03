"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LeftSidebar from './LeftSidebar';
import ChatMessages from './ChatMessages';
import NewChatInput from './NewChatInput';
import SchematicView from './views/SchematicView';
import TestbenchView from './views/TestbenchView';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useConversation } from '@/hooks/useConversation';
import { Settings } from 'lucide-react';

type TabType = 'schematic' | 'testbench' | 'layout';

/**
 * AppDashboard - Chat in Center, Right Panel with Views
 * Layout: Left Sidebar | Center Chat | Right Panel (SchematicView/TestbenchView)
 */
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
    selectConversation('');
  };

  /**
   * Handle sending a message
   */
  const handleSendMessage = async (messageContent: string) => {
    try {
      if (!currentConversationId) {
        await createNewConversation(messageContent);
      } else {
        await sendMessage(messageContent);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  /**
   * Handle checking for initial message from welcome page
   */
  useEffect(() => {
    if (isCheckingAuth) return;
    
    const initialMessage = sessionStorage.getItem('initialMessage');
    if (initialMessage) {
      sessionStorage.removeItem('initialMessage');
      createNewConversation(initialMessage).catch(err => {
        console.error('Failed to create initial conversation:', err);
      });
    }
  }, [createNewConversation, isCheckingAuth]);

  /**
   * Auto-clear error after 5 seconds
   */
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-gray-950 overflow-hidden">
      {/* Top-right theme toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Error Toast */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md">
          <div className="bg-red-900/20 border border-red-800 p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-mono text-red-200 uppercase tracking-wider">Error</h3>
                <p className="mt-1 text-sm font-mono text-red-300">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="flex-shrink-0 text-red-400 hover:text-red-300"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Left Sidebar - Conversations */}
      <LeftSidebar 
        isOpen={leftSidebarOpen} 
        setIsOpen={setLeftSidebarOpen}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={selectConversation}
        onNewConversation={handleNewConversation}
        isLoadingConversations={isLoading}
      />

      {/* Center - Chat Interface */}
      <div className="flex-1 flex flex-col bg-gray-950">
        {/* Chat Messages */}
        <ChatMessages messages={messages} isLoading={isSending} />
        
        {/* Chat Input */}
        <NewChatInput 
          onSubmit={handleSendMessage}
          disabled={false}
          isLoading={isSending}
        />
      </div>

      {/* Right Sidebar - Configuration Panel */}
      <div className={`
        ${rightSidebarOpen ? 'w-80' : 'w-0'} 
        flex-shrink-0 bg-gray-900 border-l border-gray-800 
        flex flex-col transition-all duration-300 ease-in-out overflow-hidden
      `}>
        {/* Header */}
        <div className="p-6 flex-shrink-0 border-b border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-mono font-bold text-gray-100 uppercase tracking-wider">
              Configuration
            </h2>
            <button 
              onClick={() => setRightSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-6 border-b border-gray-800">
            <button 
              onClick={() => setActiveTab('schematic')}
              className={`pb-3 font-mono text-xs uppercase tracking-wider transition-colors relative ${
                activeTab === 'schematic' ? 'text-gray-100' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Schematic
              {activeTab === 'schematic' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></div>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('testbench')}
              className={`pb-3 font-mono text-xs uppercase tracking-wider transition-colors relative ${
                activeTab === 'testbench' ? 'text-gray-100' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Test
              {activeTab === 'testbench' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></div>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('layout')}
              className={`pb-3 font-mono text-xs uppercase tracking-wider transition-colors relative ${
                activeTab === 'layout' ? 'text-gray-100' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Layout
              {activeTab === 'layout' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></div>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-900 scrollbar-thin scrollbar-thumb-gray-700">
          {activeTab === 'schematic' && <SchematicView />}
          {activeTab === 'testbench' && <TestbenchView />}
          {activeTab === 'layout' && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-center space-y-4">
                <Settings size={48} className="mx-auto text-gray-700" />
                <h3 className="font-mono text-sm font-bold text-gray-300 uppercase tracking-wider">
                  Layout Tools
                </h3>
                <p className="font-mono text-xs text-gray-600 max-w-xs">
                  Layout generation and visualization coming soon
                </p>
                <div className="inline-block px-4 py-2 bg-gray-800 border border-gray-700 mt-4">
                  <span className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Right Sidebar Button (when closed) */}
      {!rightSidebarOpen && (
        <button
          onClick={() => setRightSidebarOpen(true)}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gray-900 border-l border-t border-b border-gray-800 p-2 hover:bg-gray-800 transition-colors"
          title="Show configuration panel"
        >
          <Settings size={20} className="text-gray-500" />
        </button>
      )}
    </div>
  );
};

export default AppDashboard;