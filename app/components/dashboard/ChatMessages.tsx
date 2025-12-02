"use client"

import React, { useEffect, useRef } from 'react';
import { Loader2, AlertCircle, User, Bot } from 'lucide-react';
import type { Message } from '@/utils/conversation-api';

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isLoading = false }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Format timestamp
   */
  const formatTime = (timestamp: string): string => {
    try {
      const date = new Date(parseInt(timestamp));
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return '';
    }
  };

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Bot size={32} className="text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Start a Conversation
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Send a message to begin your circuit design discussion
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin"
    >
      {messages.map((message) => {
        const isUser = message.role === 'user';
        const isProcessing = message.status === 'processing' || message.status === 'pending';
        const isError = message.status === 'error';

        return (
          <div
            key={message.id}
            className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`
              flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
              ${isUser 
                ? 'bg-red-100 dark:bg-red-950' 
                : 'bg-gray-100 dark:bg-gray-800'
              }
            `}>
              {isUser ? (
                <User size={16} className="text-red-600 dark:text-red-400" />
              ) : (
                <Bot size={16} className="text-gray-600 dark:text-gray-400" />
              )}
            </div>

            {/* Message Content */}
            <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
              <div
                className={`
                  rounded-2xl px-4 py-3 
                  ${isUser
                    ? 'bg-red-600 text-white rounded-tr-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm'
                  }
                  ${isError ? 'border border-red-300 dark:border-red-700' : ''}
                `}
              >
                {/* Processing State */}
                {isProcessing && !isUser && (
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Thinking...
                    </span>
                  </div>
                )}

                {/* Error State */}
                {isError && (
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                    <span className="text-sm text-red-600 dark:text-red-400">
                      {message.error || 'Failed to get response'}
                    </span>
                  </div>
                )}

                {/* Message Text */}
                {message.content && (
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              {message.timestamp && (
                <div className={`
                  text-xs text-gray-400 dark:text-gray-500 mt-1 px-1
                  ${isUser ? 'text-right' : 'text-left'}
                `}>
                  {formatTime(message.timestamp)}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Bot size={16} className="text-gray-600 dark:text-gray-400" />
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3">
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-gray-600 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Processing...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;