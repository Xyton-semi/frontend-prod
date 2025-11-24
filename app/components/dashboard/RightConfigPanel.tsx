import React from 'react';
import { PanelRightClose, Settings } from 'lucide-react';
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
  return (
    <div className={`${isOpen ? 'w-96' : 'w-0'} flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out overflow-hidden`}>
      <div className="p-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Configuration</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 lg:hidden">
                  <PanelRightClose size={20} />
              </button>
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
      <ChatInput />
    </div>
  );
};

export default RightConfigPanel;