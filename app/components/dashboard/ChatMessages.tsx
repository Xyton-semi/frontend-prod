"use client"

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Message } from '@/utils/conversation-api';

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

/**
 * StreamingMessage - Shows a single message with typing effect
 */
const StreamingMessage: React.FC<{ message: Message }> = ({ message }) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    // Only stream assistant messages that are complete and have content
    const shouldStream = 
      message.role === 'assistant' && 
      message.status === 'complete' && 
      message.content && 
      message.content.length > 0;

    if (!shouldStream) {
      // For user messages or incomplete messages, show immediately
      setDisplayedContent(message.content);
      return;
    }

    // Check if we've already streamed this message
    if (displayedContent === message.content) {
      return;
    }

    // Start streaming
    console.log('🎬 Starting stream for message:', message.id);
    setIsStreaming(true);
    indexRef.current = 0;

    const streamText = () => {
      if (indexRef.current < message.content.length) {
        // Reveal 1-3 characters at a time
        const chunkSize = Math.min(
          Math.floor(Math.random() * 3) + 1,
          message.content.length - indexRef.current
        );
        indexRef.current += chunkSize;
        
        const partial = message.content.substring(0, indexRef.current);
        setDisplayedContent(partial);
        
        // Schedule next chunk
        timerRef.current = setTimeout(streamText, 15);
      } else {
        // Streaming complete
        console.log('✨ Stream complete for:', message.id);
        setIsStreaming(false);
        setDisplayedContent(message.content);
      }
    };

    streamText();

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [message.content, message.role, message.status, message.id]);

  const isUser = message.role === 'user';
  const isProcessing = message.status === 'processing' || message.status === 'pending';
  const isError = message.status === 'error';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Message Bubble */}
      <div className={`max-w-[75%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div
          className={`
            inline-block px-4 py-3 rounded-2xl font-mono text-sm
            ${isUser
              ? 'bg-red-600 text-white rounded-tr-md shadow-lg'
              : 'bg-gray-800 text-gray-100 rounded-tl-md border border-gray-700'
            }
            ${isError ? 'border-2 border-red-500' : ''}
          `}
        >
          {/* Processing State */}
          {isProcessing && !isUser && !displayedContent && (
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-gray-400" />
              <span className="text-gray-400 text-xs uppercase tracking-wider">
                Processing...
              </span>
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="flex items-center gap-2 mb-2 text-red-400">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span className="text-xs uppercase tracking-wider">
                {message.error || 'Error'}
              </span>
            </div>
          )}

          {/* Message Text */}
          {displayedContent && (
            <div className="whitespace-pre-wrap break-words leading-relaxed">
              {displayedContent}
              {isStreaming && (
                <span className="inline-block w-1 h-4 bg-gray-300 ml-0.5 animate-pulse" />
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        {message.timestamp && (
          <div className={`
            text-[10px] font-mono text-gray-600 mt-1 px-2 uppercase tracking-wider
            ${isUser ? 'text-right' : 'text-left'}
          `}>
            {formatTime(message.timestamp)}
          </div>
        )}
      </div>
    </div>
  );
};

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

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isLoading = false }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <svg className="w-full h-full text-gray-700" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
              <path d="M30 45 L45 60 L70 35" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
            </svg>
          </div>
          <h3 className="text-xl font-mono font-bold text-gray-300 mb-2 tracking-wider">
            START A CONVERSATION
          </h3>
          <p className="text-sm font-mono text-gray-500">
            Send a message to begin your circuit design discussion
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto px-6 py-8 space-y-4"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#374151 #1f2937'
      }}
    >
      {messages.map((message) => (
        <StreamingMessage key={message.id} message={message} />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-start">
          <div className="inline-block bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-md px-4 py-3">
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-gray-400" />
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                AI Thinking...
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