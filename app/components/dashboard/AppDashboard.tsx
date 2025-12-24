"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LeftSidebar from './LeftSidebar';
import ChatMessages from './ChatMessages';
import NewChatInput from './NewChatInput';
import EditablePinBoundaryTable from './EditablePinBoundaryTable';
import EditableRequirementsTable from './EditableRequirementsTable';
import CustomSheetsManager from './CustomSheetsManager';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useConversation } from '@/hooks/useConversation';
import { parseCSV } from '@/utils/data';

import { FileSpreadsheet, FileCheck, Upload, Database, X, ChevronLeft, ChevronRight } from 'lucide-react';

type DataTabType = 'pin-boundary' | 'feasibility' | 'simulation-plan' | 'custom-sheets';

// Generic row interface for dynamic columns
interface DataRow {
  [key: string]: string;
}

/**
 * AppDashboard - Chat with Data Tables in Right Sidebar
 * Layout: Left Sidebar | Center (Chat) | Right Sidebar (Data Tables)
 */
const AppDashboard = () => {
  const router = useRouter();
  const [activeDataTab, setActiveDataTab] = useState<DataTabType>('pin-boundary');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false); // Default to collapsed
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(500); // Default width in pixels
  const [isResizing, setIsResizing] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [includeTablesInContext, setIncludeTablesInContext] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  
  // Data state - using generic DataRow interface
  const [pinBoundaryData, setPinBoundaryData] = useState<DataRow[]>([]);
  const [requirementsData, setRequirementsData] = useState<DataRow[]>([]);
  const [simulationPlanData, setSimulationPlanData] = useState<DataRow[]>([]);
  const [customSheets, setCustomSheets] = useState<Array<{id: string; name: string; data: any[]; headers: string[]}>>([]);
  const [customSheetsExpanded, setCustomSheetsExpanded] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [tablesModified, setTablesModified] = useState(false);
  const [lastModifiedTime, setLastModifiedTime] = useState<string>('');

  // Check authentication on mount and force dark mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Force dark mode
      document.documentElement.classList.add('dark');
      
      const accessToken = sessionStorage.getItem('accessToken');
      const userEmail = sessionStorage.getItem('userEmail');
      
      if (!accessToken || !userEmail) {
        router.push('/login');
        return;
      }
      
      setIsCheckingAuth(false);
    }
  }, [router]);

  // Load CSV data
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        // Try loading from uploaded files first
        const [pinRes, reqRes, simRes] = await Promise.all([
          fetch('/mnt/user-data/uploads/step0_pin_boundary.csv').catch(() => null),
          fetch('/mnt/user-data/uploads/step1_requirements.csv').catch(() => null),
          fetch('/mnt/user-data/uploads/step2_simulation_plan.csv').catch(() => null)
        ]);

        // Load Pin/Boundary data
        if (pinRes && pinRes.ok) {
          const pinText = await pinRes.text();
          setPinBoundaryData(parseCSV<DataRow>(pinText));
        } else {
          // Fallback to public folder
          const fallbackPin = await fetch('/step0_pin_boundary.csv');
          const pinText = await fallbackPin.text();
          setPinBoundaryData(parseCSV<DataRow>(pinText));
        }

        // Load Requirements data
        if (reqRes && reqRes.ok) {
          const reqText = await reqRes.text();
          setRequirementsData(parseCSV<DataRow>(reqText));
        } else {
          // Fallback to public folder
          const fallbackReq = await fetch('/step1_requirements.csv');
          const reqText = await fallbackReq.text();
          setRequirementsData(parseCSV<DataRow>(reqText));
        }

        // Load Simulation Plan data
        if (simRes && simRes.ok) {
          const simText = await simRes.text();
          setSimulationPlanData(parseCSV<DataRow>(simText));
        } else {
          // Fallback to public folder
          const fallbackSim = await fetch('/step2_simulation_plan.csv').catch(() => null);
          if (fallbackSim && fallbackSim.ok) {
            const simText = await fallbackSim.text();
            setSimulationPlanData(parseCSV<DataRow>(simText));
          }
        }
      } catch (error) {
        console.error('Error loading CSV data:', error);
      } finally {
        setIsLoadingData(false);
      }
      
      // Load custom sheets from localStorage
      const savedSheets = localStorage.getItem('customSheets');
      if (savedSheets) {
        try {
          setCustomSheets(JSON.parse(savedSheets));
        } catch (e) {
          console.error('Error loading custom sheets:', e);
        }
      }
    };

    loadData();
  }, []);

  // Save custom sheets to localStorage whenever they change
  useEffect(() => {
    if (customSheets.length > 0) {
      localStorage.setItem('customSheets', JSON.stringify(customSheets));
    }
  }, [customSheets]);

  // ============================================================
  // UPDATED: Use conversation hook with NEW delete/pin functions
  // ============================================================
  const {
    conversations,
    currentConversationId,
    messages,
    isLoading,
    isSending,
    isDeleting,              // ← ADDED: Delete loading state
    isPinning,               // ← ADDED: Pin loading state
    error,
    loadConversations,
    createNewConversation,
    selectConversation,
    sendMessage,
    stopResponse,
    deleteConversation,      // ← ADDED: Delete function
    togglePin,               // ← ADDED: Pin/unpin function
    clearError,
  } = useConversation();

  // Filter messages based on search query
  const filteredMessages = React.useMemo(() => {
    if (!messageSearchQuery.trim()) {
      return messages;
    }

    const query = messageSearchQuery.toLowerCase();
    return messages.filter((message) => {
      // Search in message content
      if (message.content.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search in filenames if present
      if (message.filenames && message.filenames.some(
        filename => filename.toLowerCase().includes(query)
      )) {
        return true;
      }
      
      return false;
    });
  }, [messages, messageSearchQuery]);

  /**
   * Handle creating a new conversation
   */
  const handleNewConversation = async () => {
    selectConversation('');
  };

  /**
   * Format table data for AI context
   */
  const formatTableDataForContext = () => {
    const context = [];
    
    // Add Pin/Boundary data summary with detailed voltage info
    if (pinBoundaryData.length > 0) {
      context.push(`\n[CURRENT PIN & BOUNDARY DATA]`);
      context.push(`Total pins: ${pinBoundaryData.length}`);
      pinBoundaryData.slice(0, 5).forEach((row, idx) => {
        // Include voltage ranges if available
        const voltageInfo = row['VoltageMin'] || row['VoltageMax'] 
          ? ` (${row['VoltageMin'] || '-'} to ${row['VoltageMax'] || '-'} ${row['Units'] || 'V'})` 
          : '';
        const directionInfo = row['Direction'] ? ` [${row['Direction']}]` : '';
        context.push(`${idx + 1}. ${row['RowType']}: ${row['Name']}${voltageInfo}${directionInfo} - ${row['Function'] || 'N/A'}`);
      });
      if (pinBoundaryData.length > 5) {
        context.push(`... and ${pinBoundaryData.length - 5} more rows`);
      }
    }
    
    // Add Requirements data summary
    if (requirementsData.length > 0) {
      context.push(`\n[CURRENT REQUIREMENTS DATA]`);
      context.push(`Total specifications: ${requirementsData.length}`);
      requirementsData.slice(0, 5).forEach((row, idx) => {
        const minVal = row['User Target Min'] || row['Actual Min'] || '-';
        const maxVal = row['User Target Max'] || row['Actual Max'] || '-';
        const typVal = row['User Target Typ'] || row['Actual Typ'];
        const valueRange = typVal 
          ? `${minVal}/${typVal}/${maxVal}`
          : `${minVal}-${maxVal}`;
        context.push(`${idx + 1}. ${row['Parameter']} (${row['Symbol']}): ${valueRange} ${row['Units']} [Priority: ${row['Priority']}]`);
      });
      if (requirementsData.length > 5) {
        context.push(`... and ${requirementsData.length - 5} more specifications`);
      }
    }
    
    // Add Simulation Plan data summary
    if (simulationPlanData.length > 0) {
      context.push(`\n[CURRENT SIMULATION PLAN DATA]`);
      context.push(`Total items: ${simulationPlanData.length}`);
      simulationPlanData.slice(0, 5).forEach((row, idx) => {
        const voltageInfo = row['VoltageMin'] || row['VoltageMax'] 
          ? ` (${row['VoltageMin'] || '-'} to ${row['VoltageMax'] || '-'} ${row['Units'] || 'V'})` 
          : '';
        const directionInfo = row['Direction'] ? ` [${row['Direction']}]` : '';
        context.push(`${idx + 1}. ${row['RowType']}: ${row['Name']}${voltageInfo}${directionInfo} - ${row['Function'] || 'N/A'}`);
      });
      if (simulationPlanData.length > 5) {
        context.push(`... and ${simulationPlanData.length - 5} more rows`);
      }
    }
    
    return context.length > 0 ? context.join('\n') : '';
  };

  /**
   * Handle sending a message with optional table context
   */
  const handleSendMessage = async (messageContent: string) => {
    try {
      let messageForAPI = messageContent;
      
      if (includeTablesInContext) {
        const tableContext = formatTableDataForContext();
        if (tableContext) {
          messageForAPI = `${messageContent}\n\n${tableContext}\n\nNote: Please consider the current Pin/Boundary and Requirements data shown above in your response.`;
        }
      }
      
      if (!currentConversationId) {
        await createNewConversation(messageForAPI);
      } else {
        await sendMessage(messageForAPI);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  /**
   * Handle data save callbacks - now accepts generic DataRow[]
   */
  const handlePinBoundarySave = (data: DataRow[]) => {
    setPinBoundaryData(data);
    localStorage.setItem('pinBoundaryData', JSON.stringify(data));
    setTablesModified(true);
    setLastModifiedTime(new Date().toLocaleString());
    console.log('Pin/Boundary data saved:', data.length, 'rows');
  };

  const handleRequirementsSave = (data: DataRow[]) => {
    setRequirementsData(data);
    localStorage.setItem('requirementsData', JSON.stringify(data));
    setTablesModified(true);
    setLastModifiedTime(new Date().toLocaleString());
    console.log('Requirements data saved:', data.length, 'rows');
  };

  const handleSimulationPlanSave = (data: DataRow[]) => {
    setSimulationPlanData(data);
    localStorage.setItem('simulationPlanData', JSON.stringify(data));
    setTablesModified(true);
    setLastModifiedTime(new Date().toLocaleString());
    console.log('Simulation Plan data saved:', data.length, 'rows');
  };

  /**
   * Handle checking for initial message from welcome page
   */
  useEffect(() => {
    if (isCheckingAuth) return;
    
    // Check for conversation ID to open (from welcome page)
    const openConversationId = sessionStorage.getItem('openConversationId');
    if (openConversationId) {
      sessionStorage.removeItem('openConversationId');
      selectConversation(openConversationId);
      return;
    }
    
    // Check for initial message (from welcome page)
    const initialMessage = sessionStorage.getItem('initialMessage');
    if (initialMessage) {
      sessionStorage.removeItem('initialMessage');
      createNewConversation(initialMessage).catch(err => {
        console.error('Failed to create initial conversation:', err);
      });
    }
  }, [createNewConversation, selectConversation, isCheckingAuth]);

  /**
   * Keyboard shortcut: Ctrl/Cmd + D to toggle right sidebar
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setRightSidebarOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * Handle right sidebar resize
   */
  const handleResizeStart = () => {
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    // Add cursor style to body during resize
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      // Constrain width between 300px and 800px
      setRightSidebarWidth(Math.max(300, Math.min(800, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

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
      {/* XYTON logo - top-left when sidebar is open */}
      {leftSidebarOpen && (
        <div className="absolute top-4 left-4 z-50">
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-900 border border-gray-800 shadow-lg">
            <div className="text-red-800 font-mono font-bold text-xl tracking-wider">
              XYTON
            </div>
          </div>
        </div>
      )}

      {/* Top-right theme toggle */}
      {/* <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div> */}

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
      
      {/* ============================================================ */}
      {/* UPDATED: Left Sidebar with DELETE and PIN props             */}
      {/* ============================================================ */}
      <LeftSidebar 
        isOpen={leftSidebarOpen} 
        setIsOpen={setLeftSidebarOpen}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={selectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={deleteConversation}    // ← ADDED: Delete handler
        onTogglePin={togglePin}                       // ← ADDED: Pin/unpin handler
        isLoadingConversations={isLoading}
        isDeleting={isDeleting}                       // ← ADDED: Delete loading state
        isPinning={isPinning}                         // ← ADDED: Pin loading state
      />

      {/* Center - Chat Interface */}
      <div className="flex-1 flex flex-col bg-gray-950 min-w-0 relative">
        {/* XYTON logo - Centered in chat area when sidebar collapsed */}
        {!leftSidebarOpen && (
          <>
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
              <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-900 border border-gray-800 shadow-lg">
                <div className="text-red-800 font-mono font-bold text-xl tracking-wider">
                  XYTON
                </div>
              </div>
            </div>
            
            {/* Expand sidebar button on left edge */}
            <button
              onClick={() => setLeftSidebarOpen(true)}
              className="absolute top-1/2 left-0 transform -translate-y-1/2 z-50 bg-gray-900 border border-gray-800 border-l-0 rounded-r-lg p-2 text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-all shadow-lg"
              title="Show conversations"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
        
        {/* Chat Section */}
        <div className="flex-1 flex flex-col min-h-0 bg-gray-950 relative">
          {/* Chat Header - Only show when there are messages */}
          {messages.length > 0 && (
            <div className="flex-shrink-0 px-6 py-3 border-b border-gray-800 bg-gray-900 flex items-center justify-between gap-4">
              {/* Conversation Name - Left */}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-gray-200 truncate">
                  {conversations.find(c => c.id === currentConversationId)?.name || 'New Conversation'}
                </h2>
              </div>
              
              {/* Search Bar - Right */}
              <div className="relative w-64 flex-shrink-0">
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={messageSearchQuery}
                  onChange={(e) => setMessageSearchQuery(e.target.value)}
                  className="w-full px-3 py-1.5 pl-9 pr-8 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-600 transition-colors"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {messageSearchQuery && (
                  <button
                    onClick={() => setMessageSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    title="Clear search"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Chat Messages */}
          {messageSearchQuery.trim() && filteredMessages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="text-center max-w-md">
                <div className="mb-4">
                  <svg
                    className="w-16 h-16 mx-auto text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-300 mb-2">
                  No messages found
                </h3>
                <p className="text-sm text-gray-500">
                  No messages match your search for "{messageSearchQuery}"
                </p>
              </div>
            </div>
          ) : (
            <ChatMessages 
              messages={filteredMessages} 
              isLoading={isSending}
            />
          )}
          
          {/* Floating Stop Button - Appears while generating */}
          {isSending && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button
                onClick={stopResponse}
                className="flex items-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg shadow-red-900/50 transition-all hover:scale-105 active:scale-95 group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="font-mono text-sm font-medium">Generating...</span>
                </div>
                <div className="w-px h-5 bg-white/30"></div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                  <span className="font-mono text-sm font-bold">Stop</span>
                </div>
              </button>
              <div className="text-center mt-2">
                <span className="text-xs font-mono text-gray-500 bg-gray-900/80 px-3 py-1 rounded-full">
                  or press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 font-mono text-[10px]">ESC</kbd>
                </span>
              </div>
            </div>
          )}
          
          {/* Chat Input - pass the toggle state and handler */}
          <NewChatInput 
            onSubmit={handleSendMessage}
            onStop={stopResponse}
            disabled={false}
            isLoading={isSending}
            includeTablesInContext={includeTablesInContext}
            onToggleTableContext={() => {
              setIncludeTablesInContext(!includeTablesInContext);
              // Open the right sidebar when enabling table context
              if (!includeTablesInContext) {
                setRightSidebarOpen(true);
              }
            }}
          />
        </div>
      </div>

      {/* Right Sidebar - Data Tables */}
      <div 
        className="flex-shrink-0 border-l border-gray-800 bg-gray-900 flex flex-col overflow-hidden relative transition-all duration-300 ease-in-out"
        style={{ width: rightSidebarOpen ? `${rightSidebarWidth}px` : '0px' }}
      >
        {rightSidebarOpen && (
          <>
            {/* Resize Handle */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-1 hover:w-1.5 bg-transparent hover:bg-red-600 cursor-col-resize z-50 transition-all ${
                isResizing ? 'w-1.5 bg-red-600' : ''
              }`}
              onMouseDown={handleResizeStart}
              title="Drag to resize"
            />
            
            {/* Right Sidebar Header */}
            <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-red-500" />
                <h3 className="text-sm font-mono font-semibold text-gray-200 uppercase tracking-wider">
                  Data Tables
                </h3>
              </div>
              <button
                onClick={() => setRightSidebarOpen(false)}
                className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors"
                title="Close sidebar (Ctrl/Cmd + D)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900 overflow-x-auto">
              <div className="flex items-center px-2">
                <button
                  onClick={() => setActiveDataTab('pin-boundary')}
                  className={`
                    flex items-center gap-2 px-3 py-2.5 font-mono text-xs uppercase tracking-wider 
                    transition-all relative whitespace-nowrap
                    ${activeDataTab === 'pin-boundary' 
                      ? 'text-red-500 bg-gray-800' 
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                    }
                  `}
                >
                  <FileSpreadsheet size={14} />
                  Pin & Boundary
                  {activeDataTab === 'pin-boundary' && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></div>
                  )}
                </button>

                <button
                  onClick={() => setActiveDataTab('feasibility')}
                  className={`
                    flex items-center gap-2 px-3 py-2.5 font-mono text-xs uppercase tracking-wider 
                    transition-all relative whitespace-nowrap
                    ${activeDataTab === 'feasibility' 
                      ? 'text-red-500 bg-gray-800' 
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                    }
                  `}
                >
                  <FileCheck size={14} />
                  Feasibility
                  {activeDataTab === 'feasibility' && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></div>
                  )}
                </button>

                <button
                  onClick={() => setActiveDataTab('simulation-plan')}
                  className={`
                    flex items-center gap-2 px-3 py-2.5 font-mono text-xs uppercase tracking-wider 
                    transition-all relative whitespace-nowrap
                    ${activeDataTab === 'simulation-plan' 
                      ? 'text-red-500 bg-gray-800' 
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                    }
                  `}
                >
                  <FileSpreadsheet size={14} />
                  Simulation
                  {activeDataTab === 'simulation-plan' && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></div>
                  )}
                </button>

                <button
                  onClick={() => setActiveDataTab('custom-sheets')}
                  className={`
                    flex items-center gap-2 px-3 py-2.5 font-mono text-xs uppercase tracking-wider 
                    transition-all relative whitespace-nowrap
                    ${activeDataTab === 'custom-sheets' 
                      ? 'text-red-500 bg-gray-800' 
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                    }
                  `}
                >
                  <Upload size={14} />
                  Custom
                  {customSheets.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-red-900/30 text-red-400 text-[10px] font-bold rounded">
                      {customSheets.length}
                    </span>
                  )}
                  {activeDataTab === 'custom-sheets' && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></div>
                  )}
                </button>
              </div>
            </div>

            {/* Status Bar */}
            <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900 px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-mono text-gray-500">
                {activeDataTab === 'pin-boundary' 
                  ? `${pinBoundaryData.length} rows` 
                  : activeDataTab === 'feasibility'
                  ? `${requirementsData.length} specs`
                  : activeDataTab === 'simulation-plan'
                  ? `${simulationPlanData.length} rows`
                  : `${customSheets.length} sheets`}
              </span>
              
              {tablesModified && lastModifiedTime && (
                <div className="flex items-center gap-2 px-2 py-1 bg-green-900/20 border border-green-800 rounded">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-mono text-green-300">
                    Updated
                  </span>
                </div>
              )}
            </div>

            {/* Functions Help Note */}
            <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900/50 px-4 py-2.5">
              <details className="group">
                <summary className="cursor-pointer text-xs font-mono text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-2">
                  <svg 
                    className="w-3.5 h-3.5 text-red-500 transition-transform group-open:rotate-90" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="uppercase tracking-wider">Available Functions</span>
                </summary>
                <div className="mt-2 pl-5 text-xs font-mono text-gray-500 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-semibold min-w-[60px]">SUM()</span>
                    <span>Add numbers: =SUM(A1:A10)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-semibold min-w-[60px]">AVERAGE()</span>
                    <span>Calculate average</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-semibold min-w-[60px]">MIN()</span>
                    <span className="text-gray-500">/ </span>
                    <span className="text-red-400 font-semibold">MAX()</span>
                    <span>Find min/max values</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-semibold min-w-[60px]">COUNT()</span>
                    <span>Count cells with numbers</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 font-semibold min-w-[60px]">IF()</span>
                    <span>Conditional: =IF(A1&gt;5,"Yes","No")</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400 font-semibold min-w-[60px]">+, -, *, /</span>
                    <span>Basic math: =A1+B1*C1</span>
                  </div>
                </div>
              </details>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-hidden bg-gray-950">
              {isLoadingData ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                    <p className="text-sm font-mono text-gray-500 uppercase tracking-wider">
                      Loading data...
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {activeDataTab === 'pin-boundary' && (
                    <EditablePinBoundaryTable
                      initialData={pinBoundaryData}
                      onSave={handlePinBoundarySave}
                    />
                  )}

                  {activeDataTab === 'feasibility' && (
                    <EditableRequirementsTable
                      initialData={requirementsData}
                      onSave={handleRequirementsSave}
                    />
                  )}

                  {activeDataTab === 'simulation-plan' && (
                    <EditablePinBoundaryTable
                      initialData={simulationPlanData}
                      onSave={handleSimulationPlanSave}
                    />
                  )}

                  {activeDataTab === 'custom-sheets' && (
                    <CustomSheetsManager
                      sheets={customSheets}
                      onSheetsChange={setCustomSheets}
                      isExpanded={customSheetsExpanded}
                    />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Toggle Right Sidebar Button - When Hidden */}
      {!rightSidebarOpen && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-40">
          <button
            onClick={() => setRightSidebarOpen(true)}
            className="flex items-center gap-2 px-3 py-4 bg-gray-900 border border-gray-800 border-r-0 rounded-l-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors shadow-lg"
            title="Show data tables (Ctrl/Cmd + D)"
          >
            <ChevronLeft size={18} />
            <Database size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AppDashboard;