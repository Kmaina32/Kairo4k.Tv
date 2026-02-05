// Changed React import to import * as React to ensure the JSX namespace and IntrinsicElements are correctly resolved.
import * as React from 'react';

interface MobileNavProps {
  isTheater: boolean;
  onSidebarOpen: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({
  isTheater,
  onSidebarOpen
}) => {
  if (isTheater) return null;

  const navItems = [
    {
      label: 'Live',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      active: true
    },
    {
      label: 'Favourites',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      active: false
    },
    {
      label: 'Account',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      active: false
    }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 h-20 bg-slate-950/95 border-t border-white/5 backdrop-blur-3xl flex items-center justify-between px-6 z-[55] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="flex flex-1 items-center justify-around pr-4 border-r border-white/5">
        {navItems.map((item) => (
          <button 
            key={item.label} 
            className={`flex flex-col items-center space-y-1 p-2 transition-all relative ${item.active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            {item.icon}
            <span className="text-[9px] font-black uppercase tracking-[0.15em] leading-none">{item.label}</span>
            {item.active && <div className="absolute -bottom-1 w-1 h-1 bg-indigo-500 rounded-full shadow-[0_0_10px_#6366f1]" />}
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
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-indigo-400">Node</span>
      </button>
    </nav>
  );
};

export default MobileNav;