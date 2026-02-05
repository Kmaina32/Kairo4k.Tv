
// Reverted to namespace React import to fix JSX intrinsic element resolution issues in this environment.
import * as React from 'react';

interface MobileNavProps {
  isTheater: boolean;
  activeView: 'live' | 'favorites' | 'account';
  onViewChange: (view: 'live' | 'favorites' | 'account') => void;
  onSidebarOpen: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({
  isTheater,
  activeView,
  onViewChange,
  onSidebarOpen
}) => {
  if (isTheater) return null;

  const navItems: { label: string, view: 'live' | 'favorites' | 'account', icon: React.ReactNode }[] = [
    {
      label: 'Live',
      view: 'live',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      label: 'Favorites',
      view: 'favorites',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      )
    },
    {
      label: 'Account',
      view: 'account',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 h-20 bg-slate-950/95 border-t border-white/5 backdrop-blur-3xl flex items-center justify-between px-6 z-[55] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="flex flex-1 items-center justify-around pr-4 border-r border-white/5">
        {navItems.map((item) => (
          <button 
            key={item.label} 
            onClick={() => onViewChange(item.view)}
            className={`flex flex-col items-center space-y-1 p-2 transition-all relative ${activeView === item.view ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {item.icon}
            <span className="text-[9px] font-black uppercase tracking-[0.15em] leading-none">{item.label}</span>
            {activeView === item.view && <div className="absolute -bottom-1 w-1 h-1 bg-indigo-500 rounded-full shadow-[0_0_10px_#6366f1]" />}
          </button>
        ))}
      </div>
      
      <button 
        onClick={onSidebarOpen} 
        className="flex flex-col items-center space-y-1 pl-6 p-2 text-indigo-500 active:scale-90 transition-all group"
      >
        <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-600/20 group-hover:border-indigo-500/40 transition-all shadow-lg shadow-indigo-500/5">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-indigo-400">Channels</span>
      </button>
    </nav>
  );
};

export default MobileNav;
