
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Channel } from './types';
import { DEFAULT_PLAYLISTS, PROXY_OPTIONS } from './constants';
import { parseM3U } from './services/m3uParser';
import VideoPlayer from './components/VideoPlayer';

const App: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('Roku');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [isTheater, setIsTheater] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const availableSources = useMemo(() => {
    const sources = Array.from(new Set(channels.map(c => c.source)));
    return sources.length > 0 ? sources.sort() : DEFAULT_PLAYLISTS.map(p => p.name).sort();
  }, [channels]);

  const fetchWithFallback = async (url: string): Promise<string> => {
    let lastError = null;
    for (const proxy of PROXY_OPTIONS) {
      try {
        const finalUrl = `${proxy}${encodeURIComponent(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now())}`;
        const res = await fetch(finalUrl);
        if (!res.ok) continue;
        let text = await res.text();
        if (proxy.includes('allorigins')) {
          try { text = JSON.parse(text).contents; } catch(e) {}
        }
        if (text && (text.includes('#EXTM3U') || text.includes('#EXTINF'))) return text;
      } catch (e) { lastError = e; }
    }
    throw lastError || new Error("Connection failed");
  };

  const loadAllFeeds = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    else setIsRefreshing(true);
    
    setError(null);
    try {
      const results = await Promise.all(
        DEFAULT_PLAYLISTS.map(async (p) => {
          try {
            const text = await fetchWithFallback(p.url);
            return parseM3U(text, p.name);
          } catch (e) { 
            console.error(`Failed to fetch ${p.name}`, e);
            return []; 
          }
        })
      );
      
      const allChannels = results.flat();
      if (allChannels.length === 0) {
        setError("All signal nodes are currently unreachable.");
      } else {
        setChannels(allChannels);
      }
    } catch (err) {
      setError("Global uplink failure.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load only
  useEffect(() => { 
    loadAllFeeds(true); 
  }, [loadAllFeeds]);

  const filteredChannels = useMemo(() => {
    return channels.filter(c => 
      c.source === activeTab && 
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       c.group.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [channels, activeTab, searchTerm]);

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
        </div>
        <p className="mt-6 text-white font-black tracking-[0.3em] text-[10px] uppercase animate-pulse">Establishing Nexus Uplink</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden relative selection:bg-indigo-500/30">
      
      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && !isTheater && window.innerWidth < 1024 && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] transition-all" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - Channel List */}
      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-[85vw] max-w-sm lg:static lg:translate-x-0 transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
        flex flex-col border-r border-white/5 bg-slate-950/98 lg:bg-slate-950/40 backdrop-blur-3xl
        ${sidebarOpen && !isTheater ? 'translate-x-0' : '-translate-x-full lg:w-0 lg:overflow-hidden'}
      `}>
        <div className="p-6 border-b border-white/5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h1 className="text-xl font-black italic tracking-tighter text-white uppercase">Nexus</h1>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 bg-white/5 rounded-xl text-slate-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2}/></svg>
            </button>
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder="Search signals..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-indigo-500/50 focus:outline-none transition-all placeholder:text-slate-600"
            />
          </div>

          {/* Source Selector Chips (Desktop/TV) */}
          <div className="flex overflow-x-auto no-scrollbar space-x-2 py-1">
            {availableSources.map(source => (
              <button 
                key={source} 
                onClick={() => setActiveTab(source)}
                className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 ${activeTab === source ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/10'}`}
              >
                {source}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {filteredChannels.length > 0 ? filteredChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => handleChannelSelect(channel)}
              className={`w-full text-left p-4 flex items-center space-x-4 hover:bg-white/5 transition-all border-l-2 group ${selectedChannel?.id === channel.id ? 'bg-indigo-600/10 border-indigo-500' : 'border-transparent'}`}
            >
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex-shrink-0 flex items-center justify-center border border-white/5 overflow-hidden group-hover:border-indigo-500/30 transition-all">
                <img src={channel.logo} className="w-full h-full object-contain p-1" alt="" onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(channel.name)}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold truncate tracking-tight ${selectedChannel?.id === channel.id ? 'text-indigo-400' : 'text-slate-300'}`}>{channel.name}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest truncate mt-0.5">{channel.group}</p>
              </div>
            </button>
          )) : (
            <div className="p-12 text-center opacity-20">
               <p className="text-[10px] font-black uppercase tracking-[0.2em]">No results in this node</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Bridge */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
        <header className={`h-16 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur-xl z-50 transition-all duration-500 ${isTheater ? 'opacity-0 h-0 pointer-events-none overflow-hidden' : ''}`}>
          <div className="flex items-center space-x-3 min-w-0">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg active:scale-95 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            )}
            <h2 className="text-sm font-black uppercase tracking-tight truncate pr-4">{selectedChannel?.name || 'Awaiting Signal'}</h2>
          </div>
          <div className="flex items-center space-x-4">
             {isRefreshing && (
               <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
             )}
            <button 
              onClick={() => loadAllFeeds()} 
              disabled={isRefreshing}
              className={`p-2 text-slate-500 hover:text-white transition-all active:rotate-180 duration-500 ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto pb-24 lg:pb-8 relative transition-all duration-700 ${isTheater ? 'p-0' : 'p-4 md:p-8 lg:p-12'}`}>
          {selectedChannel ? (
            <div className={`mx-auto w-full transition-all duration-700 ${isTheater ? 'max-w-full h-full flex items-center justify-center bg-black' : 'max-w-5xl space-y-12'}`}>
              <div className={`transition-all duration-700 ${isTheater ? 'w-full h-full' : 'relative rounded-3xl md:rounded-[3rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.6)] ring-1 ring-white/10'}`}>
                <VideoPlayer 
                  url={selectedChannel.url} 
                  poster={selectedChannel.logo} 
                  isTheater={isTheater} 
                  onToggleTheater={() => setIsTheater(!isTheater)} 
                />
              </div>
              {!isTheater && (
                <div className="p-8 md:p-12 bg-slate-900/40 border border-white/5 rounded-[2.5rem] backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-5 duration-700">
                   <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-10">
                      <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-950 rounded-[2rem] flex items-center justify-center p-6 border border-white/10 shadow-2xl shrink-0">
                        <img src={selectedChannel.logo} className="w-full h-full object-contain filter drop-shadow-lg" alt="" onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(selectedChannel.name)}`} />
                      </div>
                      <div className="space-y-4 min-w-0 flex-1 text-center md:text-left">
                        <h3 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none text-white">{selectedChannel.name}</h3>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3">
                          <span className="bg-indigo-500/10 text-indigo-400 px-4 py-1.5 rounded-full text-[10px] font-black border border-indigo-500/20 uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/5">{selectedChannel.source}</span>
                          <span className="bg-slate-800/50 text-slate-400 px-4 py-1.5 rounded-full text-[10px] font-black border border-white/5 uppercase tracking-[0.2em]">{selectedChannel.group}</span>
                          <span className="bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full text-[10px] font-black border border-emerald-500/20 uppercase tracking-[0.2em]">Stream Online</span>
                        </div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
               <div className="w-48 h-48 bg-slate-900/50 rounded-[3rem] flex items-center justify-center mb-10 border border-white/5 relative group transition-all duration-700 hover:border-indigo-500/20">
                 <div className="absolute inset-0 bg-indigo-500/5 rounded-[3rem] blur-3xl opacity-0 group-hover:opacity-100 transition-all"></div>
                 <svg className="w-20 h-20 text-indigo-500/50 group-hover:scale-110 transition-transform duration-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.343 5.858c5.858-5.858 15.355-5.858 21.213 0" strokeWidth={1}/></svg>
               </div>
               <p className="text-[11px] font-black uppercase tracking-[0.5em] text-indigo-400/50">Select Frequency Node</p>
            </div>
          )}
        </main>

        {/* Mobile Bottom Bar - Source Switcher */}
        {!isTheater && (
          <nav className="lg:hidden fixed bottom-0 inset-x-0 h-20 bg-slate-950/95 border-t border-white/5 backdrop-blur-3xl flex items-center justify-around px-4 z-[55] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            {availableSources.slice(0, 5).map(source => (
              <button 
                key={source} 
                onClick={() => setActiveTab(source)}
                className={`flex flex-col items-center space-y-1.5 p-2 transition-all relative ${activeTab === source ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {activeTab === source && (
                  <div className="absolute top-0 w-1 h-1 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,1)]" />
                )}
                <span className="text-[9px] font-black uppercase tracking-tighter leading-none">{source}</span>
              </button>
            ))}
            <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center space-y-1 p-2 text-indigo-500 active:scale-90 transition-all">
              <div className="w-8 h-8 bg-indigo-600/10 rounded-lg flex items-center justify-center border border-indigo-500/20">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              </div>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
};

export default App;
