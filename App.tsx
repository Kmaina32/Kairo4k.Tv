/**
 * Main application entry point for Kairo 4K.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Channel } from './types';
import { DEFAULT_PLAYLISTS, PROXY_OPTIONS, NASA_CHANNELS } from './constants';
import { parseM3U } from './services/m3uParser';

// Individual Components
import VideoPlayer from './components/VideoPlayer';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoadingScreen from './components/LoadingScreen';
import MobileNav from './components/MobileNav';

const App = () => {
  const [channels, setChannels] = useState<Channel[]>(NASA_CHANNELS);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('Distro');
  const [activeView, setActiveView] = useState<'live' | 'favorites' | 'account'>('live');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [isTheater, setIsTheater] = useState(false);
  const [favorites, setFavorites] = useState<Channel[]>([]);
  const [showShareToast, setShowShareToast] = useState(false);

  const availableSources = useMemo(() => DEFAULT_PLAYLISTS.map(p => p.name), []);

  // Persistent Favorites
  useEffect(() => {
    const saved = localStorage.getItem('kairo_favorites');
    if (saved) {
      try { setFavorites(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('kairo_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // DEEP LINKING FIX: Automatically select channel from URL ?channel=ID
  useEffect(() => {
    if (channels.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const channelId = params.get('channel');
      if (channelId && (!selectedChannel || selectedChannel.id !== channelId)) {
        const chan = channels.find(c => c.id === channelId);
        if (chan) {
          setSelectedChannel(chan);
          setActiveView('live');
          // Update tab to match the source of the linked channel for consistency
          setActiveTab(chan.source);
        }
      }
    }
  }, [channels, isLoading]); // Re-run when channels list is updated or loading finished

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleFavorite = (channel: Channel) => {
    setFavorites(prev => {
      const isFav = prev.some(f => f.url === channel.url);
      if (isFav) return prev.filter(f => f.url !== channel.url);
      return [...prev, channel];
    });
  };

  const isFavorite = (channel: Channel) => favorites.some(f => f.url === channel.url);

  // MULTI-USER FIX: Randomize proxy rotation to avoid shared rate limits
  const fetchWithFallback = async (url: string): Promise<string> => {
    if (!url) return '';
    let lastError = null;
    
    // Shuffle proxies for this specific request
    const shuffledProxies = [...PROXY_OPTIONS].sort(() => Math.random() - 0.5);

    for (const proxy of shuffledProxies) {
      try {
        const finalUrl = proxy === 'DIRECT' ? url : `${proxy}${encodeURIComponent(url)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // Faster timeout to rotate proxies
        
        const res = await fetch(finalUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) continue;
        let text = await res.text();
        
        // Handle JSON envelopes from AllOrigins
        if (proxy.includes('allorigins') && !text.includes('#EXTM3U')) {
          try { 
            const json = JSON.parse(text); 
            text = json.contents || text; 
          } catch(e) {}
        }
        
        if (text && (text.includes('#EXTM3U') || text.includes('#EXTINF'))) return text;
      } catch (e) { 
        lastError = e; 
      }
    }
    throw lastError || new Error("All uplinks congested.");
  };

  const loadAllFeeds = useCallback(async (isInitial = false) => {
    if (isInitial) setTimeout(() => setIsLoading(false), 1500);
    else setIsRefreshing(true);
    
    // Concurrent fetching for better performance
    await Promise.allSettled(DEFAULT_PLAYLISTS.map(async (p) => {
      if (!p.url) return;
      try {
        const text = await fetchWithFallback(p.url);
        const parsed = parseM3U(text, p.name);
        if (parsed.length > 0) {
          setChannels(prev => {
            const otherSources = prev.filter(c => c.source !== p.name);
            return [...otherSources, ...parsed];
          });
        }
      } catch (e) {}
    }));

    if (!isInitial) setIsRefreshing(false);
  }, []);

  useEffect(() => { loadAllFeeds(true); }, [loadAllFeeds]);

  const filteredChannels = useMemo(() => {
    const list = activeView === 'favorites' ? favorites : channels.filter(c => c.source === activeTab);
    return list.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.group.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [channels, activeTab, searchTerm, activeView, favorites]);

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    setActiveView('live');
    if (window.innerWidth < 1024) setSidebarOpen(false);
    
    // Update URL without refreshing to allow sharing current signal
    const newUrl = `${window.location.origin}${window.location.pathname}?channel=${channel.id}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleSourceSelect = (sourceName: string) => {
    setActiveTab(sourceName);
    setActiveView('live');
    setSelectedChannel(null);
  };

  const handleShare = async () => {
    if (!selectedChannel) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?channel=${selectedChannel.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Kairo 4K - Signal: ${selectedChannel.name}`,
          text: `Streaming ${selectedChannel.name} live. Join the uplink:`,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
      }
    } catch (e) {}
  };

  const toggleTheater = () => setIsTheater(prev => !prev);

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden relative selection:bg-indigo-500/30">
      
      {sidebarOpen && !isTheater && window.innerWidth < 1024 && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar 
        isOpen={sidebarOpen}
        isTheater={isTheater}
        onClose={() => setSidebarOpen(false)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        availableSources={availableSources}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        channels={filteredChannels}
        selectedChannelId={selectedChannel?.id}
        onChannelSelect={handleChannelSelect}
        toggleFavorite={toggleFavorite}
        isFavorite={isFavorite}
        activeView={activeView}
      />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
        <Header 
          isTheater={isTheater}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
          title={activeView === 'account' ? 'Uplink Operator' : activeView === 'favorites' ? 'Priority Signals' : (selectedChannel?.name || 'Signal Node')}
          isRefreshing={isRefreshing}
          onRefresh={() => loadAllFeeds()}
        />

        {/* MOBILE SCROLL FIX: Parent is overflow-y-auto */}
        <main className={`flex-1 overflow-y-auto pb-32 lg:pb-8 relative transition-all duration-700 ${isTheater ? 'p-0' : 'p-0 md:p-8 lg:p-12'} no-scrollbar`}>
          
          {activeView === 'account' && (
            <div className="max-w-4xl mx-auto space-y-8 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-3xl">
                <div className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8">
                  <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-3xl font-black shadow-2xl">K</div>
                  <div className="text-center md:text-left">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic">Signal Operator</h2>
                    <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs mt-2">Access Level: Premium | Node Status: Verified</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Total Signal Nodes</h4>
                  <div className="text-4xl font-black">{channels.length}</div>
                </div>
                <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Priority Saves</h4>
                  <div className="text-4xl font-black">{favorites.length}</div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'favorites' && (
            <div className="max-w-6xl mx-auto space-y-8 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">Priority Signals</h2>
               {favorites.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {favorites.map(fav => (
                      <button key={fav.id} onClick={() => handleChannelSelect(fav)} className="group bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all text-left relative overflow-hidden">
                        <img src={fav.logo} className="w-12 h-12 object-contain bg-black rounded-xl p-2 mb-4" onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(fav.name)}`} />
                        <h4 className="text-lg font-black uppercase text-white truncate">{fav.name}</h4>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{fav.source}</p>
                      </button>
                    ))}
                 </div>
               ) : (
                 <div className="py-24 text-center text-slate-500 uppercase font-black text-xs tracking-widest bg-slate-900/20 border border-dashed border-white/5 rounded-[3rem]">No priority signals locked in.</div>
               )}
            </div>
          )}

          {activeView === 'live' && (
            <div className={`mx-auto w-full transition-all duration-700 ${isTheater ? 'max-w-full h-full' : 'max-w-5xl'}`}>
              {selectedChannel ? (
                <div className="flex flex-col">
                  {/* STICKY VIDEO FIX: sticky on mobile, relative on desktop */}
                  <div className={`
                    z-[40] transition-all duration-700 bg-[#020617]
                    ${isTheater ? 'w-full h-full' : 'sticky top-0 md:relative md:rounded-[3rem] overflow-hidden shadow-2xl ring-1 ring-white/10'}
                  `}>
                    <VideoPlayer url={selectedChannel.url} poster={selectedChannel.logo} isTheater={isTheater} onToggleTheater={toggleTheater} channelName={selectedChannel.name} />
                  </div>

                  {!isTheater && (
                    <div className="p-6 md:p-0 md:mt-12 space-y-12 animate-in fade-in duration-700">
                      <div className="p-8 md:p-12 bg-slate-900/40 border border-white/5 rounded-[2.5rem] backdrop-blur-3xl">
                        <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-10">
                          <img src={selectedChannel.logo} className="w-24 h-24 md:w-32 md:h-32 object-contain p-4 bg-slate-950 rounded-[2rem] border border-white/10 shadow-2xl" alt="" onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(selectedChannel.name)}`} />
                          <div className="flex-1 text-center md:text-left space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <h3 className="text-3xl md:text-5xl font-black tracking-tighter uppercase text-white truncate">{selectedChannel.name}</h3>
                              <div className="flex items-center justify-center space-x-2">
                                <button onClick={() => toggleFavorite(selectedChannel)} className={`p-4 rounded-2xl border transition-all active:scale-90 ${isFavorite(selectedChannel) ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                                  <svg className="w-5 h-5" fill={isFavorite(selectedChannel) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" strokeWidth={2}/></svg>
                                </button>
                                <button onClick={handleShare} className="p-4 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all active:scale-90">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                </button>
                              </div>
                            </div>
                            <div className="flex justify-center md:justify-start gap-2">
                               <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded-full text-[9px] font-black border border-indigo-500/20 uppercase tracking-[0.2em]">{selectedChannel.source}</span>
                               <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full text-[9px] font-black border border-emerald-500/20 uppercase tracking-[0.2em]">Signal: Online</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-8 md:p-12 bg-slate-900/40 border border-white/5 rounded-[2.5rem] space-y-8 shadow-inner">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Node Frequencies</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {channels.slice(0, 8).map(c => (
                            <button key={c.id} onClick={() => handleChannelSelect(c)} className="group p-5 bg-black/40 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-all text-center space-y-3">
                              <img src={c.logo} className="w-10 h-10 mx-auto object-contain transition-transform group-hover:scale-110" onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(c.name)}`} />
                              <p className="text-[9px] font-black uppercase truncate text-slate-400 group-hover:text-white transition-colors">{c.name}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-6 space-y-16">
                  <div className="text-center">
                    <div className="text-6xl md:text-8xl font-black italic tracking-tighter text-indigo-500/20 uppercase select-none">Kairo 4K</div>
                    <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-indigo-400/60 mt-4">Premium Signal Aggregation Hub</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
                    {availableSources.map(name => (
                      <button key={name} onClick={() => handleSourceSelect(name)} className="group relative p-10 bg-slate-900/40 border border-white/5 rounded-[2.5rem] hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all text-left overflow-hidden shadow-2xl">
                        <div className="relative z-10">
                          <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-8 border border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-lg">
                            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth={2.5}/></svg>
                          </div>
                          <h4 className="text-2xl font-black uppercase text-white group-hover:text-indigo-400 transition-colors leading-none">{name}</h4>
                          <p className="text-[10px] font-bold text-slate-500 uppercase mt-4 tracking-widest">Connect to frequency</p>
                        </div>
                        <div className="absolute -right-6 -bottom-6 text-[10rem] font-black text-white/5 uppercase italic group-hover:text-indigo-500/10 transition-colors">{name[0]}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        <MobileNav isTheater={isTheater} activeView={activeView} onViewChange={setActiveView} onSidebarOpen={() => setSidebarOpen(true)} />

        {showShareToast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 px-8 py-4 rounded-2xl shadow-[0_20px_60px_rgba(79,70,229,0.5)] animate-in fade-in slide-in-from-bottom-4 flex items-center space-x-3 border border-indigo-400">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Frequency Link Encrypted & Copied</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;