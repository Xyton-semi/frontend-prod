"use client"

import React, { useState, useRef, KeyboardEvent } from 'react';
import { Code, Image as ImageIcon, ArrowUp } from 'lucide-react';

interface ChatInputProps {
  onSubmit?: (message: string) => void;
  placeholder?: string;
}

/**
 * Chat input component for the analog design AI agent.
 * Simplified design matching Figma specifications.
 */
const ChatInput: React.FC<ChatInputProps> = ({ 
  onSubmit,
  placeholder = "Request any changes..." 
}) => {
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || isComposing) return;

    if (onSubmit) {
      onSubmit(input);
    } else {
      // TODO: Implement message sending logic
      console.log('Sending message:', input);
    }
    
    // Clear input after sending
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
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
      // TODO: Handle file upload
      console.log('File selected:', file.name);
      if (onSubmit) {
        onSubmit(`Uploaded: ${file.name}`);
      }
    }
  };

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0 transition-colors">
      <form onSubmit={handleSubmit} className="space-y-2">
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
            rows={1}
            className="w-full px-4 py-2.5 pr-12 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none overflow-hidden max-h-[100px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 bottom-2.5 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            title="Send message (Enter)"
          >
            <ArrowUp size={16} />
          </button>
        </div>

        {/* Attachment options */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleAttachNetlist}
            className="flex items-center px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <Code size={14} className="mr-1.5" />
            Netlist
          </button>
          <button
            type="button"
            onClick={handleAttachImage}
            className="flex items-center px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
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
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </form>
    </div>
  );
};

export default ChatInput;
