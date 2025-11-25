"use client"

import React, { useState, useRef, KeyboardEvent } from 'react';
import { 
  Code, 
  Image as ImageIcon, 
  SendHorizontal, // Swapped ArrowUp for a more modern 'Send' icon
  AlertCircle, 
  Loader2, 
  Paperclip 
} from 'lucide-react';
import { sendMessage } from '@/utils/api-client';

interface ChatInputProps {
  onSubmit?: (message: string) => void;
  placeholder?: string;
  conversationId?: string;
}

/**
 * NewChatInput
 * Redesigned chat interface for Xyton-Semi.
 * Features a modern, contained aesthetic with strong emphasis on the company red.
 */
const NewChatInput: React.FC<ChatInputProps> = ({ 
  onSubmit,
  placeholder = "Ask Xyton AI about your design...", // Slightly updated default placeholder
  conversationId = "5f66002a-6690-48ae-b184-716034f36855"
}) => {
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || isComposing || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // API Integration
      const response = await sendMessage(conversationId, input.trim());
      console.log('API Response:', response);
      
      if (onSubmit) {
        onSubmit(input);
      }
      
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      
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
    setError(null);
    
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`; // Increased max-height slightly
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name);
      if (onSubmit) {
        onSubmit(`[Attachment: ${file.name}]`); // Distinct format for attachments
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 flex-shrink-0">
      {/* Error Banner */}
      {error && (
        <div className="mb-3 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-bottom-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Input Container - "Card" Style */}
      <div 
        className={`
          relative flex flex-col gap-2 p-3 
          bg-white dark:bg-gray-800 
          border transition-all duration-200 ease-in-out
          rounded-2xl shadow-sm
          ${isComposing || input ? 'border-red-500 ring-1 ring-red-500/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}
        `}
      >
        
        {/* Text Area */}
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
          className="
            w-full px-2 py-1 min-h-[44px] max-h-[150px]
            bg-transparent border-none outline-none resize-none
            text-gray-900 dark:text-gray-100 placeholder-gray-400
            text-sm leading-relaxed
            scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-600
          "
        />

        {/* Action Bar (Attachments + Send) */}
        <div className="flex items-center justify-between px-1 pt-1">
          
          {/* Attachment Tools */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="
                group flex items-center gap-1.5 px-3 py-1.5 rounded-full
                text-xs font-medium text-gray-500 dark:text-gray-400
                hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400
                transition-colors
              "
              title="Upload Netlist (.sp, .cir, .net)"
            >
              <Code size={14} className="group-hover:scale-110 transition-transform" />
              <span>Netlist</span>
            </button>

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isLoading}
              className="
                group flex items-center gap-1.5 px-3 py-1.5 rounded-full
                text-xs font-medium text-gray-500 dark:text-gray-400
                hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400
                transition-colors
              "
              title="Upload Image"
            >
              <ImageIcon size={14} className="group-hover:scale-110 transition-transform" />
              <span>Image</span>
            </button>
          </div>

          {/* Send Button - Strong Xyton Red */}
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || isLoading}
            className={`
              flex items-center justify-center p-2.5 rounded-xl
              transition-all duration-200
              ${(!input.trim() || isLoading)
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg hover:shadow-red-500/20 active:scale-95'
              }
            `}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <SendHorizontal size={18} className={input.trim() ? "translate-x-0.5" : ""} />
            )}
          </button>
        </div>
      </div>

      {/* Hidden File Inputs */}
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
      
      {/* Footer Info (Optional) */}
      <div className="mt-2 text-center">
        <p className="text-[10px] text-gray-400 dark:text-gray-500">
          Xyton AI can make mistakes. Please verify generated netlists.
        </p>
      </div>
    </div>
  );
};

export default NewChatInput;