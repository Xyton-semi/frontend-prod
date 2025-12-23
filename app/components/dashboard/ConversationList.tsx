"use client"

import React from 'react';
import { MessageSquare, Clock } from 'lucide-react';
import type { Conversation } from '@/utils/conversation-api';

interface ConversationListProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  isLoading?: boolean;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  isLoading = false,
}) => {
  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
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
        day: 'numeric' 
      });
    } catch {
      return 'Unknown';
    }
  };

  /**
   * Truncate conversation name
   */
  const truncateName = (name: string, maxLength: number = 30): string => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
  };

  if (isLoading) {
    return (
      <div className="px-4 py-3 space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <MessageSquare 
          size={32} 
          className="mx-auto mb-2 text-gray-300 dark:text-gray-600" 
        />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No conversations yet
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Start a new chat to begin
        </p>
      </div>
    );
  }

  // Sort conversations by created_at (newest first)
  const sortedConversations = [...conversations].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA; // Descending order (newest first)
  });

  return (
    <div className="space-y-1 px-2">
      {sortedConversations.map((conversation) => {
        const isActive = conversation.id === currentConversationId;
        
        return (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`
              w-full text-left px-3 py-2.5 rounded-lg transition-all
              ${isActive 
                ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
              }
            `}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare 
                    size={14} 
                    className={isActive 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-gray-400 dark:text-gray-500'
                    } 
                  />
                  <h4 className={`
                    text-sm font-medium truncate
                    ${isActive 
                      ? 'text-red-900 dark:text-red-100' 
                      : 'text-gray-900 dark:text-gray-100'
                    }
                  `}>
                    {truncateName(conversation.name)}
                  </h4>
                </div>
                
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    {conversation.total_messages} {conversation.total_messages === 1 ? 'message' : 'messages'}
                  </span>
                  <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                    <Clock size={10} />
                    {formatDate(conversation.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ConversationList;