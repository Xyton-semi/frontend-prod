"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PanelLeftClose, PlusSquare, MoreVertical, Pin, Trash2 } from 'lucide-react';
import Logo from '../ui/Logo'
import Avatar from '../ui/Avatar';
import ConversationList from './ConversationList';
import { getInitials } from '@/utils/auth';
import type { Conversation } from '@/utils/conversation-api';

// Utility function to format relative time
function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}


interface LeftSidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  conversations?: Conversation[];
  currentConversationId?: string | null;
  onSelectConversation?: (conversationId: string) => void;
  onNewConversation?: () => void;
  onDeleteConversation?: (conversationId: string) => void;
  onTogglePin?: (conversationId: string) => void;
  isLoadingConversations?: boolean;
  isDeleting?: boolean;
  isPinning?: boolean;
}

/**
 * LeftSidebar - Brutalist Design with delete and pin functionality
 * Dark theme with red accents, monospace fonts, smooth animations
 */
const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
  isOpen, 
  setIsOpen,
  conversations = [],
  currentConversationId = null,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onTogglePin,
  isLoadingConversations = false,
  isDeleting = false,
  isPinning = false,
}) => {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('User');
  const [userEmail, setUserEmail] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Get user info from sessionStorage
    const storedName = sessionStorage.getItem('userName') || 'User';
    const storedEmail = sessionStorage.getItem('userEmail') || '';
    setUserName(storedName);
    setUserEmail(storedEmail);
  }, []);

  const handleProfileClick = () => {
    router.push('/profile');
  };

  const isUuid = (s: string) => {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
  };

  const getDisplayName = () => {
    if (userName && !isUuid(userName) && userName !== 'User') return userName;
    if (userEmail) {
      const local = userEmail.split('@')[0];
      const parts = local.split(/[._\-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1));
      return parts.join(' ');
    }
    return 'User';
  };

  const handleSignOut = () => {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('idToken');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userEmail');
    setMenuOpen(false);
    router.push('/login');
  };

  const handleDelete = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Delete button clicked for:', conversationId);
    console.log('onDeleteConversation exists?', !!onDeleteConversation);
    console.log('onDeleteConversation function:', onDeleteConversation);
    
    if (confirm('Are you sure you want to delete this conversation?')) {
      console.log('User confirmed deletion, calling onDeleteConversation');
      if (onDeleteConversation) {
        onDeleteConversation(conversationId);
      } else {
        console.error('onDeleteConversation is not defined!');
      }
    }
  };

  const handleTogglePin = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Toggle pin clicked for:', conversationId);
    console.log('onTogglePin exists?', !!onTogglePin);
    console.log('onTogglePin function:', onTogglePin);
    
    if (onTogglePin) {
      onTogglePin(conversationId);
    } else {
      console.error('onTogglePin is not defined!');
    }
  };

  // Separate pinned and unpinned conversations
  const pinnedConversations = conversations.filter(c => c.is_pinned);
  const unpinnedConversations = conversations.filter(c => !c.is_pinned);

  // Filter conversations based on search
  const filterConversations = (convs: Conversation[]) => 
    convs.filter(conv => 
      conv.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredPinned = filterConversations(pinnedConversations);
  const filteredUnpinned = filterConversations(unpinnedConversations);

  return (
    <div 
      className={`
        ${isOpen ? 'w-64' : 'w-0'} 
        flex-shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col 
        transition-all duration-500 ease-in-out overflow-hidden relative
        ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
      `}
      style={{
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      }}
    >
      {/* Header - With collapse button */}
      <div className={`
        p-4 flex items-center justify-between flex-shrink-0 border-b border-gray-800
        transition-all duration-500 delay-100
        ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}>
        <div className="text-red-900 font-mono font-bold text-xl tracking-wider"></div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-300 hover:bg-gray-800 p-1.5 rounded transition-colors"
          title="Hide sidebar"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      {/* New Conversation Button */}
      <div className={`
        px-3 py-4 flex-shrink-0
        transition-all duration-500 delay-150
        ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}>
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-900 hover:bg-red-700 text-white text-sm font-mono rounded-sm transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <PlusSquare size={18} />
          <span>New Design</span>
        </button>
      </div>

      {/* Search Input */}
      <div className={`
        px-3 pb-3 flex-shrink-0
        transition-all duration-500 delay-200
        ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}>
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 pl-9 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-600 transition-colors font-mono"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Conversations Section */}
      <div className={`
        flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700
        transition-all duration-500 delay-250
        ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}>
        {/* Pinned Conversations */}
        {filteredPinned.length > 0 && (
          <div className="mb-4 animate-in fade-in slide-in-from-left duration-500">
            <div className="px-4 pb-2 pt-1">
              <div className="flex items-center justify-between font-mono">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                  <Pin size={12} className="text-red-600" />
                  Pinned
                </h3>
                <span className="text-xs text-gray-600">
                  {filteredPinned.length}
                </span>
              </div>
            </div>
            <div className="space-y-1 px-2 font-mono">
              {filteredPinned.map((conversation, index) => {
                const isActive = conversation.id === currentConversationId;
                
                return (
                  <div 
                    key={conversation.id} 
                    className="relative group animate-in fade-in slide-in-from-left duration-500"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <button
                      onClick={() => { console.log("Selecting conversation:", conversation.id, conversation.name); onSelectConversation?.(conversation.id); }}
                      className={`
                        w-full text-left px-3 py-2.5 rounded-lg transition-all duration-300 font-mono
                        ${isActive 
                          ? 'bg-red-950 border border-red-800 scale-105' 
                          : 'hover:bg-gray-700 border border-transparent hover:scale-102'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className={`
                            text-sm font-normal truncate
                            ${isActive 
                              ? 'text-red-100' 
                              : 'text-gray-100'
                            }
                          `}>
                            {conversation.name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                            <span>
                              {conversation.total_messages} msg{conversation.total_messages !== 1 ? 's' : ''}
                            </span>
                          <span>•</span>
                            <span>{getTimeAgo(conversation.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                    
                    {/* Action Icons - Show on hover */}
                    <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      {/* Pin/Unpin Button */}
                      <button
                        onClick={(e) => handleTogglePin(conversation.id, e)}
                        disabled={isPinning}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-all duration-200 hover:scale-110 disabled:opacity-50"
                        title={conversation.is_pinned ? "Unpin conversation" : "Pin conversation"}
                      >
                        <Pin size={14} className={conversation.is_pinned ? "fill-red-400 text-red-400" : ""} />
                      </button>
                      
                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDelete(conversation.id, e)}
                        disabled={isDeleting}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-all duration-200 hover:scale-110 disabled:opacity-50"
                        title="Delete conversation"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Regular Conversations */}
        {filteredUnpinned.length > 0 && (
          <div className="animate-in fade-in slide-in-from-left duration-500 delay-100">
            <div className="px-4 pb-2 pt-1">
              <div className="flex items-center justify-between font-mono">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Recent
                </h3>
                <span className="text-xs text-gray-600">
                  {filteredUnpinned.length}
                </span>
              </div>
            </div>
            <div className="space-y-1 px-2 font-mono">
              {filteredUnpinned.map((conversation, index) => {
                const isActive = conversation.id === currentConversationId;
                
                return (
                  <div 
                    key={conversation.id} 
                    className="relative group animate-in fade-in slide-in-from-left duration-500"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <button
                      onClick={() => { console.log("Selecting conversation:", conversation.id, conversation.name); onSelectConversation?.(conversation.id); }}
                      className={`
                        w-full text-left px-3 py-2.5 rounded-lg transition-all duration-300 font-mono
                        ${isActive 
                          ? 'bg-red-950 border border-red-800 scale-105' 
                          : 'hover:bg-gray-700 border border-transparent hover:scale-102'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className={`
                            text-sm font-normal truncate
                            ${isActive 
                              ? 'text-red-100' 
                              : 'text-gray-100'
                            }
                          `}>
                            {conversation.name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                            <span>
                              {conversation.total_messages} msg{conversation.total_messages !== 1 ? 's' : ''}
                            </span>
                          <span>•</span>
                            <span>{getTimeAgo(conversation.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                    
                    {/* Action Icons - Show on hover */}
                    <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      {/* Pin/Unpin Button */}
                      <button
                        onClick={(e) => handleTogglePin(conversation.id, e)}
                        disabled={isPinning}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-all duration-200 hover:scale-110 disabled:opacity-50"
                        title={conversation.is_pinned ? "Unpin conversation" : "Pin conversation"}
                      >
                        <Pin size={14} className={conversation.is_pinned ? "fill-red-400 text-red-400" : ""} />
                      </button>
                      
                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDelete(conversation.id, e)}
                        disabled={isDeleting}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-all duration-200 hover:scale-110 disabled:opacity-50"
                        title="Delete conversation"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredPinned.length === 0 && filteredUnpinned.length === 0 && !isLoadingConversations && (
          <div className="px-4 py-8 text-center animate-in fade-in duration-500">
            <p className="text-sm text-gray-400">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {searchQuery ? 'Try a different search' : 'Start a new chat to begin'}
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoadingConversations && (
          <div className="px-4 py-8 text-center animate-in fade-in duration-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto"></div>
            <p className="text-xs text-gray-500 mt-2">Loading...</p>
          </div>
        )}
      </div>

      {/* User Profile Section */}
      <div className={`
        p-4 border-t border-gray-800 flex items-center justify-between flex-shrink-0
        transition-all duration-500 delay-300
        ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}>
        <div className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer" onClick={handleProfileClick}>
          <Avatar src={undefined} alt={getDisplayName()} fallback={getInitials(getDisplayName())} />
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-100 leading-none truncate">{getDisplayName()}</p>
            <p className="text-xs text-gray-500 leading-none mt-1 truncate">{userEmail || 'Not logged in'}</p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(prev => !prev); }}
            aria-label="Open menu"
            className="p-1.5 rounded hover:bg-gray-800 transition-colors"
          >
            <MoreVertical size={18} className="text-gray-500" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-40 bg-gray-800 border border-gray-700 shadow-lg z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-200">
              <button 
                onClick={handleSignOut} 
                className="w-full text-left px-4 py-2 text-xs text-gray-200 hover:bg-gray-700 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;