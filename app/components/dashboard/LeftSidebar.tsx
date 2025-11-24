"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PanelLeftClose, PlusSquare, Search, MoreVertical, LucideIcon } from 'lucide-react';
import Logo from '../ui/Logo'
import Avatar from '../ui/Avatar';
import { getInitials } from '@/utils/jwt';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  hasShortcut?: boolean;
  shortcutStr?: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active = false, hasShortcut = false, shortcutStr = "" }) => (
  <div className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${active ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
    <div className="flex items-center space-x-3">
      {Icon && <Icon size={18} strokeWidth={2} />}
      <span className="text-sm font-medium">{label}</span>
    </div>
    {hasShortcut && (
      <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 px-1.5 py-0.5 rounded hidden group-hover:block">
        {shortcutStr}
      </span>
    )}
  </div>
);

interface FileHistorySectionProps {
  title: string;
  files: string[];
}

const FileHistorySection: React.FC<FileHistorySectionProps> = ({ title, files }) => (
  <div className="mt-8 px-4">
    <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">{title}</h3>
    <div className="space-y-1">
      {files.map((file, index) => (
        <div key={index} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer truncate transition-colors">
          {file}
        </div>
      ))}
    </div>
  </div>
);

interface LeftSidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ isOpen, setIsOpen }) => {
  const router = useRouter();
  const [userName, setUserName] = useState<string>('User');
  const [userEmail, setUserEmail] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Get user info from localStorage
    const storedName = localStorage.getItem('userName') || 'User';
    const storedEmail = localStorage.getItem('userEmail') || '';
    setUserName(storedName);
    setUserEmail(storedEmail);
  }, []);

  const handleProfileClick = () => {
    router.push('/login');
  };

  const isUuid = (s: string) => {
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
  };

  const getDisplayName = () => {
    if (userName && !isUuid(userName) && userName !== 'User') return userName;
    if (userEmail) {
      const local = userEmail.split('@')[0];
      // turn into friendly name: replace dots/underscores, capitalize words
      const parts = local.split(/[._\-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1));
      return parts.join(' ');
    }
    return 'User';
  };

  const handleSignOut = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('idToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
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

      <div className="px-2 space-y-1 flex-shrink-0">
        <SidebarItem icon={PlusSquare} label="New Design" />
        <div className="relative">
          <SidebarItem icon={Search} label="Search" hasShortcut={true} shortcutStr="⌘+S" />
          <span className="absolute top-1.5 right-3 bg-red-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
            +5
          </span>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto scrollbar-none">
        <FileHistorySection title="Today" files={['Amplifier_Design_01', 'LowPower_Filter_Prototype']} />
        <FileHistorySection title="Past 7 days" files={['Oscillator_TB_Simulation', 'HighGain_Preamp_V2', 'SignalChain_Optimizer']} />
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 transition-colors">
        <div className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer" onClick={() => router.push('/profile') }>
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
            <div className="absolute right-0 bottom-full mt-2 w-40 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg z-[9999] transition-colors">
              <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">Sign out</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;