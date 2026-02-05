
// Fix: Use a more robust import pattern for React to ensure JSX intrinsic elements are recognized
import * as React from 'react';

interface HeaderProps {
  isTheater: boolean;
  sidebarOpen: boolean;
  onSidebarToggle: (val: boolean) => void;
  title: string;
  isRefreshing: boolean;
  onRefresh: () => void;
}

const Header: React.FC<HeaderProps> = ({
  isTheater,
  sidebarOpen,
  onSidebarToggle,
  title,
  isRefreshing,
  onRefresh
}) => {
  return (
    <header className={`h-16 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur-xl z-50 transition-all duration-500 ${isTheater ? 'opacity-0 h-0 pointer-events-none overflow-hidden' : ''}`}>
      <div className="flex items-center space-x-3 min-w-0">
        {!sidebarOpen && (
          <button onClick={() => onSidebarToggle(true)} className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg active:scale-95 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        )}
        <h2 className="text-sm font-black uppercase tracking-tight truncate pr-4">{title}</h2>
      </div>
      <div className="flex items-center space-x-4">
         {isRefreshing && (
           <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
         )}
        <button 
          onClick={onRefresh} 
          disabled={isRefreshing}
          className={`p-2 text-slate-500 hover:text-white transition-all active:rotate-180 duration-500 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
