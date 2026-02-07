import React from 'react';

type HeaderProps = {
  onMenuClick: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
};

const Header = ({ onMenuClick, searchTerm, setSearchTerm }: HeaderProps) => {
  return (
    <header className="flex-shrink-0 h-20 flex items-center justify-between px-6 bg-transparent z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      <div className="relative">
        <input
          type="text"
          placeholder="Scan for signals..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </header>
  );
};

export default Header;