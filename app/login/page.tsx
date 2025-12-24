"use client"

import React, { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from '../register/RegisterForm';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="min-h-screen bg-black transition-colors">
      {/* Main Content */}
      <div className="py-12 px-4">
        <div className="w-full max-w-md mx-auto">
          {/* Centered Large XYTON Logo */}
          <div className="text-center mb-8">
            <div className="text-red-800 font-mono font-bold text-5xl tracking-widest">
              XYTON
            </div>
          </div>
          {/* Tab Navigation */}
          <div className="bg-gray-800 rounded-t-lg border-b border-gray-700 flex">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2.5 px-4 rounded-tl-lg text-sm font-medium transition-colors ${
                activeTab === 'login'
                  ? 'text-red-600 border-b-2 border-red-600 bg-red-950'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-2.5 px-4 rounded-tr-lg text-sm font-medium transition-colors ${
                activeTab === 'register'
                  ? 'text-red-600 border-b-2 border-red-600 bg-red-950'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-gray-800 rounded-b-lg shadow-lg border border-gray-700 border-t-0">
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