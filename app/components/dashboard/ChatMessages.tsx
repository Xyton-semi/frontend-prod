"use client";

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Copy, Check, User, Bot, Database } from 'lucide-react';

// Dynamically import ReactMarkdown to avoid SSR issues
const ReactMarkdown = dynamic(() => import('react-markdown'), {
  ssr: false,
  loading: () => <div className="text-gray-400">Loading...</div>
});

// Use dynamic import for syntax highlighter
const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then((mod) => mod.Prism),
  { ssr: false }
);

// Import the style
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

// Match the API's Message type exactly
interface Message {
  id: string;
  role?: 'user' | 'assistant'; // Optional to match API
  content: string;
  timestamp: Date | string;
  status?: 'sending' | 'processing' | 'complete' | 'error';
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

interface ParsedMessage {
  message: string;
  hasTableContext: boolean;
  contextInfo?: string;
}

/**
 * Extract the actual user message and detect if table context was included
 */
const parseUserMessage = (content: string): ParsedMessage => {
  const contextMarkers = [
    '\n\n[CURRENT PIN & BOUNDARY DATA]',
    '\n[CURRENT PIN & BOUNDARY DATA]',
  ];
  
  for (const marker of contextMarkers) {
    const index = content.indexOf(marker);
    if (index !== -1) {
      const actualMessage = content.substring(0, index).trim();
      
      // Count which data sections were included
      const sections: string[] = [];
      if (content.includes('[CURRENT PIN & BOUNDARY DATA]')) sections.push('Pin/Boundary');
      if (content.includes('[CURRENT REQUIREMENTS DATA]')) sections.push('Requirements');
      if (content.includes('[CURRENT SIMULATION PLAN DATA]')) sections.push('Simulation Plan');
      
      return {
        message: actualMessage,
        hasTableContext: true,
        contextInfo: sections.join(', ')
      };
    }
  }
  
  return {
    message: content,
    hasTableContext: false
  };
};

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isLoading = false }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const prevStatusRef = useRef<{ [key: string]: string }>({});
  const hasStreamedRef = useRef<{ [key: string]: boolean }>({});
  const [displayedContent, setDisplayedContent] = useState<{ [key: string]: string }>({});
  
  // Track if user has manually scrolled up
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect user scroll
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // If user scrolls up more than 100px from bottom, disable auto-scroll
      if (distanceFromBottom > 100) {
        setUserHasScrolled(true);
        
        // Clear any existing timeout
        if (autoScrollTimeoutRef.current) {
          clearTimeout(autoScrollTimeoutRef.current);
        }
      } else {
        // User is near bottom, re-enable auto-scroll
        setUserHasScrolled(false);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll only if user hasn't scrolled up
  useEffect(() => {
    if (!userHasScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, userHasScrolled]);

  // Streaming effect - only depends on messages
  useEffect(() => {
    messages.forEach((message) => {
      if (message.role !== 'assistant') return;

      const prevStatus = prevStatusRef.current[message.id];
      const justCompleted = prevStatus === 'processing' && message.status === 'complete';

      // Start streaming for newly completed messages
      if (justCompleted && !hasStreamedRef.current[message.id] && message.content.length > 0) {
        hasStreamedRef.current[message.id] = true;
        
        let charIndex = 0;
        const content = message.content;
        
        const streamInterval = setInterval(() => {
          charIndex += 3;
          
          if (charIndex >= content.length) {
            setDisplayedContent(prev => ({ ...prev, [message.id]: content }));
            clearInterval(streamInterval);
          } else {
            setDisplayedContent(prev => ({ 
              ...prev, 
              [message.id]: content.substring(0, charIndex) 
            }));
          }
        }, 10);

        return () => clearInterval(streamInterval);
      }

      // Update previous status
      prevStatusRef.current[message.id] = message.status || 'complete';

      // For already complete messages (loaded from history), show immediately
      if (message.status === 'complete' && message.content && !(message.id in displayedContent)) {
        setDisplayedContent(prev => {
          if (message.id in prev) return prev;
          return { ...prev, [message.id]: message.content };
        });
      }
    });
  }, [messages, displayedContent]);

  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Helper to format timestamp
  const formatTime = (timestamp: string | Date): string => {
    if (!timestamp) return '';
    
    try {
      let date: Date;

      if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        // It's a string: check if it's a Unix timestamp (digits only) or ISO string
        date = /^\d+$/.test(timestamp) 
          ? new Date(parseInt(timestamp)) 
          : new Date(timestamp);
      }

      // Validate date
      if (isNaN(date.getTime())) return '';

      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return '';
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-2xl">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-900/20 to-red-600/20 flex items-center justify-center">
            <Bot className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-mono font-bold text-gray-200 mb-3">
            Start a New Conversation
          </h2>
          <p className="text-gray-500 font-mono text-sm leading-relaxed">
            Ask questions about your circuit design, pin configurations, or requirements.
            I can help analyze your data, suggest optimizations, and answer technical questions.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 text-left">
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-red-800 transition-colors cursor-pointer">
              <p className="text-sm font-mono text-gray-400">
                💡 &quot;What are the voltage requirements for VIN?&quot;
              </p>
            </div>
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-red-800 transition-colors cursor-pointer">
              <p className="text-sm font-mono text-gray-400">
                💡 &quot;Analyze the dropout voltage specifications&quot;
              </p>
            </div>
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-red-800 transition-colors cursor-pointer">
              <p className="text-sm font-mono text-gray-400">
                💡 &quot;Suggest simulation test cases for my LDO&quot;
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
      {messages.map((message) => {
        // Handle optional role - default to 'user' if undefined
        const isUser = message.role === 'user' || !message.role;
        const currentContent = displayedContent[message.id] || message.content;
        const isStreaming = message.role === 'assistant' && 
                           message.status === 'processing' || 
                           (displayedContent[message.id] && 
                            displayedContent[message.id].length < message.content.length);
        
        // Parse user message to extract actual message and context info
        let displayContent: string;
        let hasTableContext = false;
        let contextInfo: string | undefined;

        if (isUser) {
          const parsed = parseUserMessage(message.content);
          displayContent = parsed.message;
          hasTableContext = parsed.hasTableContext;
          contextInfo = parsed.contextInfo;
        } else {
          displayContent = currentContent;
        }

        return (
          <div
            key={message.id}
            className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              isUser 
                ? 'bg-gradient-to-br from-red-600 to-red-700' 
                : 'bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600'
            }`}>
              {isUser ? (
                <User className="w-5 h-5 text-white" />
              ) : (
                <Bot className="w-5 h-5 text-gray-300" />
              )}
            </div>

            {/* Message Content */}
            <div className={`flex-1 max-w-3xl ${isUser ? 'text-right' : 'text-left'}`}>
              {/* Table Context Badge */}
              {isUser && hasTableContext && contextInfo && (
                <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/20 border border-blue-800">
                  <Database className="w-3 h-3 text-blue-400" />
                  <span className="text-xs font-mono text-blue-300">
                    Includes: {contextInfo}
                  </span>
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`inline-block px-5 py-4 rounded-2xl ${
                  isUser
                    ? 'bg-gradient-to-br from-red-600 to-red-700 text-white'
                    : 'bg-gray-900 border border-gray-800 text-gray-200'
                } ${hasTableContext ? 'clear-both' : ''}`}
              >
                {isUser ? (
                  // User messages: simple text display
                  <p className="text-sm font-mono whitespace-pre-wrap break-words">
                    {displayContent}
                  </p>
                ) : (
                  // Assistant messages: markdown rendering
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        code: (props: any) => {
                          const { inline, className, children } = props;
                          const match = /language-(\w+)/.exec(className || '');
                          const codeContent = String(children).replace(/\n$/, '');
                          
                          if (!inline && match) {
                            return (
                              <div className="relative group">
                                <button
                                  onClick={() => handleCopy(codeContent, message.id)}
                                  className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors opacity-0 group-hover:opacity-100"
                                  title="Copy code"
                                >
                                  {copiedId === message.id ? (
                                    <Check className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <Copy className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                                <SyntaxHighlighter
                                  style={vscDarkPlus}
                                  language={match[1]}
                                  PreTag="div"
                                >
                                  {codeContent}
                                </SyntaxHighlighter>
                              </div>
                            );
                          }
                          
                          return (
                            <code className="px-1.5 py-0.5 bg-gray-800 rounded text-red-400 font-mono text-xs">
                              {children}
                            </code>
                          );
                        },
                        p: (props: any) => (
                          <p className="mb-3 last:mb-0 text-sm font-mono leading-relaxed text-gray-300">
                            {props.children}
                          </p>
                        ),
                        ul: (props: any) => (
                          <ul className="list-disc list-inside space-y-1 mb-3 text-sm font-mono text-gray-300">
                            {props.children}
                          </ul>
                        ),
                        ol: (props: any) => (
                          <ol className="list-decimal list-inside space-y-1 mb-3 text-sm font-mono text-gray-300">
                            {props.children}
                          </ol>
                        ),
                        li: (props: any) => (
                          <li className="text-gray-300">{props.children}</li>
                        ),
                        h1: (props: any) => (
                          <h1 className="text-xl font-mono font-bold text-red-400 mb-3 mt-4">{props.children}</h1>
                        ),
                        h2: (props: any) => (
                          <h2 className="text-lg font-mono font-bold text-red-400 mb-2 mt-3">{props.children}</h2>
                        ),
                        h3: (props: any) => (
                          <h3 className="text-base font-mono font-semibold text-red-400 mb-2 mt-2">{props.children}</h3>
                        ),
                        blockquote: (props: any) => (
                          <blockquote className="border-l-4 border-red-600 pl-4 italic text-gray-400 my-3">
                            {props.children}
                          </blockquote>
                        ),
                        a: (props: any) => (
                          <a
                            href={props.href}
                            className="text-red-400 hover:text-red-300 underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {props.children}
                          </a>
                        ),
                        table: (props: any) => (
                          <div className="overflow-x-auto my-4">
                            <table className="min-w-full divide-y divide-gray-700 border border-gray-700">
                              {props.children}
                            </table>
                          </div>
                        ),
                        thead: (props: any) => (
                          <thead className="bg-gray-800">{props.children}</thead>
                        ),
                        tbody: (props: any) => (
                          <tbody className="divide-y divide-gray-700">{props.children}</tbody>
                        ),
                        tr: (props: any) => (
                          <tr className="hover:bg-gray-800/50">{props.children}</tr>
                        ),
                        th: (props: any) => (
                          <th className="px-4 py-2 text-left text-xs font-mono font-semibold text-gray-300 uppercase tracking-wider">
                            {props.children}
                          </th>
                        ),
                        td: (props: any) => (
                          <td className="px-4 py-2 text-sm font-mono text-gray-400">
                            {props.children}
                          </td>
                        ),
                      }}
                    >
                      {displayContent}
                    </ReactMarkdown>
                    {isStreaming && (
                      <span className="inline-block w-2 h-4 ml-1 bg-red-500 animate-pulse" />
                    )}
                  </div>
                )}
              </div>

              {/* Timestamp & Status */}
              <div className={`mt-2 flex items-center gap-2 text-xs font-mono text-gray-600 ${
                isUser ? 'justify-end' : 'justify-start'
              }`}>
                {message.timestamp && (
                  <span>{formatTime(message.timestamp)}</span>
                )}
                {message.status === 'sending' && (
                  <>
                    <span>•</span>
                    <span className="text-yellow-500">Sending...</span>
                  </>
                )}
                {message.status === 'processing' && (
                  <>
                    <span>•</span>
                    <span className="text-blue-500">Thinking...</span>
                  </>
                )}
                {message.status === 'error' && (
                  <>
                    <span>•</span>
                    <span className="text-red-500">Error</span>
                  </>
                )}
                {!isUser && message.status === 'complete' && !isStreaming && (
                  <button
                    onClick={() => handleCopy(message.content, message.id)}
                    className="flex items-center gap-1 hover:text-gray-400 transition-colors"
                    title="Copy message"
                  >
                    {copiedId === message.id ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-gray-300" />
          </div>
          <div className="flex-1 max-w-3xl">
            <div className="inline-block px-5 py-4 rounded-2xl bg-gray-900 border border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
            <div className="mt-2 text-xs font-mono text-gray-600">
              Analyzing your request with table context...
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;