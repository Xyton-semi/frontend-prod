"use client"

import React, { useState, useRef, KeyboardEvent } from 'react';
import { Code, Image as ImageIcon, ArrowUp, AlertCircle, Loader2 } from 'lucide-react';
import { sendMessageInConversation } from '@/utils/conversation-api';

interface ChatInputProps {
  onSubmit?: (message: string) => void;
  placeholder?: string;
  conversationId?: string;
}

/**
 * Chat input component for the analog design AI agent.
 */
const ChatInput: React.FC<ChatInputProps> = ({ 
  onSubmit,
  placeholder = "Request any changes...",
  conversationId = "5f66002a-6690-48ae-b184-716034f36855" // Default conversation ID
}) => {
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || isComposing || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Call the API using the correct function
      const response = await sendMessageInConversation(conversationId, input.trim());
      
      console.log('API Response:', response);
      
      // Call the parent onSubmit if provided
      if (onSubmit) {
        onSubmit(input);
      }
      
      // Clear input after successful send
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      // You could emit the response to a parent component here
      // or handle it in a global state management solution
      
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      
      // If authentication error, redirect to login
      if (err instanceof Error && err.message.includes('log in')) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setError(null); // Clear error when user starts typing
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  };

  const handleAttachNetlist = () => {
    fileInputRef.current?.click();
  };

  const handleAttachImage = () => {
    imageInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // TODO: Handle file upload to API
      console.log('File selected:', file.name);
      if (onSubmit) {
        onSubmit(`Uploaded: ${file.name}`);
      }
    }
  };

  return (
    <div className="p-4 border-t border-gray-700 bg-gray-800 flex-shrink-0 transition-colors">
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-950 border border-red-800 rounded-lg text-sm text-red-400">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main input area */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className="w-full px-4 py-2.5 pr-12 text-sm border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none overflow-hidden max-h-[100px] bg-gray-700 text-gray-100 placeholder-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2.5 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            title="Send message (Enter)"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowUp size={16} />
            )}
          </button>
        </div>

        {/* Attachment options */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleAttachNetlist}
            disabled={isLoading}
            className="flex items-center px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
          >
            <Code size={14} className="mr-1.5" />
            Netlist
          </button>
          <button
            type="button"
            onClick={handleAttachImage}
            disabled={isLoading}
            className="flex items-center px-2.5 py-1.5 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
          >
            <ImageIcon size={14} className="mr-1.5" />
            Image
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".sp,.cir,.net,.netlist"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLoading}
        />
      </form>
    </div>
  );
};

export default ChatInput;