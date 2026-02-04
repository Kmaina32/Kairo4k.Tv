
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

  // Handle window resize for sidebar state
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        setError("Cross-Origin restriction detected. No feeds were successfully parsed.");
      } else {
        const hasTab = allChannels.some(c => c.source === activeTab);
        if (!hasTab && allChannels.length > 0) {
          setActiveTab(allChannels[0].source);
        }
      }
    } catch (err) {
      setError("System sync error. Feed nodes are currently unresponsive.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const filteredChannels = useMemo(() => {
    return channels.filter(c => 
      c.source === activeTab && 
      (c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       c.group.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [channels, activeTab, searchTerm]);

  const handleChannelSelect = useCallback((channel: Channel) => {
    setSelectedChannel(channel);
    // On mobile, close sidebar after selection
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-6">
        <div className="relative mb-8">
          <div className="w-24 h-24 border-2 border-indigo-500/10 rounded-full"></div>
          <div className="w-24 h-24 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(99,102,241,1)]"></div>
          </div>
        </div>
        <div className="text-center">
          <p className="text-indigo-400 font-black text-2xl md:text-3xl tracking-[0.3em] mb-2 uppercase">Stream Nexus</p>
          <p className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.5em]">Establishing Proxy Tunnels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden relative">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && !isTheater && window.innerWidth < 1024 && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Drawer on Mobile, Static on Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-80 lg:static lg:translate-x-0 transform transition-transform duration-500 ease-in-out
        flex flex-col border-r border-white/5 shadow-2xl bg-slate-950/95 backdrop-blur-3xl
        ${sidebarOpen && !isTheater ? 'translate-x-0' : '-translate-x-full lg:w-0 lg:overflow-hidden'}
      `}>
        <div className="p-4 md:p-6 border-b border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 uppercase">Nexus</h1>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"
            >
              <svg className="w-5 h-5 text-slate-300" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="flex overflow-x-auto no-scrollbar pb-1 space-x-2">
            {availableSources.map(source => (
              <button 
                key={source}
                onClick={() => setActiveTab(source)}
                className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all whitespace-nowrap uppercase tracking-widest border ${activeTab === source ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'}`}
              >
                {source}
              </button>
            ))}
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder="Filter channels..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all placeholder:text-slate-600"
            />
            <div className="absolute right-3 top-3.5 text-slate-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
          {filteredChannels.length > 0 ? filteredChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => handleChannelSelect(channel)}
              className={`w-full text-left p-4 flex items-center space-x-4 hover:bg-white/5 transition-all group ${selectedChannel?.id === channel.id ? 'bg-indigo-600/10 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
            >
              <div className="w-12 h-12 flex-shrink-0 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-white/5 group-hover:border-indigo-500/40 transition-all">
                <img 
                  src={channel.logo} 
                  alt="" 
                  className="w-full h-full object-contain p-2" 
                  loading="lazy" 
                  onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(channel.name)}`} 
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate leading-tight ${selectedChannel?.id === channel.id ? 'text-indigo-400' : 'text-slate-200'}`}>{channel.name}</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-wider truncate">{channel.group || 'UNEXPECTED SIGNAL'}</p>
              </div>
            </button>
          )) : (
            <div className="p-8 text-center space-y-4 opacity-50">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <p className="text-xs font-black uppercase tracking-widest">No signals found</p>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative overflow-hidden">
        {/* Mobile Header Nav */}
        <header className={`
          h-16 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-4 md:px-6 bg-slate-950/80 backdrop-blur-md z-20 sticky top-0
          transition-all duration-500 ${isTheater ? 'opacity-0 h-0 overflow-hidden translate-y-[-100%]' : 'translate-y-0'}
        `}>
          <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
            {!sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(true)} 
                className="p-2.5 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 rounded-xl transition-all border border-indigo-500/20 shadow-lg shadow-indigo-500/5"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            )}
            <div className="flex flex-col min-w-0">
               <h2 className="text-sm font-black truncate tracking-tight uppercase text-white">{selectedChannel?.name || 'Nexus Intelligence'}</h2>
               {selectedChannel && <p className="text-[10px] text-indigo-400/80 font-mono font-black uppercase tracking-widest truncate">Source: {selectedChannel.source}</p>}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={fetchPlaylists} 
              className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl border border-white/5 transition-all active:scale-90"
              title="Sync Feeds"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </header>

        <main className={`
          flex-1 overflow-y-auto transition-all duration-500 relative
          bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950/10 via-slate-950 to-slate-950
          ${isTheater ? 'p-0' : 'p-3 md:p-6 lg:p-12'}
        `}>
          {selectedChannel ? (
            <div className={`mx-auto w-full space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 ${isTheater ? 'max-w-full' : 'max-w-6xl'}`}>
              
              {/* Exit Theater Floating Button (Mobile Optimization) */}
              {isTheater && (
                <button 
                  onClick={() => setIsTheater(false)}
                  className="fixed top-4 left-4 z-50 p-4 bg-black/70 hover:bg-indigo-600 border border-white/20 rounded-2xl text-white backdrop-blur-xl transition-all group flex items-center shadow-2xl active:scale-95"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline-block ml-3 text-xs font-black uppercase tracking-[0.2em]">Close Theater</span>
                </button>
              )}

              <div className={`
                transition-all duration-700 ease-in-out
                ${isTheater ? 'w-full h-screen lg:h-[calc(100vh-2px)] bg-black flex items-center justify-center' : 'relative group'}
              `}>
                <VideoPlayer 
                  url={selectedChannel.url} 
                  poster={selectedChannel.logo} 
                  isTheater={isTheater} 
                  onToggleTheater={() => setIsTheater(!isTheater)} 
                />
              </div>

              {!isTheater && (
                <div className="w-full space-y-6 pb-12 animate-in fade-in duration-700 delay-300">
                  <div className="bg-slate-900/40 border border-white/5 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 backdrop-blur-md shadow-2xl">
                    <div className="flex flex-col md:flex-row md:items-center space-y-6 md:space-y-0 md:space-x-10">
                      <div className="w-24 h-24 md:w-32 md:h-32 bg-slate-950 rounded-2xl md:rounded-3xl border border-white/10 flex items-center justify-center p-4 md:p-6 shadow-2xl group hover:border-indigo-500/30 transition-all duration-500 shrink-0">
                        <img 
                          src={selectedChannel.logo} 
                          className="max-w-full max-h-full object-contain filter drop-shadow-2xl" 
                          alt="" 
                          onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(selectedChannel.name)}`} 
                        />
                      </div>
                      <div className="space-y-4 flex-1 min-w-0">
                        <h3 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white leading-none uppercase truncate">
                          {selectedChannel.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 md:gap-3">
                          <span className="bg-indigo-500/10 text-indigo-400 px-4 py-1.5 rounded-full text-[9px] md:text-[10px] font-black border border-indigo-500/20 uppercase tracking-[0.1em]">{selectedChannel.group}</span>
                          <span className="bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full text-[9px] md:text-[10px] font-black border border-emerald-500/20 uppercase tracking-[0.1em]">{selectedChannel.source} BROADCAST</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8 md:mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                       {[
                         { l: 'SIGNAL', v: 'ENCRYPTED', c: 'text-slate-400' },
                         { l: 'LATENCY', v: 'HD REALTIME', c: 'text-indigo-400' },
                         { l: 'BITRATE', v: 'AUTO ADAPT', c: 'text-slate-400' },
                         { l: 'STATUS', v: 'SECURE', c: 'text-emerald-500' }
                       ].map((item, i) => (
                         <div key={i} className="bg-slate-950/60 rounded-xl md:rounded-2xl p-4 md:p-6 border border-white/5 shadow-inner">
                            <p className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 md:mb-2">{item.l}</p>
                            <p className={`text-[10px] md:text-xs font-black uppercase truncate ${item.c}`}>{item.v}</p>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-800 p-8">
               <div className="relative w-40 h-40 md:w-56 md:h-56 mb-8 group">
                  <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-1000"></div>
                  <div className="relative h-full w-full bg-slate-900/40 rounded-[2rem] md:rounded-[3rem] border border-white/5 flex items-center justify-center group-hover:border-indigo-500/20 transition-all duration-700 shadow-2xl backdrop-blur-xl">
                    <svg className="h-20 w-20 md:h-28 md:w-28 opacity-20 group-hover:opacity-40 text-indigo-400 transition-all duration-700 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.343 5.858c5.858-5.858 15.355-5.858 21.213 0" />
                    </svg>
                  </div>
               </div>
               <div className="text-center space-y-3">
                  <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.5em] text-slate-600 animate-pulse">Awaiting Signal Input</h3>
                  <p className="text-xs font-mono text-slate-700 max-w-xs mx-auto">Global proxy network active. Connect to a feed to initiate data stream.</p>
               </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
