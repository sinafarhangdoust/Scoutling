interface HeaderProps {
  keywords?: string;
  setKeywords?: (v: string) => void;
  location?: string;
  setLocation?: (v: string) => void;
  onSearch?: () => void;
  loading?: boolean;
  showSearch?: boolean;
}

export default function Header({
  keywords, setKeywords,
  location, setLocation,
  onSearch, loading,
  showSearch = true
}: HeaderProps) {

  if (!showSearch) return null;

  return (
    <header className="bg-white dark:bg-brand-900 border-b border-brand-200 dark:border-brand-800 z-20 sticky top-0 px-6 py-4 shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-4 w-full items-center">
            
            <div className="flex-1 flex w-full md:w-auto bg-brand-50 dark:bg-brand-950/50 rounded-lg border border-brand-200 dark:border-brand-700 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all overflow-hidden">
                 {/* Keywords Input */}
                <div className="flex-1 relative border-r border-brand-200 dark:border-brand-700">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input
                        value={keywords}
                        onChange={(e) => setKeywords?.(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSearch?.()}
                        className="w-full pl-10 bg-transparent p-2.5 text-sm font-medium text-brand-900 dark:text-brand-50 placeholder-brand-400 outline-none"
                        placeholder="Search for roles (e.g. Software Engineer)"
                    />
                </div>

                {/* Location Input */}
                <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <input
                        value={location}
                        onChange={(e) => setLocation?.(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSearch?.()}
                        className="w-full pl-10 bg-transparent p-2.5 text-sm font-medium text-brand-900 dark:text-brand-50 placeholder-brand-400 outline-none"
                        placeholder="Location (e.g. Remote, NY)"
                    />
                </div>
            </div>

            {/* Search Button */}
            <button
              onClick={onSearch}
              disabled={loading}
              className={`
                px-6 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-brand-900
                ${loading 
                  ? 'bg-brand-400 cursor-wait' 
                  : 'bg-primary hover:bg-primary-hover active:translate-y-px'
                }
              `}
            >
              {loading ? 'Searching...' : 'Find Jobs'}
            </button>
        </div>
      </div>
    </header>
  );
}