"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PanelLeftClose, PlusSquare, MoreVertical, ChevronLeft } from 'lucide-react';
import Logo from '../ui/Logo'
import Avatar from '../ui/Avatar';
import ConversationList from './ConversationList';
import { getInitials } from '@/utils/auth';
import type { Conversation } from '@/utils/conversation-api';

interface LeftSidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  conversations?: Conversation[];
  currentConversationId?: string | null;
  onSelectConversation?: (conversationId: string) => void;
  onNewConversation?: () => void;
  isLoadingConversations?: boolean;
}

/**
 * LeftSidebar - Brutalist Design with Collapse Button
 * Dark theme with red accents, monospace fonts
 */
const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
  isOpen, 
  setIsOpen,
  conversations = [],
  currentConversationId = null,
  onSelectConversation,
  onNewConversation,
  isLoadingConversations = false,
}) => {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('User');
  const [userEmail, setUserEmail] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);

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

  return (
    <div className={`${isOpen ? 'w-64' : 'w-0'} flex-shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col transition-all duration-300 ease-in-out overflow-hidden relative`}>
      {/* Collapse Button - Visible when sidebar is open */}
      {isOpen && (
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-2 z-50 p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors"
          title="Collapse sidebar"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {/* Header */}
      <div className="p-4 flex items-center justify-between flex-shrink-0 border-b border-gray-800">
        <div className="text-red-900 font-mono font-bold text-xl tracking-wider">XYTON</div>
      </div>

      {/* New Conversation Button */}
      <div className="px-3 py-4 flex-shrink-0">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-900 hover:bg-red-700 text-white font-mono text-xs uppercase tracking-wider rounded-sm transition-colors"
        >
          <PlusSquare size={18} />
          <span>New Design</span>
        </button>
      </div>

      {/* Conversations Section */}
      <div className="flex-shrink-0 px-4 pb-3">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Conversations
          </h3>
          <span className="font-mono text-[10px] text-gray-600">
            {conversations.length}
          </span>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
        <ConversationList
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={onSelectConversation || (() => {})}
          isLoading={isLoadingConversations}
        />
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer" onClick={handleProfileClick}>
          <Avatar src={undefined} alt={getDisplayName()} fallback={getInitials(getDisplayName())} />
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="font-mono text-sm font-medium text-gray-100 leading-none truncate">{getDisplayName()}</p>
            <p className="font-mono text-[10px] text-gray-500 leading-none mt-1 truncate">{userEmail || 'Not logged in'}</p>
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
            <div className="absolute right-0 bottom-full mb-2 w-40 bg-gray-800 border border-gray-700 shadow-lg z-[9999]">
              <button 
                onClick={handleSignOut} 
                className="w-full text-left px-4 py-2 font-mono text-xs text-gray-200 hover:bg-gray-700 transition-colors uppercase tracking-wider"
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