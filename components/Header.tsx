import React from 'react';
import BrandLogo from './BrandLogo';

/**
 * Header component for the application top bar.
 * Streamlined height for better mobile and computer experience.
 */
interface HeaderProps {
  isTheater: boolean;
  sidebarOpen: boolean;
  onSidebarToggle: (val: boolean) => void;
  title: string;
  isRefreshing: boolean;
  onRefresh: () => void;
}

const Header = ({
  isTheater,
  sidebarOpen,
  onSidebarToggle,
  title,
  isRefreshing,
  onRefresh
}: HeaderProps) => {
  if (isTheater) return null;

  return (
    <header className="h-16 md:h-20 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-6 md:px-10 bg-slate-950/50 backdrop-blur-2xl z-[70] transition-all duration-300 shadow-md">
      <div className="flex items-center space-x-6 md:space-x-10 min-w-0">
        <BrandLogo size="md" />
        
        <div className="hidden md:flex items-center space-x-6 border-l border-white/10 pl-10 h-10">
          <div className="flex flex-col">
            <h2 className="text-sm md:text-base font-black uppercase tracking-tight truncate text-slate-200 italic leading-none mb-1">
              {title}
            </h2>
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse shadow-sm" />
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Node Secure</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3 md:space-x-5">
         {isRefreshing && (
           <div className="flex items-center space-x-2 px-4 py-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl animate-in fade-in">
             <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
             <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400">Syncing</span>
           </div>
         )}
        
        <button 
          onClick={onRefresh} 
          disabled={isRefreshing}
          className={`p-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all focus:outline-none active:scale-95 ${isRefreshing ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>
    </header>
  );
};

export default Header;