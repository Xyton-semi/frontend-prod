"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PanelLeftClose, PlusSquare, Search, MoreVertical, MessageSquare, LucideIcon } from 'lucide-react';
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
    <div className={`${isOpen ? 'w-64' : 'w-0'} flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col transition-all duration-300 ease-in-out overflow-visible`}>
      <div className="p-4 flex items-center justify-between flex-shrink-0">
        <Logo />
        <button onClick={() => setIsOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 lg:hidden">
          <PanelLeftClose size={20} />
        </button>
      </div>

      {/* New Conversation Button */}
      <div className="px-2 pb-3 flex-shrink-0">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium text-sm"
        >
          <PlusSquare size={18} />
          <span>New Design</span>
        </button>
      </div>

      {/* Conversations Section */}
      <div className="flex-shrink-0 px-4 pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Conversations
          </h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {conversations.length}
          </span>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-grow overflow-y-auto scrollbar-thin">
        <ConversationList
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={onSelectConversation || (() => {})}
          isLoading={isLoadingConversations}
        />
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 transition-colors">
        <div className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer" onClick={handleProfileClick}>
          <Avatar src={undefined} alt={getDisplayName()} fallback={getInitials(getDisplayName())} />
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-none truncate">{getDisplayName()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-none mt-1 truncate">{userEmail || 'Not logged in'}</p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(prev => !prev); }}
            aria-label="Open menu"
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <MoreVertical size={18} className="text-gray-500 dark:text-gray-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-2 w-40 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg z-[9999] transition-colors">
              <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">Sign out</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;