import React, { useRef } from 'react';
import { PanelRightClose, Settings, MessageSquarePlus } from 'lucide-react';
import SchematicView from './views/SchematicView';
import TestbenchView from './views/TestbenchView';
import ChatInput from './ChatInput';

type TabType = 'schematic' | 'testbench' | 'layout';

interface RightConfigPanelProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const RightConfigPanel: React.FC<RightConfigPanelProps> = ({ isOpen, setIsOpen, activeTab, setActiveTab }) => {
  const chatInputRef = useRef<HTMLDivElement>(null);

  const scrollToChatInput = () => {
    chatInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    // Optional: Focus the textarea after scrolling
    setTimeout(() => {
      const textarea = chatInputRef.current?.querySelector('textarea');
      textarea?.focus();
    }, 500);
  };

  return (
    <div className={`${isOpen ? 'w-96' : 'w-0'} flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out overflow-hidden`}>
      <div className="p-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Configuration</h2>
              <div className="flex items-center gap-2">
                {/* New Chat button - more prominent */}
                <button 
                  onClick={scrollToChatInput} 
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  title="Start new chat"
                  aria-label="Start new chat"
                >
                  <MessageSquarePlus size={16} />
                  <span>New Chat</span>
                </button>
                {/* Close button for mobile */}
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="Close panel"
                >
                    <PanelRightClose size={20} />
                </button>
              </div>
          </div>

        {/* Tabs */}
        <div className="flex space-x-6 border-b border-gray-200 dark:border-gray-700 relative">
          {['schematic', 'testbench', 'layout'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as TabType)}
              className={`pb-3 text-sm font-medium capitalize transition-colors relative
                ${activeTab === tab ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              {tab === 'testbench' ? 'Testbench & Results' : tab === 'layout' ? 'Final Layout' : tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 rounded-t-full"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin">
        {activeTab === 'schematic' && <SchematicView />}
        {activeTab === 'testbench' && <TestbenchView />}
        {activeTab === 'layout' && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500 animate-in fade-in duration-300">
                <Settings size={48} className="mb-4 opacity-50" />
                <p>Layout generation pending...</p>
            </div>
        )}
      </div>
      
      {/* Chat Input with ref */}
      <div ref={chatInputRef}>
        <ChatInput />
      </div>
    </div>
  );
};

export default RightConfigPanel;