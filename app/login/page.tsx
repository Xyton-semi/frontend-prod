"use client"

import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from '../register/RegisterForm';
import Logo from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
      {/* Header */}
      {/* <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex justify-between items-center">
        <Logo />
        <ThemeToggle />
      </div> */}

      {/* Main Content */}
      <div className="py-8 px-4">
        <div className="w-full max-w-md mx-auto">
          {/* Tab Navigation */}
          <div className="bg-white dark:bg-gray-800 rounded-t-lg border-b border-gray-200 dark:border-gray-700 flex">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2.5 px-4 rounded-tl-lg text-sm font-medium transition-colors ${
                activeTab === 'login'
                  ? 'text-red-600 border-b-2 border-red-600 bg-red-50 dark:bg-red-950'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-2.5 px-4 rounded-tr-lg text-sm font-medium transition-colors ${
                activeTab === 'register'
                  ? 'text-red-600 border-b-2 border-red-600 bg-red-50 dark:bg-red-950'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow-lg border border-gray-200 dark:border-gray-700 border-t-0">
            {activeTab === 'login' ? (
              <LoginForm onSwitchToRegister={() => setActiveTab('register')} />
            ) : (
              <RegisterForm onSwitchToLogin={() => setActiveTab('login')} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}