interface HeaderProps {
  keywords: string;
  setKeywords: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  limit: number;
  setLimit: (v: number) => void;
  onSearch: () => void;
  loading: boolean;
}

export default function Header({
  keywords, setKeywords,
  location, setLocation,
  limit, setLimit,
  onSearch, loading
}: HeaderProps) {
  return (
    <header className="bg-white/90 backdrop-blur-xl z-20 p-4 sticky top-0 border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-center">

        {/* Brand Area */}
        <div className="flex items-center gap-3 select-none hover:scale-105 transition-transform duration-300">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center shadow-lg rotate-3">
            <span className="text-2xl">🧭</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            Scout<span className="text-orange-500">ling</span>
          </h1>
        </div>

        {/* Search Bar Container */}
        <div className="flex flex-1 gap-3 w-full bg-slate-50 p-2 rounded-2xl border border-slate-200 shadow-inner">
            {/* Keywords Input */}
            <div className="flex-1 relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors">🔍</span>
                <input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full pl-10 bg-white border-2 border-transparent focus:border-orange-200 p-2.5 rounded-xl text-slate-700 font-medium placeholder-slate-400 outline-none transition-all shadow-sm group-hover:border-slate-200"
                  placeholder="Job Title (e.g. Python)"
                />
            </div>

            {/* Location Input */}
            <div className="flex-1 relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors">📍</span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-10 bg-white border-2 border-transparent focus:border-orange-200 p-2.5 rounded-xl text-slate-700 font-medium placeholder-slate-400 outline-none transition-all shadow-sm group-hover:border-slate-200"
                  placeholder="Location"
                />
            </div>

            {/* Limit Input */}
            <div className="w-20 relative group">
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full bg-white border-2 border-transparent focus:border-orange-200 p-2.5 rounded-xl text-slate-700 font-bold text-center outline-none transition-all shadow-sm group-hover:border-slate-200"
                  title="Results Limit"
                />
            </div>

            {/* Search Button */}
            <button
              onClick={onSearch}
              disabled={loading}
              className="bg-orange-500 text-white px-8 rounded-xl font-bold hover:bg-orange-600 active:bg-orange-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-95 shadow-orange-200 shadow-lg border-b-4 border-orange-700 hover:border-orange-800 active:border-b-0 active:translate-y-1"
            >
              {loading ? '...' : 'Find'}
            </button>
        </div>
      </div>
    </header>
  );
}