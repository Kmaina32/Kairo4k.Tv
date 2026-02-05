import React from 'react';
import { Channel } from './types';
import { DEFAULT_PLAYLISTS, PROXY_OPTIONS, NASA_CHANNELS } from './constants';
import { parseM3U } from './services/m3uParser';

// Individual Components
import VideoPlayer from './components/VideoPlayer';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoadingScreen from './components/LoadingScreen';
import MobileNav from './components/MobileNav';

const CHANNELS_PER_PAGE = 24;

const App = () => {
  const [channels, setChannels] = React.useState<Channel[]>(NASA_CHANNELS);
  const [selectedChannel, setSelectedChannel] = React.useState<Channel | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [loadingSources, setLoadingSources] = React.useState<Set<string>>(new Set());
  
  const [activeTab, setActiveTab] = React.useState<string | null>(null);
  const [activeView, setActiveView] = React.useState<'live' | 'favorites' | 'account'>('live');
  const [sidebarOpen, setSidebarOpen] = React.useState(false); 
  const [isTheater, setIsTheater] = React.useState(false);
  const [favorites, setFavorites] = React.useState<Channel[]>([]);
  const [visibleCount, setVisibleCount] = React.useState(CHANNELS_PER_PAGE);

  const availableSources = React.useMemo(() => DEFAULT_PLAYLISTS.map(p => p.name), []);

  React.useEffect(() => {
    const saved = localStorage.getItem('kairo_favorites');
    if (saved) {
      try { setFavorites(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('kairo_favorites', JSON.stringify(favorites));
  }, [favorites]);

  React.useEffect(() => {
    if (!isLoading && channels.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const channelId = params.get('channel');
      if (channelId) {
        const chan = channels.find(c => c.id === channelId);
        if (chan) {
          setSelectedChannel(chan);
          setActiveTab(chan.source);
          setActiveView('live');
        }
      }
    }
  }, [channels, isLoading]);

  const toggleFavorite = (channel: Channel) => {
    setFavorites(prev => {
      const isFav = prev.some(f => f.url === channel.url);
      if (isFav) return prev.filter(f => f.url !== channel.url);
      return [...prev, channel];
    });
  };

  const isFavorite = (channel: Channel) => favorites.some(f => f.url === channel.url);

  const fetchWithFallback = async (url: string): Promise<string> => {
    if (!url) return '';
    const shuffledProxies = [...PROXY_OPTIONS].sort(() => Math.random() - 0.5);
    for (const proxy of shuffledProxies) {
      try {
        const finalUrl = proxy === 'DIRECT' ? url : `${proxy}${encodeURIComponent(url)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(finalUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) continue;
        let text = await res.text();
        if (proxy.includes('allorigins') && !text.includes('#EXTM3U')) {
          try { const json = JSON.parse(text); text = json.contents || text; } catch(e) {}
        }
        if (text && (text.includes('#EXTM3U') || text.includes('#EXTINF'))) return text;
      } catch (e) {}
    }
    return '';
  };

  const loadAllFeeds = React.useCallback(async (isInitial = false) => {
    if (isInitial) setTimeout(() => setIsLoading(false), 2000);
    else setIsRefreshing(true);
    
    DEFAULT_PLAYLISTS.forEach(async (p) => {
      if (!p.url) return;
      setLoadingSources(prev => new Set(prev).add(p.name));
      try {
        const text = await fetchWithFallback(p.url);
        const parsed = parseM3U(text, p.name);
        if (parsed.length > 0) {
          setChannels(prev => {
            const otherSources = prev.filter(c => c.source !== p.name);
            return [...otherSources, ...parsed];
          });
        }
      } catch (e) {
        console.error(`Failed to load ${p.name}`);
      } finally {
        setLoadingSources(prev => {
          const next = new Set(prev);
          next.delete(p.name);
          return next;
        });
      }
    });

    if (!isInitial) setIsRefreshing(false);
  }, []);

  React.useEffect(() => { loadAllFeeds(true); }, [loadAllFeeds]);

  const filteredChannels = React.useMemo(() => {
    let list = channels;
    if (activeView === 'favorites') list = favorites;
    else if (activeTab) list = channels.filter(c => c.source === activeTab);
    
    return list.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.group.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [channels, activeTab, searchTerm, activeView, favorites]);

  const currentChannelsSlice = React.useMemo(() => {
    return filteredChannels.slice(0, visibleCount);
  }, [filteredChannels, visibleCount]);

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    setActiveView('live');
    const newUrl = `${window.location.origin}${window.location.pathname}?channel=${channel.id}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleSourceSelect = (sourceName: string) => {
    setActiveTab(sourceName);
    setSelectedChannel(null);
    setActiveView('live');
    setVisibleCount(CHANNELS_PER_PAGE);
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-slate-100 overflow-hidden relative">
      
      <Header 
        isTheater={isTheater}
        sidebarOpen={sidebarOpen}
        onSidebarToggle={setSidebarOpen}
        title={activeView === 'account' ? 'Operator' : activeView === 'favorites' ? 'Priority' : (selectedChannel?.name || activeTab || 'Hub')}
        isRefreshing={isRefreshing}
        onRefresh={() => loadAllFeeds()}
      />

      <div className="flex flex-1 min-h-0 relative">
        <Sidebar 
          isOpen={sidebarOpen}
          isTheater={isTheater}
          activeView={activeView}
          onViewChange={setActiveView}
          onHubClick={() => { setActiveTab(null); setSelectedChannel(null); setActiveView('live'); }}
          availableSources={availableSources}
          activeTab={activeTab}
          onSourceSelect={handleSourceSelect}
          onClose={() => setSidebarOpen(false)}
          channels={channels}
          onChannelSelect={handleChannelSelect}
        />

        <main className={`flex-1 overflow-y-auto pb-32 lg:pb-8 relative transition-all duration-700 ${isTheater ? 'p-0' : 'p-4 md:p-8 lg:p-10'} no-scrollbar bg-slate-950/20`}>
          
          {activeView === 'account' && (
            <div className="max-w-4xl mx-auto space-y-8 p-4 animate-in fade-in zoom-in-95">
              <div className="bg-slate-900/60 border border-white/10 p-8 md:p-12 rounded-[2rem] md:rounded-[3.5rem] backdrop-blur-3xl flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-12 shadow-2xl">
                <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-black shadow-xl border border-indigo-400/30">K</div>
                <div className="text-center md:text-left">
                  <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic leading-none">Operator</h2>
                  <p className="text-indigo-400 font-bold uppercase tracking-[0.4em] text-[10px] mt-3">Connection: Secure</p>
                </div>
              </div>
            </div>
          )}

          {activeView === 'favorites' && (
            <div className="max-w-7xl mx-auto space-y-8 md:space-y-12 p-4 animate-in fade-in slide-in-from-bottom-6">
               <h2 className="text-4xl md:text-6xl lg:text-8xl font-black italic tracking-tighter uppercase leading-none">Priority</h2>
               {favorites.length > 0 ? (
                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                    {favorites.map(fav => (
                      <button 
                        key={fav.id} 
                        onClick={() => handleChannelSelect(fav)} 
                        className="group relative bg-slate-900/40 border border-white/5 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] hover:scale-[1.05] transition-all text-left overflow-hidden shadow-lg h-44 md:h-60"
                      >
                         <div 
                           className="absolute inset-0 opacity-15 grayscale blur-[1px] scale-110 group-hover:opacity-40 transition-opacity" 
                           style={{ backgroundImage: `url(${fav.logo})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                         />
                         <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                         <div className="relative z-10 h-full flex flex-col justify-between">
                            <img src={fav.logo} className="w-10 h-10 md:w-16 md:h-16 object-contain bg-black/40 rounded-xl p-2 mb-4 shadow-xl border border-white/10" alt={fav.name} onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(fav.name)}`} />
                            <div>
                                <h4 className="text-[10px] md:text-sm font-black uppercase text-white truncate drop-shadow-md">{fav.name}</h4>
                                <p className="text-[7px] md:text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{fav.source}</p>
                            </div>
                         </div>
                      </button>
                    ))}
                 </div>
               ) : (
                 <div className="py-24 text-center text-slate-700 uppercase font-black text-[10px] tracking-[0.6em] bg-slate-900/10 border border-dashed border-white/10 rounded-[3rem]">No Locked Frequencies</div>
               )}
            </div>
          )}

          {activeView === 'live' && (
            <div className={`mx-auto w-full transition-all duration-700 ${isTheater ? 'max-w-full h-full' : 'max-w-7xl'}`}>
              {selectedChannel ? (
                <div className="flex flex-col">
                  <div className={`z-[40] bg-slate-950 transition-all duration-700 ${isTheater ? 'w-full h-full' : 'sticky top-0 md:relative md:rounded-[2rem] lg:rounded-[3rem] overflow-hidden shadow-2xl ring-1 ring-white/10 mb-6 md:mb-10'}`}>
                    <VideoPlayer url={selectedChannel.url} poster={selectedChannel.logo} isTheater={isTheater} onToggleTheater={() => setIsTheater(!isTheater)} channelName={selectedChannel.name} />
                  </div>

                  {!isTheater && (
                    <div className="p-2 md:p-0 space-y-8 animate-in fade-in slide-in-from-bottom-8">
                      <div className="p-6 md:p-10 lg:p-14 bg-slate-900/40 border border-white/5 rounded-[2rem] md:rounded-[4rem] backdrop-blur-3xl flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-12">
                        <img src={selectedChannel.logo} className="w-24 h-24 md:w-32 md:h-32 lg:w-44 lg:h-44 object-contain p-4 md:p-6 bg-slate-950 rounded-[1.5rem] md:rounded-[3rem] border border-white/10 shadow-xl" alt={selectedChannel.name} onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(selectedChannel.name)}`} />
                        <div className="flex-1 text-center md:text-left space-y-4 md:space-y-6">
                          <h3 className="text-3xl md:text-5xl lg:text-7xl font-black tracking-tighter uppercase text-white leading-tight">{selectedChannel.name}</h3>
                          <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4">
                             <span className="bg-indigo-500/10 text-indigo-400 px-4 py-2 md:px-6 md:py-3 rounded-full text-[10px] font-black border border-indigo-500/20 uppercase tracking-[0.3em]">{selectedChannel.source}</span>
                             <button onClick={() => toggleFavorite(selectedChannel)} className={`px-4 py-2 md:px-6 md:py-3 rounded-full text-[10px] font-black border uppercase tracking-[0.3em] transition-all ${isFavorite(selectedChannel) ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                               {isFavorite(selectedChannel) ? 'LOCKED' : 'PRIORITY'}
                             </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab ? (
                <div className="p-4 md:p-0 space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-8">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-10">
                    <div className="space-y-3 md:space-y-6">
                       <button onClick={() => setActiveTab(null)} className="flex items-center space-x-3 text-indigo-400 font-black uppercase tracking-[0.3em] text-[10px] mb-4 hover:translate-x-[-8px] transition-transform group">
                         <svg className="w-4 h-4 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}><path d="M15 19l-7-7 7-7" /></svg>
                         <span>Frequency Hub</span>
                       </button>
                       <h2 className="text-4xl md:text-6xl lg:text-8xl font-black italic tracking-tighter uppercase leading-none">{activeTab}</h2>
                       {loadingSources.has(activeTab) && (
                         <div className="flex items-center space-x-3 animate-pulse">
                           <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                           <p className="text-indigo-400 font-bold uppercase tracking-[0.3em] text-[9px]">Scanning Node...</p>
                         </div>
                       )}
                    </div>
                    <div className="relative w-full max-w-sm">
                      <input 
                        type="text" 
                        placeholder="FILTER NODE..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/60 border border-white/10 rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                  </div>
                  
                  {filteredChannels.length === 0 && !loadingSources.has(activeTab) ? (
                    <div className="py-24 text-center text-slate-700 uppercase font-black text-[10px] tracking-[0.6em] bg-slate-900/10 border border-dashed border-white/10 rounded-[3rem]">No Signals Detected</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                      {currentChannelsSlice.map(channel => (
                        <button 
                          key={channel.id} 
                          onClick={() => handleChannelSelect(channel)} 
                          className="group relative rounded-[1.5rem] md:rounded-[2.5rem] transition-all text-left overflow-hidden shadow-lg border border-white/5 h-44 md:h-60"
                        >
                           <div 
                              className="absolute inset-0 opacity-10 grayscale scale-110 group-hover:scale-125 group-hover:opacity-30 transition-all duration-700"
                              style={{ backgroundImage: `url(${channel.logo})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                           
                           <div className="relative z-10 h-full flex flex-col justify-between p-6">
                              <div className="w-10 h-10 md:w-14 md:h-14 bg-black/40 rounded-xl p-2 border border-white/10 flex items-center justify-center overflow-hidden">
                                <img src={channel.logo} className="w-full h-full object-contain" alt="" onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(channel.name)}`} />
                              </div>
                              <div>
                                <h4 className="text-[10px] md:text-sm font-black uppercase text-white leading-tight mb-1 truncate drop-shadow-lg">{channel.name}</h4>
                                <p className="text-[7px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{channel.group}</p>
                              </div>
                           </div>
                           <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors pointer-events-none" />
                        </button>
                      ))}
                    </div>
                  )}

                  {visibleCount < filteredChannels.length && (
                    <div className="flex justify-center pt-10 md:pt-16">
                      <button 
                        onClick={() => setVisibleCount(prev => prev + CHANNELS_PER_PAGE)}
                        className="px-10 py-4 bg-indigo-600 rounded-full text-white font-black uppercase tracking-[0.4em] text-[10px] shadow-xl hover:scale-105 transition-all active:scale-95"
                      >
                        Expand Frequencies
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-4 space-y-16 py-20">
                  <div className="text-center space-y-4 md:space-y-6">
                    <div className="text-6xl md:text-8xl lg:text-[10rem] font-black italic tracking-tighter text-white uppercase select-none kairo-shimmer leading-none">Nodes</div>
                    <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.6em] text-indigo-400/80">Select Frequency Node</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10 w-full max-w-6xl">
                    {availableSources.map(name => (
                      <button key={name} onClick={() => handleSourceSelect(name)} className="group relative p-8 md:p-12 bg-slate-900/40 border border-white/10 rounded-[2rem] md:rounded-[3.5rem] hover:bg-indigo-600/20 hover:border-indigo-500/40 hover:scale-[1.05] transition-all text-left overflow-hidden shadow-xl">
                        <div className="relative z-10">
                          <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600/30 rounded-[1.2rem] md:rounded-[2rem] flex items-center justify-center mb-8 md:mb-12 border border-indigo-500/40 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-lg">
                            <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          </div>
                          <h4 className="text-2xl md:text-3xl font-black uppercase text-white leading-none mb-4 group-hover:text-indigo-400 transition-colors">{name}</h4>
                          <div className="flex items-center space-x-3">
                            <div className={`w-2 h-2 rounded-full ${loadingSources.has(name) ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`} />
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">{loadingSources.has(name) ? 'Scanning...' : 'Ready'}</p>
                          </div>
                        </div>
                        <div className="absolute -right-8 -bottom-8 text-[12rem] md:text-[18rem] font-black text-white/5 uppercase italic group-hover:text-indigo-500/10 transition-all select-none">{name[0]}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      
      <MobileNav 
        isTheater={isTheater} 
        activeView={activeView} 
        onViewChange={setActiveView} 
        onSidebarOpen={() => setSidebarOpen(true)} 
      />
    </div>
  );
};

export default App;