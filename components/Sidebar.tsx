// Standard React import to ensure JSX intrinsic elements are recognized
import * as React from 'react';
import { Channel } from '../types';
import BrandLogo from './BrandLogo';

interface SidebarProps {
  isOpen: boolean;
  isTheater: boolean;
  onClose: () => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  availableSources: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  channels: Channel[];
  selectedChannelId?: string;
  onChannelSelect: (channel: Channel) => void;
}

// Use React wildcard import to fix JSX intrinsic elements missing from global namespace
const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isTheater,
  onClose,
  searchTerm,
  onSearchChange,
  availableSources,
  activeTab,
  onTabChange,
  channels,
  selectedChannelId,
  onChannelSelect
}) => {
  return (
    <aside className={`
      fixed inset-y-0 left-0 z-[70] w-[85vw] max-w-sm lg:static lg:translate-x-0 transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
      flex flex-col border-r border-white/5 bg-slate-950/98 lg:bg-slate-950/40 backdrop-blur-3xl
      ${isOpen && !isTheater ? 'translate-x-0' : '-translate-x-full lg:w-0 lg:overflow-hidden'}
    `}>
      <div className="p-6 border-b border-white/5 space-y-6">
        <div className="flex items-center justify-between">
          <BrandLogo size="md" />
          <button onClick={onClose} className="lg:hidden p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2}/></svg>
          </button>
        </div>

        <div className="relative">
          <input 
            type="text" 
            placeholder="Search frequencies..." 
            value={searchTerm} 
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all placeholder:text-slate-600 text-white"
          />
        </div>

        <div className="flex overflow-x-auto no-scrollbar space-x-2 py-1">
          {availableSources.map(source => (
            <button 
              key={source} 
              onClick={() => onTabChange(source)}
              className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all shrink-0 ${activeTab === source ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/10'}`}
            >
              {source}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {channels.length > 0 ? channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => onChannelSelect(channel)}
            className={`w-full text-left p-4 flex items-center space-x-4 hover:bg-white/5 transition-all border-l-2 group ${selectedChannelId === channel.id ? 'bg-indigo-600/10 border-indigo-500' : 'border-transparent'}`}
          >
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex-shrink-0 flex items-center justify-center border border-white/5 overflow-hidden group-hover:border-indigo-500/30 transition-all">
              <img 
                src={channel.logo} 
                className="w-full h-full object-contain p-1" 
                alt="" 
                loading="lazy"
                onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(channel.name)}`} 
              />
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-bold truncate tracking-tight ${selectedChannelId === channel.id ? 'text-indigo-400' : 'text-slate-300'}`}>{channel.name}</p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest truncate mt-0.5">{channel.group}</p>
            </div>
          </button>
        )) : (
          <div className="p-12 text-center opacity-20">
             <p className="text-[10px] font-black uppercase tracking-[0.2em]">Zero signals in node</p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;