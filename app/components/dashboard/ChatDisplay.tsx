"use client"

import React, { useEffect, useRef } from 'react';
import { User, Bot, Loader2, AlertCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  status?: 'sending' | 'processing' | 'complete' | 'error';
}

interface ChatDisplayProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

/**
 * Chat Display Component
 * Shows conversation history with user and assistant messages
 */
const ChatDisplay: React.FC<ChatDisplayProps> = ({ messages, isLoading = false }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-950 mb-4">
            <Bot size={32} className="text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Start a Conversation
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ask me anything about analog circuit design, or upload a netlist to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex gap-3 ${
            message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          {/* Avatar */}
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.role === 'user'
                ? 'bg-red-100 dark:bg-red-950'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}
          >
            {message.role === 'user' ? (
              <User size={18} className="text-red-600 dark:text-red-400" />
            ) : (
              <Bot size={18} className="text-gray-600 dark:text-gray-400" />
            )}
          </div>

          {/* Message Content */}
          <div
            className={`flex-1 max-w-[70%] ${
              message.role === 'user' ? 'text-right' : 'text-left'
            }`}
          >
            {/* Message Bubble */}
            <div
              className={`inline-block px-4 py-2 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-red-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Loading state */}
              {(message.status === 'sending' || message.status === 'processing') && (
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-sm">
                    {message.status === 'sending' ? 'Sending...' : 'Processing...'}
                  </span>
                </div>
              )}

              {/* Error state */}
              {message.status === 'error' && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle size={14} />
                  <span className="text-sm">Failed to send</span>
                </div>
              )}

              {/* Message content */}
              {(!message.status || message.status === 'complete') && (
                <div className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              )}
            </div>

            {/* Timestamp */}
            <div
              className={`mt-1 text-xs text-gray-400 dark:text-gray-500 ${
                message.role === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              {formatTimestamp(message.timestamp)}
            </div>
          </div>
        </div>
      ))}

      {/* Loading indicator for new assistant message */}
      {isLoading && (
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Bot size={18} className="text-gray-600 dark:text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="inline-block px-4 py-2 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Thinking...
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatDisplay;