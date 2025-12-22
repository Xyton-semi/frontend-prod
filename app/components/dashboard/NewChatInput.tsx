import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Database, Paperclip, X, Image as ImageIcon, FileText } from 'lucide-react';
import { 
  processMultipleFileUploads, 
  validateFile, 
  formatFileSize, 
  getFileIcon,
  type FileAttachment 
} from '@/utils/file-upload';

export interface NewChatInputProps {
  onSubmit?: (message: string, attachments?: FileAttachment[]) => void | Promise<void>;
  onStop?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  includeTablesInContext?: boolean;
  onToggleTableContext?: () => void;
}

const NewChatInput: React.FC<NewChatInputProps> = ({
  onSubmit,
  onStop,
  disabled = false,
  isLoading = false,
  placeholder = "Ask about your circuit design...",
  includeTablesInContext = false,
  onToggleTableContext,
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadedAttachments, setUploadedAttachments] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate files
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      setUploadError(errors.join('\n'));
      setTimeout(() => setUploadError(null), 5000);
    }

    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!message.trim() && attachments.length === 0) || disabled || isLoading || isUploading) {
      return;
    }

    setUploadError(null);

    try {
      let fileAttachments: FileAttachment[] = [];

      // Upload files if there are any
      if (attachments.length > 0) {
        setIsUploading(true);
        
        // Upload files (conversation ID will be created by backend if new conversation)
        fileAttachments = await processMultipleFileUploads(attachments);
        setUploadedAttachments(fileAttachments);
        
        console.log('Files uploaded successfully:', fileAttachments.map(f => f.filename));
      }

      // Send message with attachments
      if (onSubmit) {
        await onSubmit(message.trim(), fileAttachments.length > 0 ? fileAttachments : undefined);
      }
      
      // Clear form
      setMessage('');
      setAttachments([]);
      setUploadedAttachments([]);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error submitting message with attachments:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload files');
    } finally {
      setIsUploading(false);
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
        {/* Error message */}
        {uploadError && (
          <div className="mb-2 p-2 bg-red-900/20 border border-red-800 rounded text-xs text-red-300 whitespace-pre-line">
            {uploadError}
          </div>
        )}

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
              >
                <span className="text-lg">{getFileIcon(file.type)}</span>
                <div className="flex flex-col min-w-0">
                  <span className="text-gray-200 text-xs truncate max-w-[200px]">
                    {file.name}
                  </span>
                  <span className="text-gray-500 text-[10px]">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(index)}
                  className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
                  title="Remove file"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading || isUploading}
            rows={1}
            className="flex-1 px-4 py-3 bg-black text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] max-h-[200px] font-sans text-sm"
            style={{ overflow: 'hidden' }}
          />

          {/* File attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isLoading || isUploading}
            className="flex-shrink-0 p-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            title="Attach files"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        
          {/* Submit/Stop button */}
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
              disabled={disabled || (!message.trim() && attachments.length === 0) || !onSubmit || isUploading}
              className="flex-shrink-0 p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              title="Send message (Enter)"
            >
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Table Context Toggle Button */}
          {onToggleTableContext && (
            <button
              type="button"
              onClick={onToggleTableContext}
              disabled={disabled || isUploading}
              className={`flex-shrink-0 p-3 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-red-500 relative ${
                includeTablesInContext
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-300'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={includeTablesInContext 
                ? 'Table context enabled - Click to disable' 
                : 'Table context disabled - Click to enable'}
            >
              <Database className="w-5 h-5" />
              {includeTablesInContext && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </button>
          )}
        </div>
        
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>
            {isUploading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-1 h-1 bg-blue-500 rounded-full animate-pulse"></span>
                Uploading files...
              </span>
            ) : isLoading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-1 h-1 bg-red-500 rounded-full animate-pulse"></span>
                Generating response... Press Escape or click Red Button to stop
              </span>
            ) : (
              'Press Paperclip to attach files, Enter to send, Shift+Enter for new line'
            )}
          </span>
          <div className="flex items-center gap-3">
            {attachments.length > 0 && (
              <span className="text-blue-400">
                {attachments.length} file{attachments.length > 1 ? 's' : ''} attached
              </span>
            )}
            <span className="text-gray-600">
              {message.length} chars
            </span>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.csv,.xlsx,.xls,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </form>
    </div>
  );
};

export default NewChatInput;