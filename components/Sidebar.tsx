import React from 'react';
import { Channel } from '../types';

interface SidebarProps {
  isOpen: boolean;
  isTheater: boolean;
  activeView: 'live' | 'favorites' | 'account';
  onViewChange: (view: 'live' | 'favorites' | 'account') => void;
  onHubClick: () => void;
  availableSources: string[];
  activeTab: string | null;
  onSourceSelect: (sourceName: string) => void;
  onClose: () => void;
  channels: Channel[];
  onChannelSelect: (channel: Channel) => void;
}

const Sidebar = ({
  isOpen,
  isTheater,
  activeView,
  onViewChange,
  onHubClick,
  availableSources,
  activeTab,
  onSourceSelect,
  onClose,
  channels,
  onChannelSelect
}: SidebarProps) => {
  const [localSearch, setLocalSearch] = React.useState('');
  
  if (isTheater) return null;

  const navItems: { id: 'live' | 'favorites' | 'account', icon: React.ReactNode, label: string }[] = [
    {
      id: 'live',
      label: 'Live Signals',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
    },
    {
      id: 'favorites',
      label: 'Priority Saves',
      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
    },
    {
        id: 'account',
        label: 'Operator',
        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    }
  ];

  const filteredInSide = React.useMemo(() => {
    if (!activeTab) return [];
    return channels
      .filter(c => c.source === activeTab)
      .filter(c => c.name.toLowerCase().includes(localSearch.toLowerCase()))
      .slice(0, 100);
  }, [channels, activeTab, localSearch]);

  const sidebarClasses = `
    fixed lg:relative inset-y-0 left-0 z-[100] lg:z-[60]
    flex flex-col w-[300px] lg:w-[80px] border-r border-white/5 
    bg-slate-950/98 lg:bg-slate-950/80 backdrop-blur-3xl 
    transition-transform duration-300 transform
    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
  `;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md lg:hidden z-[90]" onClick={onClose} />
      )}

      <aside className={sidebarClasses}>
        <div className="flex flex-col h-full py-6 lg:py-10 items-center overflow-hidden">
          
          <button 
            onClick={() => { onHubClick(); onClose(); }}
            className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-md border border-indigo-500/20 mb-8"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          {/* VIEW SWITCHERS */}
          <div className="flex flex-col items-center space-y-4 lg:space-y-6 w-full px-4 lg:px-0 mb-6 border-b border-white/5 pb-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { onViewChange(item.id); if(window.innerWidth < 1024) onClose(); }}
                className={`
                  relative flex items-center lg:justify-center w-full lg:w-10 h-10 rounded-xl px-4 lg:px-0 transition-all group
                  ${activeView === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}
                `}
              >
                {item.icon}
                <span className="ml-3 lg:hidden text-[10px] font-black uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </div>

          {/* NODE & SIGNAL LIST (Drawer Content) */}
          <div className="flex-1 w-full overflow-y-auto no-scrollbar px-4 space-y-6 pb-10">
            <div className="space-y-3">
              <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 px-1">Frequency Nodes</h5>
              <div className="grid grid-cols-2 gap-2">
                {availableSources.map(source => (
                  <button
                    key={source}
                    onClick={() => onSourceSelect(source)}
                    className={`
                      px-2 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all text-center
                      ${activeTab === source ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 border-white/5 text-slate-400'}
                    `}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>

            {activeTab && (
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between px-1">
                  <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">{activeTab} Signals</h5>
                </div>
                <input 
                  type="text" 
                  placeholder="FILTER..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-[10px] uppercase font-black tracking-widest outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="space-y-1.5 max-h-[40vh] overflow-y-auto no-scrollbar">
                  {filteredInSide.map(ch => (
                    <button 
                      key={ch.id}
                      onClick={() => { onChannelSelect(ch); if(window.innerWidth < 1024) onClose(); }}
                      className="w-full flex items-center space-x-3 p-2 bg-slate-900/40 hover:bg-indigo-600/20 rounded-lg border border-white/5 transition-all text-left group"
                    >
                      <div className="w-8 h-8 flex-shrink-0 bg-black rounded p-1 border border-white/10 overflow-hidden">
                        <img src={ch.logo} className="w-full h-full object-contain" alt="" onError={(e) => (e.currentTarget.src='https://api.dicebear.com/7.x/identicon/svg?seed='+ch.name)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase text-slate-200 truncate group-hover:text-white">{ch.name}</p>
                        <p className="text-[7px] font-bold text-slate-600 uppercase truncate">{ch.group}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="hidden lg:flex mt-auto w-8 h-8 border-2 border-slate-900 rounded-full items-center justify-center bg-slate-950 text-[8px] font-black italic text-slate-800">4K</div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;