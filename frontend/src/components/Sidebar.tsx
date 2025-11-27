import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const { pathname } = useLocation();

  const navItems = [
    { name: 'Find Jobs', path: '/', icon: '🧭' },
    { name: 'AI Suggestions', path: '/suggestions', icon: '✨' },
    { name: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 bg-[#FDFBF7] border-r-2 border-[#E6AA68]/20 flex flex-col h-screen shrink-0 z-30">

      {/* Brand Logo Area */}
      <div className="p-6 flex items-center gap-3 select-none">
        <div className="w-10 h-10 bg-[#2D3748] rounded-full flex items-center justify-center shadow-lg border-2 border-[#E6AA68]">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#FDFBF7]" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-[#2D3748] tracking-tight">
          Scout<span className="text-[#E6AA68]">ling</span>
        </h1>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-200
                ${isActive 
                  ? 'bg-[#2D3748] text-white shadow-lg shadow-[#2D3748]/20 translate-x-1' 
                  : 'text-[#2D3748]/70 hover:bg-[#E6AA68]/10 hover:text-[#2D3748] hover:translate-x-1'
                }
              `}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Status */}
      <div className="p-6 border-t border-[#2D3748]/5">
        <div className="bg-[#E6AA68]/10 rounded-xl p-4 text-center">
          <p className="text-xs font-bold text-[#E6AA68] uppercase tracking-wider mb-1">Status</p>
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-[#2D3748]">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Agent Ready
          </div>
        </div>
      </div>
    </aside>
  );
}