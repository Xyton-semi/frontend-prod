"use client"

import React, { useState, useRef, KeyboardEvent } from 'react';
import { 
  Code, 
  Image as ImageIcon, 
  SendHorizontal,
  AlertCircle, 
  Loader2, 
} from 'lucide-react';

interface NewChatInputProps {
  onSubmit?: (message: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

/**
 * NewChatInput - Brutalist design chat input
 */
const NewChatInput: React.FC<NewChatInputProps> = ({ 
  onSubmit,
  placeholder = "ASK XYTON AI ABOUT YOUR DESIGN...",
  disabled = false,
  isLoading = false,
}) => {
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || isComposing || disabled || isLoading) return;

    setError(null);

    try {
      if (onSubmit) {
        await onSubmit(input.trim());
      }
      
      // Clear input after successful send
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name);
      // TODO: Implement file upload
      if (onSubmit) {
        onSubmit(`[Attachment: ${file.name}]`);
      }
    }
  };

  return (
    <div className="w-full p-4 flex-shrink-0 border-t border-gray-800">
      {/* Error Banner */}
      {error && (
        <div className="mb-3 flex items-center gap-2 p-3 bg-red-900/20 border border-red-800 text-xs font-mono text-red-400 uppercase tracking-wider">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Input Container */}
      <div 
        className={`
          relative flex items-center gap-3 px-4 py-3
          bg-gray-900 border border-gray-700
          transition-all duration-200
          ${isComposing || input ? 'border-red-600 shadow-lg shadow-red-900/20' : 'hover:border-gray-600'}
          ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        
        {/* Attachment Tools */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isLoading}
            className="
              p-2 text-gray-500 hover:text-red-500 hover:bg-red-900/10
              transition-colors rounded
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            title="Upload Netlist"
          >
            <Code size={18} />
          </button>

          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled || isLoading}
            className="
              p-2 text-gray-500 hover:text-red-500 hover:bg-red-900/10
              transition-colors rounded
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            title="Upload Image"
          >
            <ImageIcon size={18} />
          </button>
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className="
            flex-1 px-2 py-1 min-h-[40px] max-h-[150px]
            bg-transparent border-none outline-none resize-none
            text-gray-100 placeholder-gray-600
            font-mono text-sm leading-relaxed
            scrollbar-thin scrollbar-thumb-gray-700
            disabled:cursor-not-allowed
          "
        />

        {/* Send Button */}
        <button
          onClick={() => handleSubmit()}
          disabled={!input.trim() || disabled || isLoading}
          className={`
            flex items-center justify-center p-2.5 rounded-sm
            transition-all duration-200 font-mono text-xs uppercase tracking-wider
            ${(!input.trim() || disabled || isLoading)
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg hover:shadow-red-900/30'
            }
          `}
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <SendHorizontal size={18} />
          )}
        </button>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".sp,.cir,.net,.netlist"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isLoading}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isLoading}
      />
      
      {/* Footer Info */}
      <div className="mt-3 text-center">
        <p className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">
          Xyton AI
        </p>
      </div>
    </div>
  );
};

export default NewChatInput;