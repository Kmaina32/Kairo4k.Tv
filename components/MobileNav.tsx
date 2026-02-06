
import React from 'react';

interface MobileNavProps {
  isTheater: boolean;
  activeView: 'live' | 'favorites' | 'account';
  onViewChange: (view: 'live' | 'favorites' | 'account') => void;
  onSidebarOpen: () => void;
}

const MobileNav = ({
  isTheater,
  activeView,
  onViewChange,
  onSidebarOpen
}: MobileNavProps) => {
  if (isTheater) return null;

  const navItems: { view: 'live' | 'favorites' | 'account', icon: React.ReactNode }[] = [
    {
      view: 'live',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      view: 'favorites',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    },
    {
      view: 'account',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  return (
    <nav className="lg:hidden fixed bottom-6 inset-x-6 h-20 glass rounded-[40px] border-white/10 flex items-center justify-between px-8 z-[55] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]">
      <div className="flex flex-1 items-center justify-around h-10 border-r border-white/10 pr-4">
        {navItems.map((item) => (
          <button 
            key={item.view} 
            onClick={() => onViewChange(item.view)}
            className={`flex flex-col items-center justify-center p-3 transition-all relative ${activeView === item.view ? 'text-indigo-400 scale-125' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {item.icon}
            {activeView === item.view && (
              <div className="absolute -bottom-4 w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_15px_#6366f1]" />
            )}
          </button>
        ))}
      </div>
      
      <button 
        onClick={(e) => { e.preventDefault(); onSidebarOpen(); }} 
        className="flex items-center justify-center pl-6 text-indigo-500 active:scale-90 transition-all group"
      >
        <div className="w-14 h-14 bg-indigo-600/10 border border-indigo-500/20 rounded-[30px] flex items-center justify-center shadow-2xl group-hover:bg-indigo-600/20">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
      </button>
    </nav>
  );
};

export default MobileNav;
