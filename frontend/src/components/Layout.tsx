import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#FDFBF7] text-[#2D3748] overflow-hidden font-sans selection:bg-[#E6AA68] selection:text-white">
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