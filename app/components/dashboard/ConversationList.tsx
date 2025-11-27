"use client"

import React, { useEffect, useState } from 'react';
import { MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { getUserConversations, Conversation } from '@/utils/conversation';

interface ConversationListProps {
  activeConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ 
  activeConversationId, 
  onConversationSelect 
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getUserConversations();
      setConversations(data.conversations);
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Group conversations by date
  const groupedConversations = conversations.reduce((groups, conv) => {
    const date = formatDate(conv.created_at);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(conv);
    return groups;
  }, {} as Record<string, Conversation[]>);

  if (isLoading) {
    return (
      <div className="px-4 py-8 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
        </div>
        <button
          onClick={loadConversations}
          className="mt-2 w-full px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
          <MessageSquare size={24} className="text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No conversations yet
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Start a new chat to begin
        </p>
      </div>
    );
  }

  return (
    <div className="flex-grow overflow-y-auto scrollbar-none">
      {Object.entries(groupedConversations).map(([date, convs]) => (
        <div key={date} className="mt-4 px-4">
          <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
            {date}
          </h3>
          <div className="space-y-1">
            {convs.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onConversationSelect(conv.id)}
                className={`
                  w-full px-3 py-2 text-left text-sm rounded-md transition-colors
                  flex items-center gap-2 group
                  ${activeConversationId === conv.id
                    ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                <MessageSquare size={14} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">
                    {conv.name}
                  </div>
                  {conv.total_messages > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {conv.total_messages} message{conv.total_messages !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConversationList;