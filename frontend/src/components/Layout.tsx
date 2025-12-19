import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-brand-50 dark:bg-brand-950 text-brand-900 dark:text-brand-50 overflow-hidden font-sans transition-colors duration-300">
      <Sidebar />
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div 
          key={location.pathname} 
          className="flex-1 flex flex-col h-full overflow-hidden animate-fade-in-up"
        >
          {children}
        </div>
      </main>
    </div>
  );
}