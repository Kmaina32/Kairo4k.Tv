
import React from 'react';

interface SidebarProps {
  activeView: 'live' | 'favorites' | 'account';
  onViewChange: (view: 'live' | 'favorites' | 'account') => void;
  isOpen: boolean;
}

const Sidebar = ({ activeView, onViewChange, isOpen }: SidebarProps) => {
  const navItems: { id: 'live' | 'favorites' | 'account'; label: string; icon: React.ReactNode }[] = [
    {
      id: 'live',
      label: 'Live Signals',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'favorites',
      label: 'Priority Profile',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    },
    {
      id: 'account',
      label: 'Terminal',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  return (
    <aside className={`
      fixed lg:relative inset-y-0 left-0 z-[60]
      w-[80px] h-full transition-all duration-300
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      bg-[#020617] border-r border-white/5 flex flex-col items-center py-8
    `}>
      <nav className="flex-1 space-y-8 w-full">
        {navItems.map((item) => (
          <div key={item.id} className="relative group flex justify-center">
            <button
              onClick={() => onViewChange(item.id)}
              className={`
                w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300
                ${activeView === item.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-600 hover:text-slate-200 hover:bg-white/5'}
              `}
            >
              {item.icon}
            </button>

            {/* Minimal Hover Tooltip */}
            <div className="absolute left-full ml-4 px-3 py-1 bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-white/10">
              {item.label}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto pb-4 opacity-10">
        <div className="w-1 h-1 bg-white rounded-full" />
      </div>
    </aside>
  );
};

export default Sidebar;
