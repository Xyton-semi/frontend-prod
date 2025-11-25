"use client"

import React from 'react';
import { useSearchParams } from 'next/navigation';
import AppDashboard from './components/dashboard/AppDashboard';

export default function Home() {
  const searchParams = useSearchParams();
  const fromWelcome = searchParams.get('from');

  // If not coming from welcome page, redirect
  if (fromWelcome !== 'welcome') {
    if (typeof window !== 'undefined') {
      window.location.href = '/welcome';
    }
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  // Show dashboard
  return <AppDashboard />;
}