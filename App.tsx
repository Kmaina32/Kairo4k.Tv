
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isTheater, setIsTheater] = useState(false);

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
    if (window.innerWidth < 768) setSidebarOpen(false);
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
          <p className="text-indigo-400 font-black text-3xl tracking-[0.3em] mb-2 uppercase">Stream Nexus</p>
          <p className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.5em]">Establishing Proxy Tunnels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar - Hidden in Theater Mode */}
      <div className={`flex flex-col border-r border-white/5 transition-all duration-500 ease-in-out z-20 shadow-2xl bg-slate-950/80 backdrop-blur-3xl ${sidebarOpen && !isTheater ? 'w-80' : 'w-0 overflow-hidden'}`}>
        <div className="p-6 border-b border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 uppercase">Nexus</h1>
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
              <svg className="w-5 h-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="flex overflow-x-auto no-scrollbar pb-1 space-x-1.5">
            {availableSources.map(source => (
              <button 
                key={source}
                onClick={() => setActiveTab(source)}
                className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all whitespace-nowrap uppercase tracking-widest border ${activeTab === source ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'}`}
              >
                {source}
              </button>
            ))}
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder="Search feed..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
          {filteredChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => handleChannelSelect(channel)}
              className={`w-full text-left p-5 flex items-center space-x-4 hover:bg-indigo-600/5 transition-all group ${selectedChannel?.id === channel.id ? 'bg-indigo-600/10 border-l-2 border-indigo-500' : 'border-l-2 border-transparent'}`}
            >
              <div className="w-12 h-12 flex-shrink-0 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-white/5 group-hover:border-indigo-500/20 shadow-lg">
                <img src={channel.logo} alt="" className="w-full h-full object-contain p-2" loading="lazy" onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(channel.name)}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-black truncate leading-none ${selectedChannel?.id === channel.id ? 'text-indigo-400' : 'text-slate-200'}`}>{channel.name}</p>
                <p className="text-[9px] text-slate-500 font-black mt-2 uppercase tracking-widest">{channel.group || 'FEED'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 transition-all duration-500 relative">
        {/* Floating Exit Theater Button */}
        {isTheater && (
          <button 
            onClick={() => setIsTheater(false)}
            className="absolute top-6 left-6 z-50 p-3 bg-black/50 hover:bg-indigo-600 border border-white/10 rounded-2xl text-white backdrop-blur-md transition-all group"
            title="Exit Theater Mode"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-500 whitespace-nowrap text-xs font-black uppercase tracking-widest">Exit Theater</span>
          </button>
        )}

        <header className={`h-16 border-b border-white/5 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur-md sticky top-0 z-10 transition-all ${isTheater ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
          <div className="flex items-center space-x-4">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-all border border-white/5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            )}
            <div className="flex flex-col">
               <h2 className="text-sm font-black truncate max-w-lg tracking-tight uppercase">{selectedChannel?.name || 'Awaiting Signal'}</h2>
               {selectedChannel && <p className="text-[9px] text-indigo-400 font-mono font-black uppercase tracking-widest">Linked via {selectedChannel.source}</p>}
            </div>
          </div>
          <button onClick={fetchPlaylists} className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl border border-white/5 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </header>

        <main className={`flex-1 overflow-y-auto transition-all duration-500 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-slate-950 to-slate-950 ${isTheater ? 'p-0' : 'p-6 md:p-12'}`}>
          {selectedChannel ? (
            <div className={`mx-auto w-full space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 ${isTheater ? 'max-w-full' : 'max-w-6xl'}`}>
              <div className={`transition-all duration-500 ${isTheater ? 'w-full h-[calc(100vh-2px)] bg-black flex items-center justify-center' : ''}`}>
                <VideoPlayer 
                  url={selectedChannel.url} 
                  poster={selectedChannel.logo} 
                  isTheater={isTheater} 
                  onToggleTheater={() => setIsTheater(!isTheater)} 
                />
              </div>

              {!isTheater && (
                <div className="w-full animate-in fade-in duration-700 delay-300">
                  <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-10 backdrop-blur-md shadow-2xl">
                    <div className="flex flex-col md:flex-row md:items-center space-y-6 md:space-y-0 md:space-x-10">
                      <div className="w-32 h-32 bg-slate-950 rounded-3xl border border-white/10 flex items-center justify-center p-6 shadow-2xl group hover:border-indigo-500/30 transition-all duration-500">
                        <img src={selectedChannel.logo} className="max-w-full max-h-full object-contain filter drop-shadow-lg" alt="" onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(selectedChannel.name)}`} />
                      </div>
                      <div className="space-y-4 flex-1">
                        <h3 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-none uppercase">{selectedChannel.name}</h3>
                        <div className="flex flex-wrap gap-3">
                          <span className="bg-indigo-500/10 text-indigo-400 px-5 py-2 rounded-full text-[10px] font-black border border-indigo-500/20 uppercase tracking-[0.2em]">{selectedChannel.group}</span>
                          <span className="bg-emerald-500/10 text-emerald-400 px-5 py-2 rounded-full text-[10px] font-black border border-emerald-500/20 uppercase tracking-[0.2em]">{selectedChannel.source} NET</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                       {[
                         { l: 'Encryption', v: 'AES-128', c: 'text-slate-400' },
                         { l: 'Bitrate', v: 'Variable HD', c: 'text-indigo-400' },
                         { l: 'Codec', v: 'H.264/AVC', c: 'text-slate-400' },
                         { l: 'Uptime', v: '99.9%', c: 'text-green-500' }
                       ].map((item, i) => (
                         <div key={i} className="bg-slate-950/40 rounded-2xl p-6 border border-white/5">
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">{item.l}</p>
                            <p className={`text-xs font-black uppercase ${item.c}`}>{item.v}</p>
                         </div>
                       ))}
                    </div>
                  </div>
                  <div className="h-20"></div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-800">
               <div className="w-48 h-48 bg-slate-900/50 rounded-[3rem] border border-white/5 flex items-center justify-center mb-10 group transition-all duration-700 hover:bg-slate-900 hover:border-indigo-500/20">
                  <svg className="h-20 w-20 opacity-5 group-hover:opacity-10 transition-all duration-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.343 5.858c5.858-5.858 15.355-5.858 21.213 0" /></svg>
               </div>
               <h3 className="text-xs font-black uppercase tracking-[0.8em] text-slate-700 animate-pulse">Select Signal Input</h3>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
