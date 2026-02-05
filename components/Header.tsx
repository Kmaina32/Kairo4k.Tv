// Standard React import to resolve JSX intrinsic elements namespace issues
import * as React from 'react';
import BrandLogo from './BrandLogo';

interface HeaderProps {
  isTheater: boolean;
  sidebarOpen: boolean;
  onSidebarToggle: (val: boolean) => void;
  title: string;
  isRefreshing: boolean;
  onRefresh: () => void;
}

// Use React wildcard import to fix JSX intrinsic elements missing from global namespace
const Header: React.FC<HeaderProps> = ({
  isTheater,
  sidebarOpen,
  onSidebarToggle,
  title,
  isRefreshing,
  onRefresh
}) => {
  return (
    <header className={`h-16 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-4 md:px-6 bg-slate-950/50 backdrop-blur-xl z-50 transition-all duration-500 ${isTheater ? 'opacity-0 h-0 pointer-events-none overflow-hidden' : ''}`}>
      <div className="flex items-center space-x-3 min-w-0">
        {!sidebarOpen && (
          <button 
            onClick={() => onSidebarToggle(true)} 
            className="p-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400 shadow-lg active:scale-95 transition-all lg:bg-indigo-600 lg:text-white lg:border-none"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        )}
        
        {/* Mobile: Show Logo | Desktop: Show Title */}
        <div className="block lg:hidden">
          <BrandLogo size="sm" />
        </div>
        <h2 className="hidden lg:block text-sm font-black uppercase tracking-tight truncate pr-4 text-slate-200">
          {title}
        </h2>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
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