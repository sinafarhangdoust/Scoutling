interface HeaderProps {
  keywords?: string;
  setKeywords?: (v: string) => void;
  location?: string;
  setLocation?: (v: string) => void;
  onSearch?: () => void;
  loading?: boolean;
  showSearch?: boolean; // We might use this to hide search on Settings page
}

export default function Header({
  keywords, setKeywords,
  location, setLocation,
  onSearch, loading,
  showSearch = true
}: HeaderProps) {

  if (!showSearch) return null; // If no search needed, don't render header at all (cleaner look)

  return (
    <header className="bg-[#FDFBF7]/80 backdrop-blur-md z-20 p-5 sticky top-0 border-b-2 border-[#E6AA68]/20">
      <div className="max-w-7xl mx-auto w-full">
        {/* Search Bar Container - Full Width now since Logo is gone */}
        <div className="flex flex-col md:flex-row gap-3 w-full bg-white p-2 rounded-2xl border-2 border-[#2D3748]/10 shadow-sm focus-within:border-[#E6AA68]/50 focus-within:shadow-md transition-all">
            {/* Keywords Input */}
            <div className="flex-1 relative border-r border-gray-100">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E6AA68] text-lg">🔍</span>
                <input
                  value={keywords}
                  onChange={(e) => setKeywords?.(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearch?.()}
                  className="w-full pl-10 bg-transparent p-2.5 text-[#2D3748] font-bold placeholder-[#2D3748]/40 outline-none"
                  placeholder="Job Title (e.g. Python)"
                />
            </div>

            {/* Location Input */}
            <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E6AA68] text-lg">📍</span>
                <input
                  value={location}
                  onChange={(e) => setLocation?.(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearch?.()}
                  className="w-full pl-10 bg-transparent p-2.5 text-[#2D3748] font-bold placeholder-[#2D3748]/40 outline-none"
                  placeholder="Location"
                />
            </div>

            {/* Search Button */}
            <button
              onClick={onSearch}
              disabled={loading}
              className="bg-[#E6AA68] text-white px-8 rounded-xl font-bold hover:bg-[#d69045] active:bg-[#c07d3a] disabled:opacity-70 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              {loading ? '...' : 'Find'}
            </button>
        </div>
      </div>
    </header>
  );
}