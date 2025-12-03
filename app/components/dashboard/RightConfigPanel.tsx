import React, { useRef } from 'react';
import { PanelRightClose, Settings, MessageSquarePlus } from 'lucide-react';
import SchematicView from './views/SchematicView';
import TestbenchView from './views/TestbenchView';
import ChatMessages from './ChatMessages';
import NewChatInput from './NewChatInput';
import type { Message } from '@/utils/conversation-api';

type TabType = 'schematic' | 'testbench' | 'layout';

interface RightConfigPanelProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  
  // Chat/Conversation props
  messages?: Message[];
  onSendMessage?: (message: string) => Promise<void>;
  isSendingMessage?: boolean;
  hasActiveConversation?: boolean;
}

const RightConfigPanel: React.FC<RightConfigPanelProps> = ({ 
  isOpen, 
  setIsOpen, 
  activeTab, 
  setActiveTab,
  messages = [],
  onSendMessage,
  isSendingMessage = false,
  hasActiveConversation = false,
}) => {
  const chatInputRef = useRef<HTMLDivElement>(null);

  const scrollToChatInput = () => {
    chatInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    setTimeout(() => {
      const textarea = chatInputRef.current?.querySelector('textarea');
      textarea?.focus();
    }, 500);
  };

  return (
    <div className={`${isOpen ? 'w-96' : 'w-0'} flex-shrink-0 bg-gray-900 border-l border-gray-800 flex flex-col transition-all duration-300 ease-in-out overflow-hidden`}>
      <div className="p-6 flex-shrink-0 border-b border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-mono font-bold text-gray-100 uppercase tracking-wider">Chat</h2>
          <div className="flex items-center gap-2">
            {/* New Chat button */}
            <button 
              onClick={scrollToChatInput} 
              className="flex items-center gap-2 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded-sm transition-colors"
              title="Start new chat"
              aria-label="Start new chat"
            >
              <MessageSquarePlus size={16} />
              <span>New</span>
            </button>
            {/* Close button for mobile */}
            <button 
              onClick={() => setIsOpen(false)} 
              className="text-gray-500 hover:text-gray-300 lg:hidden p-2 hover:bg-gray-800 rounded-sm transition-colors"
              aria-label="Close panel"
            >
              <PanelRightClose size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-6 border-b border-gray-800 relative">
          {['schematic', 'testbench', 'layout'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as TabType)}
              className={`pb-3 font-mono text-xs uppercase tracking-wider transition-colors relative
                ${activeTab === tab ? 'text-gray-100' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {tab === 'testbench' ? 'Test' : tab === 'layout' ? 'Layout' : tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area - Show chat if no active conversation, otherwise show tabs */}
      {!hasActiveConversation ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Chat Messages */}
          <ChatMessages messages={messages} isLoading={isSendingMessage} />
          
          {/* Chat Input */}
          <div ref={chatInputRef}>
            <NewChatInput 
              onSubmit={onSendMessage}
              disabled={!hasActiveConversation && messages.length === 0}
              isLoading={isSendingMessage}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 bg-gray-900 scrollbar-thin scrollbar-thumb-gray-700">
            {activeTab === 'schematic' && <SchematicView />}
            {activeTab === 'testbench' && <TestbenchView />}
            {activeTab === 'layout' && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 animate-in fade-in duration-300">
                <Settings size={48} className="mb-4 opacity-50" />
                <p className="font-mono text-xs uppercase tracking-wider">Layout generation pending...</p>
              </div>
            )}
          </div>
          
          {/* Chat Input */}
          <div ref={chatInputRef}>
            <NewChatInput 
              onSubmit={onSendMessage}
              disabled={false}
              isLoading={isSendingMessage}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default RightConfigPanel;