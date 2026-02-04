
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
        setError("Network restricted. Feeds unavailable.");
      } else {
        const hasTab = allChannels.some(c => c.source === activeTab);
        if (!hasTab && allChannels.length > 0) {
          setActiveTab(allChannels[0].source);
        }
      }
    } catch (err) {
      setError("Initialization failed.");
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
    // Scroll player into view on mobile
    if (window.innerWidth < 768) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-6 overflow-hidden">
        <div className="relative mb-10">
          <div className="w-20 h-20 border-2 border-indigo-500/10 rounded-full animate-pulse"></div>
          <div className="w-20 h-20 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
        </div>
        <p className="text-white font-black text-xl tracking-[0.3em] uppercase">Stream Nexus</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden relative">
      
      {/* Mobile Overlay */}
      {sidebarOpen && !isTheater && window.innerWidth < 1024 && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] transition-opacity duration-500"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-[85vw] max-w-sm lg:static lg:translate-x-0 transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
        flex flex-col border-r border-white/5 shadow-2xl bg-slate-950 lg:bg-slate-900/20 backdrop-blur-3xl
        ${sidebarOpen && !isTheater ? 'translate-x-0' : '-translate-x-full lg:w-0 lg:overflow-hidden'}
      `}>
        <div className="p-6 md:p-8 border-b border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black tracking-tighter text-indigo-400 uppercase">Nexus Hub</h1>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="lg:hidden p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90"
            >
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder="Search feed..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          <div className="hidden lg:flex overflow-x-auto no-scrollbar space-x-2">
            {availableSources.map(source => (
              <button 
                key={source}
                onClick={() => setActiveTab(source)}
                className={`px-4 py-2 text-[10px] font-black rounded-lg uppercase tracking-widest border transition-all ${activeTab === source ? 'bg-indigo-600 border-indigo-400 text-white' : 'text-slate-500 border-transparent hover:bg-white/5'}`}
              >
                {source}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => handleChannelSelect(channel)}
              className={`w-full text-left p-5 flex items-center space-x-5 hover:bg-white/5 transition-all group ${selectedChannel?.id === channel.id ? 'bg-indigo-600/10 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
            >
              <div className="w-14 h-14 bg-slate-900 rounded-2xl flex-shrink-0 flex items-center justify-center border border-white/5">
                <img src={channel.logo} className="w-full h-full object-contain p-2" alt="" onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(channel.name)}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-bold truncate leading-tight ${selectedChannel?.id === channel.id ? 'text-indigo-400' : 'text-slate-200'}`}>{channel.name}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-wider">{channel.group || 'Live'}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative overflow-hidden">
        
        {/* Top Header */}
        <header className={`
          h-20 flex-shrink-0 border-b border-white/5 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur-xl z-50
          transition-all duration-700 ${isTheater ? 'opacity-0 h-0 overflow-hidden -translate-y-full' : 'translate-y-0'}
        `}>
          <div className="flex items-center space-x-4 min-w-0">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-600/20 active:scale-95">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            )}
            <div className="min-w-0">
               <h2 className="text-sm md:text-lg font-black truncate uppercase text-white tracking-tighter">
                 {selectedChannel?.name || 'Signal Offline'}
               </h2>
               {selectedChannel && <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em]">Live Channel Feed</p>}
            </div>
          </div>
          <button onClick={fetchPlaylists} className="p-3 text-slate-400 hover:text-white transition-all active:rotate-180">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </header>

        {/* Content Body */}
        <main className={`flex-1 overflow-y-auto pb-24 lg:pb-0 transition-all duration-700 ${isTheater ? 'p-0' : 'p-4 md:p-8 lg:p-12'}`}>
          {selectedChannel ? (
            <div className={`mx-auto w-full space-y-8 lg:space-y-16 animate-in fade-in duration-1000 ${isTheater ? 'max-w-full h-full' : 'max-w-6xl'}`}>
              
              <div className={`transition-all duration-1000 ${isTheater ? 'w-full h-full bg-black flex items-center justify-center' : 'relative'}`}>
                <VideoPlayer 
                  url={selectedChannel.url} 
                  poster={selectedChannel.logo} 
                  isTheater={isTheater} 
                  onToggleTheater={() => setIsTheater(!isTheater)} 
                />
              </div>

              {!isTheater && (
                <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 md:p-14 backdrop-blur-3xl">
                  <div className="flex flex-col md:flex-row md:items-center space-y-8 md:space-y-0 md:space-x-12">
                    <div className="w-28 h-28 md:w-36 md:h-36 bg-slate-950 rounded-3xl border border-white/10 flex items-center justify-center p-6 shrink-0 shadow-2xl">
                      <img src={selectedChannel.logo} className="max-w-full max-h-full object-contain" alt="" onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(selectedChannel.name)}`} />
                    </div>
                    <div className="flex-1 space-y-4">
                      <h3 className="text-4xl md:text-7xl font-black tracking-tighter text-white uppercase leading-none">{selectedChannel.name}</h3>
                      <div className="flex flex-wrap gap-3">
                        <span className="bg-indigo-500/10 text-indigo-400 px-6 py-2 rounded-full text-[10px] font-black border border-indigo-500/20 uppercase tracking-widest">{selectedChannel.group}</span>
                        <span className="bg-emerald-500/10 text-emerald-400 px-6 py-2 rounded-full text-[10px] font-black border border-emerald-500/20 uppercase tracking-widest">Active Signal</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
               <div className="w-40 h-40 bg-slate-900 rounded-[3rem] border border-white/5 flex items-center justify-center mb-8 animate-pulse">
                  <svg className="h-20 w-20 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.343 5.858c5.858-5.858 15.355-5.858 21.213 0" /></svg>
               </div>
               <p className="text-xs font-black uppercase tracking-[0.5em]">Awaiting User Input</p>
            </div>
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        {!isTheater && (
          <nav className="lg:hidden fixed bottom-0 inset-x-0 h-20 bg-slate-950/95 border-t border-white/10 backdrop-blur-2xl flex items-center justify-around px-4 z-40">
            {availableSources.slice(0, 4).map(source => (
              <button 
                key={source}
                onClick={() => setActiveTab(source)}
                className={`flex flex-col items-center space-y-1 p-2 transition-all ${activeTab === source ? 'text-indigo-400 scale-110' : 'text-slate-500'}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full mb-1 transition-all ${activeTab === source ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,1)]' : 'bg-transparent'}`} />
                <span className="text-[10px] font-black uppercase tracking-tighter">{source}</span>
              </button>
            ))}
            <button 
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center space-y-1 p-2 text-slate-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" /></svg>
              <span className="text-[10px] font-black uppercase tracking-tighter">Menu</span>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
};

export default App;
