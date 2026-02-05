
import * as React from 'react';

interface MobileNavProps {
  isTheater: boolean;
  availableSources: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSidebarOpen: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({
  isTheater,
  availableSources,
  activeTab,
  onTabChange,
  onSidebarOpen
}) => {
  if (isTheater) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 h-20 bg-slate-950/95 border-t border-white/5 backdrop-blur-3xl flex items-center justify-around px-4 z-[55] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      {availableSources.slice(0, 4).map(source => (
        <button 
          key={source} 
          onClick={() => onTabChange(source)}
          className={`flex flex-col items-center space-y-1.5 p-2 transition-all relative ${activeTab === source ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <span className="text-[8px] font-black uppercase tracking-widest leading-none">{source.split(' ')[0]}</span>
        </button>
      ))}
      <button onClick={onSidebarOpen} className="flex flex-col items-center space-y-1 p-2 text-indigo-500 active:scale-90 transition-all">
        <div className="w-8 h-8 bg-indigo-600/10 rounded-lg flex items-center justify-center border border-indigo-500/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </div>
      </button>
    </nav>
  );
};

export default MobileNav;
