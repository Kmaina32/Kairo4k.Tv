
import React from 'react';
import BrandLogo from './BrandLogo';

interface HeaderProps {
  isTheater: boolean;
  sidebarOpen: boolean;
  onSidebarToggle: (val: boolean) => void;
}

const Header = ({
  isTheater,
  sidebarOpen,
  onSidebarToggle
}: HeaderProps) => {
  if (isTheater) return null;

  return (
    <header className="h-20 flex-shrink-0 flex items-center justify-between px-6 bg-[#020617] border-b border-white/5 z-[70] w-full">
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => onSidebarToggle(!sidebarOpen)}
          className="lg:hidden p-2 text-indigo-400 active:scale-90 transition-all"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        
        <BrandLogo size="md" />
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden md:block">
           <span className="text-[10px] font-black uppercase tracking-widest text-[#10b981] flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full shadow-[0_0_8px_#10b981]" />
            Uplink Active
          </span>
        </div>
        <button className="w-10 h-10 md:w-11 md:h-11 glass rounded-full border-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-all active:scale-95 overflow-hidden">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
