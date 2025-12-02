"use client"
import React, { useState } from 'react';
import LeftSidebar from './LeftSidebar';
import CanvasArea from './CanvasArea';
import RightConfigPanel from './RightConfigPanel';
import { ThemeToggle } from '../ui/ThemeToggle';

// Define the specific tab types
type TabType = 'schematic' | 'testbench' | 'layout';

const AppDashboard = () => {
  // Explicitly type the state to match TabType
  const [activeTab, setActiveTab] = useState<TabType>('schematic');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full bg-white dark:bg-gray-900 overflow-hidden transition-colors">
      {/* Top-right theme toggle */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      <LeftSidebar isOpen={leftSidebarOpen} setIsOpen={setLeftSidebarOpen} />
      <CanvasArea
        leftSidebarOpen={leftSidebarOpen} setLeftSidebarOpen={setLeftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen} setRightSidebarOpen={setRightSidebarOpen}
      />
      <RightConfigPanel
        isOpen={rightSidebarOpen}
        setIsOpen={setRightSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  );
};

export default AppDashboard;