"use client"

import React, { useEffect, useState, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquarePlus, FileCode, Image as ImageIcon, ArrowUp, Loader2 } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function WelcomePageFixed() {
  const router = useRouter();
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Check authentication on mount AND when storage changes
    const checkAuth = () => {
      if (typeof window === 'undefined') return;
      
      const storedEmail = sessionStorage.getItem('userEmail');
      const storedName = sessionStorage.getItem('userName');
      
      // console.log('🔍 Checking auth on welcome page:');
      // console.log('Email:', storedEmail);
      // console.log('Name:', storedName);
      
      if (storedEmail && storedEmail.trim().length > 0) {
        setIsAuthenticated(true);
        setUserEmail(storedEmail);
        
        if (storedName && storedName !== 'User') {
          setUserName(storedName);
        } else {
          // Extract name from email
          const emailName = storedEmail.split('@')[0];
          const parts = emailName.split(/[._\-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1));
          setUserName(parts.join(' '));
        }
        
        console.log('✅ User authenticated:', storedEmail);
      } else {
        setIsAuthenticated(false);
        setUserName('User');
        console.log('❌ Not authenticated');
      }
    };

    // Check on mount
    checkAuth();

    // Also check when storage changes (in case user logs in in another tab)
    window.addEventListener('storage', checkAuth);
    
    // Check every second for 5 seconds (in case page loaded before login completed)
    const intervals = [
      setTimeout(checkAuth, 500),
      setTimeout(checkAuth, 1000),
      setTimeout(checkAuth, 2000),
      setTimeout(checkAuth, 3000),
    ];

    return () => {
      window.removeEventListener('storage', checkAuth);
      intervals.forEach(clearTimeout);
    };
  }, []);

  const handleStartChat = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!chatInput.trim() || isComposing || isLoading) return;

    // Check authentication
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      // Import conversation utilities dynamically
      const { createNewConversation } = await import('@/utils/conversation');
      
      // Create new conversation with initial message
      const result = await createNewConversation(chatInput.trim());
      
      // Store conversation ID for dashboard
      sessionStorage.setItem('activeConversationId', result.conversation_id);
      sessionStorage.setItem('initialQuery', chatInput.trim());
      
      // Navigate to dashboard
      router.push('/?from=welcome');
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to start conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleStartChat();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChatInput(e.target.value);
    setError(null);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex flex-col transition-colors">
      {/* Header */}
      <div className="w-full px-6 py-4 flex justify-between items-center">
        <Logo className="text-2xl" />
        <div className="flex items-center gap-4">
          {!isAuthenticated ? (
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </button>
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {userEmail}
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Welcome Message */}
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-white">
              Hello {userName}
            </h1>
            <p className="text-xl sm:text-2xl text-red-600 dark:text-red-400 font-medium">
              Ready to design your next circuit?
            </p>
          </div>

          {/* Warning Banner (if not authenticated) */}
          {!isAuthenticated && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-400 dark:bg-yellow-600 flex items-center justify-center mt-0.5">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Please sign in to start a conversation
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      You need to be authenticated to use the AI assistant.
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/login')}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            </div>
          )}

          {/* Chat Input Card */}
          <div className="mt-12 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4 transition-all hover:shadow-2xl">
              <p className="text-gray-600 dark:text-gray-400 text-sm text-left">
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
                  placeholder={isAuthenticated ? "Describe your circuit design or paste a netlist..." : "Please sign in to start..."}
                  disabled={isLoading || !isAuthenticated}
                  rows={1}
                  className="w-full px-4 py-3 pr-12 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none overflow-hidden max-h-[120px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isLoading || !isAuthenticated}
                  className="absolute right-3 bottom-3 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  title="Send message (Enter)"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <ArrowUp size={18} />
                  )}
                </button>
              </form>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <button 
                  disabled={isLoading || !isAuthenticated}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileCode size={16} />
                  <span>Attach Netlist</span>
                </button>
                <button 
                  disabled={isLoading || !isAuthenticated}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ImageIcon size={16} />
                  <span>Attach Image</span>
                </button>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 mb-2">
                <MessageSquarePlus size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">AI-Powered Design</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Conversational circuit design with intelligent assistance
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 mb-2">
                <FileCode size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Real-time Simulation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Test and optimize your designs instantly
              </p>
            </div>

            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 mb-2">
                <ImageIcon size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Visual Design</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                From sketch to schematic seamlessly
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}