"use client"

import React, { useEffect, useState, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquarePlus, FileCode, Image as ImageIcon, ArrowUp, Loader2 } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function WelcomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState('User');
  const [chatInput, setChatInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-red-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex flex-col transition-colors">
      {/* Header */}
      <div className="w-full px-6 py-4 flex justify-between items-center">
        <Logo className="text-2xl" />
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogin}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium transition-colors"
          >
            Sign In
          </button>
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
                  placeholder="Describe your circuit design or paste a netlist..."
                  rows={1}
                  className="w-full px-4 py-3 pr-12 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none overflow-hidden max-h-[120px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="absolute right-3 bottom-3 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  title="Send message (Enter)"
                >
                  <ArrowUp size={18} />
                </button>
              </form>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  <FileCode size={16} />
                  <span>Attach Netlist</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
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