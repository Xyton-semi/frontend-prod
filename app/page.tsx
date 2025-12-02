"use client"

import React, { useEffect, useState } from 'react';
import AppDashboard from './components/dashboard/AppDashboard';

export default function Home() {
  const [shouldShow, setShouldShow] = useState<'loading' | 'dashboard' | 'redirect'>('loading');

  useEffect(() => {
    // Check URL parameter on client side
    const params = new URLSearchParams(window.location.search);
    const fromWelcome = params.get('from');
    
    if (fromWelcome === 'welcome') {
      // Show dashboard
      setShouldShow('dashboard');
    } else {
      // Redirect to welcome
      setShouldShow('redirect');
      window.location.href = '/welcome';
    }
  }, []);

  if (shouldShow === 'loading' || shouldShow === 'redirect') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return <AppDashboard />;
}