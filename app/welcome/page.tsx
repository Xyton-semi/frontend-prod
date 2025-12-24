"use client"

import React, { useEffect, useState, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquarePlus, FileCode, Image as ImageIcon, ArrowUp, Loader2, MessageSquare, Clock, ChevronRight } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getAllConversations, type Conversation } from '@/utils/conversation-api';

export default function WelcomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState('User');
  const [chatInput, setChatInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Force dark mode
    document.documentElement.classList.add('dark');

    // Get user name from sessionStorage
    if (typeof window !== 'undefined') {
      const storedName = sessionStorage.getItem('userName') || 'User';
      const storedEmail = sessionStorage.getItem('userEmail') || '';
      
      // If we have a name that's not a UUID, use it
      if (storedName && !isUuid(storedName) && storedName !== 'User') {
        setUserName(storedName);
      } else if (storedEmail) {
        // Extract name from email
        const emailName = storedEmail.split('@')[0];
        const parts = emailName.split(/[._\-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1));
        setUserName(parts.join(' '));
      }
    }
  }, []);

  // Load recent conversations
  useEffect(() => {
    const loadRecentConversations = async () => {
      try {
        setIsLoadingConversations(true);
        const conversations = await getAllConversations();
        
        // Sort by created_at (newest first) and get the 3 most recent
        const sortedConversations = [...conversations].sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA; // Descending order (newest first)
        });
        
        const recent = sortedConversations.slice(0, 3);
        setRecentConversations(recent);
      } catch (error) {
        console.error('Error loading recent conversations:', error);
        // Don't show error to user on welcome page
      } finally {
        setIsLoadingConversations(false);
      }
    };

    loadRecentConversations();
  }, []);

  const isUuid = (s: string) => {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
  };

  const handleStartChat = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!chatInput.trim() || isComposing) return;
    
    // Store the initial message in sessionStorage
    sessionStorage.setItem('initialMessage', chatInput.trim());
    
    // Navigate to dashboard with URL parameter
    router.push('/?from=welcome');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleStartChat();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleLogin = () => {
    router.push('/login');
  };

  const handleConversationClick = (conversationId: string) => {
    // Store the conversation ID to open
    sessionStorage.setItem('openConversationId', conversationId);
    router.push('/');
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Unknown';
    }
  };

  const truncateName = (name: string, maxLength: number = 40): string => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
  };

  return (
    <div className="h-screen bg-black flex flex-col transition-colors overflow-hidden">
      {/* Header */}
      <div className="w-full px-6 py-4 flex justify-between items-center flex-shrink-0">
        <Logo className="text-2xl" />
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogin}
            className="text-sm text-gray-400 hover:text-gray-200 font-medium transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-12">
        <div className="max-w-3xl w-full mx-auto text-center space-y-8 pb-20">
          {/* Welcome Message */}
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-5xl sm:text-6xl font-bold text-white">
              Hello {userName}
            </h1>
            <p className="text-xl sm:text-2xl text-red-400 font-medium">
              Ready to design your next circuit?
            </p>
          </div>

          {/* Recent Conversations Section */}
          {!isLoadingConversations && recentConversations.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100">
              <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 p-6 transition-all hover:shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <MessageSquare size={20} className="text-red-600" />
                    Recent Conversations
                  </h3>
                  <button
                    onClick={() => router.push('/')}
                    className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors flex items-center gap-1"
                  >
                    View All
                    <ChevronRight size={16} />
                  </button>
                </div>
                
                <div className="space-y-2">
                  {recentConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => handleConversationClick(conversation.id)}
                      className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-700 border border-transparent hover:border-red-800 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <MessageSquare size={14} className="text-gray-500 group-hover:text-red-400 transition-colors" />
                            <h4 className="text-sm font-medium text-gray-100 truncate">
                              {truncateName(conversation.name)}
                            </h4>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>
                              {conversation.total_messages} {conversation.total_messages === 1 ? 'message' : 'messages'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {formatDate(conversation.created_at)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-400 group-hover:text-red-400 transition-colors flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat Input Card */}
          <div className="mt-12 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 p-6 space-y-4 transition-all hover:shadow-2xl">
              <p className="text-gray-400 text-sm text-left">
                Upload a sketch, describe your circuit, or paste a netlist
              </p>

              {/* Chat Input */}
              <form onSubmit={handleStartChat} className="relative">
                <textarea
                  ref={textareaRef}
                  value={chatInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onCompositionStart={() => setIsComposing(true)}
                  onCompositionEnd={() => setIsComposing(false)}
                  placeholder="Describe your circuit design or paste a netlist..."
                  rows={1}
                  className="w-full px-4 py-3 pr-12 text-sm border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none overflow-hidden max-h-[120px] bg-gray-700 text-gray-100 placeholder-gray-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="absolute right-3 bottom-3 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  title="Send message (Enter)"
                >
                  <ArrowUp size={18} />
                </button>
              </form>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors">
                  <FileCode size={16} />
                  <span>Attach Netlist</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors">
                  <ImageIcon size={16} />
                  <span>Attach Image</span>
                </button>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-950 text-red-400 mb-2">
                <MessageSquarePlus size={24} />
              </div>
              <h3 className="font-semibold text-white">AI-Powered Design</h3>
              <p className="text-sm text-gray-400">
                Conversational circuit design with intelligent assistance
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-950 text-red-400 mb-2">
                <FileCode size={24} />
              </div>
              <h3 className="font-semibold text-white">Real-time Simulation</h3>
              <p className="text-sm text-gray-400">
                Test and optimize your designs instantly
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-950 text-red-400 mb-2">
                <ImageIcon size={24} />
              </div>
              <h3 className="font-semibold text-white">Visual Design</h3>
              <p className="text-sm text-gray-400">
                From sketch to schematic seamlessly
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}