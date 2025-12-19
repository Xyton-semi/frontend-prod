import React, { useState, useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';

export interface NewChatInputProps {
  onSubmit: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
}

const NewChatInput: React.FC<NewChatInputProps> = ({
  onSubmit,
  onStop,
  disabled = false,
  isLoading = false,
  placeholder = "Ask about your circuit design...",
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Add Escape key listener to stop response
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLoading && onStop) {
        e.preventDefault();
        onStop();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isLoading, onStop]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled && !isLoading) {
      onSubmit(message.trim());
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleStop = () => {
    if (onStop) {
      onStop();
    }
  };

  return (
    <div className="border-t border-gray-800 bg-gray-900 p-4">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="relative flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            rows={1}
            className="flex-1 px-4 py-3 bg-gray-800 text-gray-100 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] max-h-[200px] font-sans text-sm"
            style={{ overflow: 'hidden' }}
          />
          
          {isLoading ? (
            <button
              type="button"
              onClick={handleStop}
              disabled={!onStop}
              className="flex-shrink-0 p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              title="Stop generating (Escape)"
            >
              <Square className="w-5 h-5" fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={disabled || !message.trim()}
              className="flex-shrink-0 p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              title="Send message (Enter)"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-1 h-1 bg-red-500 rounded-full animate-pulse"></span>
                Generating response... Press Escape or click ⬛ to stop
              </span>
            ) : (
              'Press Enter to send, Shift+Enter for new line'
            )}
          </span>
          <span className="text-gray-600">
            {message.length} chars
          </span>
        </div>
      </form>
    </div>
  );
};

export default NewChatInput;