
import React from 'react';
import { AppView } from '../types';

interface MobileNavProps {
  isTheater: boolean;
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  onSidebarOpen: () => void;
}

const MobileNav = ({
  isTheater,
  activeView,
  onViewChange,
  onSidebarOpen
}: MobileNavProps) => {
  if (isTheater) return null;

  const navItems: { view: 'live' | 'movies' | 'playlists' | 'favorites' | 'account', icon: React.ReactNode }[] = [
    {
      view: 'live',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      view: 'movies',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
      )
    },
    {
      view: 'playlists',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      view: 'favorites',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    },
    {
      view: 'account',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  return (
    <nav className="lg:hidden fixed bottom-4 inset-x-4 h-14 glass rounded-[24px] border-white/10 flex items-center justify-between px-5 z-[55] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)]">
      <div className="flex flex-1 items-center justify-around h-7 border-r border-white/10 pr-4">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => onViewChange(item.view)}
            className={`flex flex-col items-center justify-center transition-all relative ${activeView === item.view ? 'text-orange-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {item.icon}
            {activeView === item.view && (
              <div className="absolute -bottom-2 w-1 h-1 bg-orange-500 rounded-full shadow-[0_0_10px_white]" />
            )}
          </button>
        ))}
      </div>

      <button
        onClick={(e) => { e.preventDefault(); onSidebarOpen(); }}
        className="flex items-center justify-center pl-4 text-orange-500 active:scale-90 transition-all group"
      >
        <div className="w-9 h-9 bg-orange-600/10 border border-orange-500/20 rounded-xl flex items-center justify-center shadow-2xl group-hover:bg-orange-600/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
      </button>
    </nav>
  );
};

export default MobileNav;
