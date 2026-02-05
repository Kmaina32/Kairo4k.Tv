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
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('Roku');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [isTheater, setIsTheater] = useState(false);

  // Sync sidebar state on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) setSidebarOpen(true);
      else if (!selectedChannel) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedChannel]);

  const availableSources = useMemo(() => {
    const sources = Array.from(new Set(channels.map(c => c.source)));
    return sources.sort();
  }, [channels]);

  const fetchWithFallback = async (url: string): Promise<string> => {
    let lastError = null;
    for (const proxy of PROXY_OPTIONS) {
      try {
        const targetUrl = `${url}${url.includes('?') ? '&' : '?'}cache_bust=${Date.now()}`;
        const finalUrl = `${proxy}${encodeURIComponent(targetUrl)}`;
        const res = await fetch(finalUrl, {
          method: 'GET',
          headers: { 'Accept': 'text/plain, text/html, */*' }
        });
        if (!res.ok) continue;
        let text = await res.text();
        if (proxy.includes('allorigins') && !text.startsWith('#EXTM3U')) {
            try {
                const json = JSON.parse(text);
                text = json.contents || text;
            } catch(e) {}
        }
        if (text && (text.includes('#EXTM3U') || text.includes('#EXTINF'))) {
          return text;
        }
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error("Connection failed across all nodes.");
  };

  const fetchPlaylists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        DEFAULT_PLAYLISTS.map(async (p) => {
          try {
            const text = await fetchWithFallback(p.url);
            return parseM3U(text, p.type);
          } catch (e) {
            return [];
          }
        })
      );
      const allChannels = results.flat();
      setChannels(allChannels);
      if (allChannels.length === 0) {
        setError("Network restriction detected. Please check your connection.");
      } else {
        const hasTab = allChannels.some(c => c.source === activeTab);
        if (!hasTab && allChannels.length > 0) {
          setActiveTab(allChannels[0].source);
        }
      }
    } catch (err) {
      setError("Failed to initialize stream network.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const filteredChannels = useMemo(() => {
    return channels.filter(c => 
      c.source === activeTab && 
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       c.group.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [channels, activeTab, searchTerm]);

  const handleChannelSelect = useCallback((channel: Channel) => {
    setSelectedChannel(channel);
    if (window.innerWidth < 1024) setSidebarOpen(false);
    if (window.innerWidth < 768) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-6 overflow-hidden">
        <div className="relative mb-8 scale-150">
          <div className="w-16 h-16 border-2 border-indigo-500/10 rounded-full"></div>
          <div className="w-16 h-16 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(99,102,241,1)]"></div>
          </div>
        </div>
        <div className="text-center">
          <p className="text-white font-black text-xl tracking-[0.4em] mb-2 uppercase drop-shadow-lg">Nexus Stream</p>
          <p className="text-indigo-400/50 text-[10px] font-mono uppercase tracking-[0.5em] animate-pulse">Initializing Proxy Uplink</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden relative selection:bg-indigo-500/30">
      
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && !isTheater && window.innerWidth < 1024 && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] transition-opacity duration-500"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Channel Selector */}
      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-[85vw] max-w-sm lg:static lg:translate-x-0 transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
        flex flex-col border-r border-white/5 shadow-2xl bg-slate-950/95 lg:bg-slate-900/10 backdrop-blur-3xl
        ${sidebarOpen && !isTheater ? 'translate-x-0' : '-translate-x-full lg:w-0 lg:overflow-hidden'}
      `}>
        <div className="p-6 md:p-8 border-b border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h1 className="text-xl font-black italic tracking-tighter text-white uppercase">Nexus</h1>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="lg:hidden p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 active:scale-90 transition-all"
            >
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="relative group">
            <input 
              type="text" 
              placeholder="Search frequencies..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
            />
            <div className="absolute right-4 top-4 text-slate-700 group-focus-within:text-indigo-400 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>
            </div>
          </div>

          {/* Desktop Tab Switcher */}
          <div className="hidden lg:flex overflow-x-auto no-scrollbar space-x-2 pb-2">
            {availableSources.map(source => (
              <button 
                key={source}
                onClick={() => setActiveTab(source)}
                className={`px-4 py-2 text-[10px] font-black rounded-lg uppercase tracking-widest border transition-all shrink-0 ${activeTab === source ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 border-transparent hover:bg-white/5 hover:text-slate-300'}`}
              >
                {source}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-white/5">
          {filteredChannels.length > 0 ? filteredChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => handleChannelSelect(channel)}
              className={`w-full text-left p-5 flex items-center space-x-5 hover:bg-white/5 transition-all group relative ${selectedChannel?.id === channel.id ? 'bg-indigo-600/10' : ''}`}
            >
              {selectedChannel?.id === channel.id && (
                <div className="absolute left-0 inset-y-0 w-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
              )}
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex-shrink-0 flex items-center justify-center border border-white/5 group-hover:border-indigo-500/30 transition-all shadow-md overflow-hidden">
                <img src={channel.logo} className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500" alt="" onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(channel.name)}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-black truncate leading-tight tracking-tight ${selectedChannel?.id === channel.id ? 'text-indigo-400' : 'text-slate-200'}`}>{channel.name}</p>
                <div className="flex items-center space-x-2 mt-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedChannel?.id === channel.id ? 'bg-indigo-500 animate-pulse' : 'bg-slate-700'}`} />
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{channel.group || 'Public Feed'}</p>
                </div>
              </div>
            </button>
          )) : (
            <div className="p-12 text-center opacity-30">
               <p className="text-[10px] font-black uppercase tracking-[0.4em]">Signal Not Found</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative overflow-hidden">
        
        {/* Dynamic Header */}
        <header className={`
          h-20 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur-xl z-50 sticky top-0
          transition-all duration-700 ease-in-out ${isTheater ? 'opacity-0 h-0 overflow-hidden -translate-y-full' : 'translate-y-0'}
        `}>
          <div className="flex items-center space-x-4 min-w-0">
            {!sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(true)} 
                className="p-3 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all border border-indigo-500/20 active:scale-90 shadow-xl"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            )}
            <div className="min-w-0">
               <h2 className="text-lg font-black truncate uppercase text-white tracking-tighter drop-shadow-sm">
                 {selectedChannel?.name || 'Awaiting Signal'}
               </h2>
               {selectedChannel && (
                 <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em]">{selectedChannel.source} BROADCAST</span>
                 </div>
               )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button onClick={fetchPlaylists} className="p-3 text-slate-500 hover:text-indigo-400 transition-all hover:bg-indigo-500/5 rounded-2xl active:rotate-180 duration-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className={`
          flex-1 overflow-y-auto pb-24 lg:pb-8 transition-all duration-700
          bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950/20 via-slate-950 to-slate-950
          ${isTheater ? 'p-0' : 'p-4 md:p-8 lg:p-12'}
        `}>
          {selectedChannel ? (
            <div className={`mx-auto w-full space-y-10 lg:space-y-16 animate-in fade-in slide-in-from-bottom-10 duration-1000 ${isTheater ? 'max-w-full h-full' : 'max-w-6xl'}`}>
              
              <div className={`transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) ${isTheater ? 'w-full h-full bg-black flex items-center justify-center' : 'relative group'}`}>
                <VideoPlayer 
                  url={selectedChannel.url} 
                  poster={selectedChannel.logo} 
                  isTheater={isTheater} 
                  onToggleTheater={() => setIsTheater(!isTheater)} 
                />
              </div>

              {!isTheater && (
                <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-16 backdrop-blur-3xl shadow-2xl">
                  <div className="flex flex-col md:flex-row md:items-center space-y-8 md:space-y-0 md:space-x-14">
                    <div className="w-28 h-28 md:w-44 md:h-44 bg-slate-950 rounded-[2rem] md:rounded-[3rem] border border-white/10 flex items-center justify-center p-6 md:p-10 shrink-0 shadow-2xl group hover:border-indigo-500/40 transition-all duration-500 overflow-hidden">
                      <img 
                        src={selectedChannel.logo} 
                        className="max-w-full max-h-full object-contain filter drop-shadow-2xl group-hover:scale-110 transition-transform duration-700" 
                        alt="" 
                        onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(selectedChannel.name)}`} 
                      />
                    </div>
                    <div className="flex-1 space-y-6">
                      <h3 className="text-4xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white uppercase leading-[0.9] truncate drop-shadow-2xl">
                        {selectedChannel.name}
                      </h3>
                      <div className="flex flex-wrap gap-3 md:gap-4">
                        <span className="bg-indigo-500/10 text-indigo-400 px-6 py-2.5 rounded-full text-[10px] md:text-xs font-black border border-indigo-500/20 uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/5">{selectedChannel.group}</span>
                        <span className="bg-emerald-500/10 text-emerald-400 px-6 py-2.5 rounded-full text-[10px] md:text-xs font-black border border-emerald-500/20 uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/5">Encrypted Stream</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12">
               <div className="relative w-48 h-48 md:w-64 md:h-64 mb-12 group">
                  <div className="absolute inset-0 bg-indigo-500/5 rounded-full blur-[80px] group-hover:bg-indigo-500/10 transition-all duration-1000"></div>
                  <div className="relative h-full w-full bg-slate-900/40 rounded-[4rem] border border-white/5 flex items-center justify-center group-hover:border-indigo-500/20 transition-all duration-700 shadow-3xl backdrop-blur-3xl">
                    <svg className="h-24 w-24 md:h-32 md:w-32 opacity-10 text-indigo-400 transition-all duration-700 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}><path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.343 5.858c5.858-5.858 15.355-5.858 21.213 0" /></svg>
                  </div>
               </div>
               <div className="space-y-4 max-w-sm">
                 <h3 className="text-sm md:text-lg font-black uppercase tracking-[0.5em] text-slate-600 animate-pulse">Awaiting Signal Synchronization</h3>
                 <p className="text-[10px] font-mono text-slate-700 leading-relaxed uppercase tracking-widest">Global proxy network operational. Select a node from the frequency menu to initiate visualization.</p>
               </div>
            </div>
          )}
        </main>

        {/* Mobile Bottom Navigation - Sticky & Glassmorphic */}
        {!isTheater && (
          <nav className="lg:hidden fixed bottom-0 inset-x-0 h-24 bg-slate-950/90 border-t border-white/5 backdrop-blur-3xl flex items-center justify-around px-6 pb-2 z-[55] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
            {availableSources.slice(0, 4).map(source => (
              <button 
                key={source}
                onClick={() => setActiveTab(source)}
                className={`flex flex-col items-center space-y-1.5 p-3 transition-all relative ${activeTab === source ? 'text-indigo-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {activeTab === source && (
                  <div className="absolute top-0 w-1 h-1 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,1)]" />
                )}
                <span className="text-[10px] font-black uppercase tracking-tighter leading-none">{source}</span>
              </button>
            ))}
            <button 
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center space-y-1.5 p-4 bg-indigo-600/10 rounded-2xl border border-indigo-500/20 text-indigo-400 active:scale-90 transition-all shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" /></svg>
              <span className="text-[9px] font-black uppercase tracking-widest leading-none">Menu</span>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
};

export default App;
