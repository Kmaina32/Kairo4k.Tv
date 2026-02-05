/**
 * Sidebar component for channel navigation and search.
 */
import React from 'react';
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
  toggleFavorite: (channel: Channel) => void;
  isFavorite: (channel: Channel) => boolean;
  activeView: string;
}

const Sidebar = ({
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
  onChannelSelect,
  toggleFavorite,
  isFavorite,
  activeView
}: SidebarProps) => {
  return (
    <aside className={`
      fixed inset-y-0 left-0 z-[70] w-[85vw] max-w-sm lg:static lg:translate-x-0 transform transition-transform duration-500
      flex flex-col border-r border-white/5 bg-slate-950/98 lg:bg-slate-950/40 backdrop-blur-3xl
      ${isOpen && !isTheater ? 'translate-x-0' : '-translate-x-full lg:w-0 lg:overflow-hidden'}
    `}>
      <div className="p-6 border-b border-white/5 space-y-6">
        <div className="flex items-center justify-between">
          <BrandLogo size="md" />
          <button onClick={onClose} className="lg:hidden p-2 bg-white/5 rounded-xl text-slate-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2}/></svg>
          </button>
        </div>

        <div className="relative">
          <input 
            type="text" 
            placeholder="Search Frequencies..." 
            value={searchTerm} 
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500/50 outline-none text-white transition-all"
          />
        </div>

        {activeView !== 'favorites' && (
          <div className="flex overflow-x-auto no-scrollbar space-x-2 py-1">
            {availableSources.map(source => (
              <button 
                key={source} 
                onClick={() => onTabChange(source)}
                className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all shrink-0 ${activeTab === source ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                {source}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {channels.length > 0 ? channels.map((channel) => (
          <div key={channel.id} className="group relative">
            <button
              onClick={() => onChannelSelect(channel)}
              className={`w-full text-left p-4 flex items-center space-x-4 hover:bg-white/5 transition-all border-l-2 ${selectedChannelId === channel.id ? 'bg-indigo-600/10 border-indigo-500' : 'border-transparent'}`}
            >
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex-shrink-0 flex items-center justify-center border border-white/5 overflow-hidden">
                <img 
                  src={channel.logo} 
                  className="w-full h-full object-contain p-1" 
                  alt="" 
                  onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(channel.name)}`} 
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold truncate ${selectedChannelId === channel.id ? 'text-indigo-400' : 'text-slate-300'}`}>{channel.name}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest truncate">{channel.group}</p>
              </div>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); toggleFavorite(channel); }} 
              className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${isFavorite(channel) ? 'text-indigo-500 opacity-100' : 'text-slate-600 opacity-0 group-hover:opacity-100 hover:text-white'}`}
            >
              <svg className="w-4 h-4" fill={isFavorite(channel) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          </div>
        )) : (
          <div className="p-12 text-center text-slate-600 text-[10px] font-black uppercase tracking-widest">Signal Nodes Empty</div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;