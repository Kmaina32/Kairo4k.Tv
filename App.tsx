
// Reverted to standard React import style to resolve JSX intrinsic element resolution issues in this environment.
import * as React from 'react';
import { Channel } from './types';
import { DEFAULT_PLAYLISTS, PROXY_OPTIONS, NASA_CHANNELS } from './constants';
import { parseM3U } from './services/m3uParser';

// Individual Components
import VideoPlayer from './components/VideoPlayer';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoadingScreen from './components/LoadingScreen';
import MobileNav from './components/MobileNav';

const App: React.FC = () => {
  const [channels, setChannels] = React.useState<Channel[]>(NASA_CHANNELS);
  const [selectedChannel, setSelectedChannel] = React.useState<Channel | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<string>('Distro');
  const [activeView, setActiveView] = React.useState<'live' | 'favorites' | 'account'>('live');
  const [sidebarOpen, setSidebarOpen] = React.useState(window.innerWidth > 1024);
  const [isTheater, setIsTheater] = React.useState(false);
  const [favorites, setFavorites] = React.useState<Channel[]>([]);
  const [showShareToast, setShowShareToast] = React.useState(false);

  // Derived sources for the sidebar and hub
  const availableSources = React.useMemo(() => {
    return DEFAULT_PLAYLISTS.map(p => p.name);
  }, []);

  // Handle source selection from the main hub
  const handleSourceSelect = (sourceName: string) => {
    setActiveTab(sourceName);
    setActiveView('live');
    setSelectedChannel(null);
  };

  // Load favorites from local storage
  React.useEffect(() => {
    const saved = localStorage.getItem('kairo_favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
  }, []);

  // Sync favorites to local storage
  React.useEffect(() => {
    localStorage.setItem('kairo_favorites', JSON.stringify(favorites));
  }, [favorites]);

  React.useEffect(() => {
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

  const fetchWithFallback = async (url: string): Promise<string> => {
    if (!url) return ''; 
    let lastError = null;

    for (const proxy of PROXY_OPTIONS) {
      try {
        const finalUrl = proxy === 'DIRECT' ? url : `${proxy}${encodeURIComponent(url)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(finalUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) continue;
        let text = await res.text();
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
    throw lastError || new Error("Uplink failed");
  };

  const loadAllFeeds = React.useCallback(async (isInitial = false) => {
    if (isInitial) setTimeout(() => setIsLoading(false), 1200);
    else setIsRefreshing(true);
    
    DEFAULT_PLAYLISTS.forEach(async (p) => {
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
    });

    if (!isInitial) setTimeout(() => setIsRefreshing(false), 3000);
  }, []);

  React.useEffect(() => { loadAllFeeds(true); }, [loadAllFeeds]);

  const filteredChannels = React.useMemo(() => {
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
  };

  const handleShare = async () => {
    if (!selectedChannel) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Kairo 4K - ${selectedChannel.name}`,
          text: `Streaming ${selectedChannel.name} live on Kairo 4K.`,
          url: url
        });
      } else {
        await navigator.clipboard.writeText(url);
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
          title={activeView === 'account' ? 'Uplink Account' : activeView === 'favorites' ? 'Saved Signals' : (selectedChannel?.name || 'Live Signals')}
          isRefreshing={isRefreshing}
          onRefresh={() => loadAllFeeds()}
        />

        <main className={`flex-1 overflow-y-auto pb-32 lg:pb-8 relative transition-all duration-700 ${isTheater ? 'p-0' : 'p-3 md:p-8 lg:p-12'}`}>
          
          {activeView === 'account' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-3xl text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8">
                  <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-3xl font-black shadow-2xl shadow-indigo-600/20 uppercase">K</div>
                  <div>
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic">Signal Operator</h2>
                    <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs mt-2">Status: Online | Uplink Verified</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Active Signals</h4>
                  <div className="text-4xl font-black">{channels.length}</div>
                </div>
                <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Saved Frequencies</h4>
                  <div className="text-4xl font-black">{favorites.length}</div>
                </div>
              </div>
              <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] space-y-6">
                <h4 className="text-xs font-black uppercase tracking-[0.4em] text-indigo-400">System Preferences</h4>
                <div className="space-y-4">
                  {['Low Latency Mode', 'High Dynamic Range', 'Automated Proxy Rotation', 'Background Signal Refresh'].map(opt => (
                    <div key={opt} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all cursor-pointer group">
                      <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">{opt}</span>
                      <div className="w-10 h-5 bg-indigo-600 rounded-full relative"><div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-md" /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeView === 'favorites' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="text-center md:text-left space-y-2">
                 <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">Your Signals</h2>
                 <p className="text-xs font-black uppercase tracking-[0.4em] text-indigo-400">Priority Frequency Node</p>
               </div>
               
               {favorites.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {favorites.map(fav => (
                      <button key={fav.id} onClick={() => handleChannelSelect(fav)} className="group bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all text-left relative overflow-hidden">
                        <div className="relative z-10 space-y-4">
                          <img src={fav.logo} className="w-12 h-12 object-contain bg-black rounded-xl p-2 border border-white/5" onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(fav.name)}`} />
                          <div className="space-y-1">
                            <h4 className="text-lg font-black uppercase tracking-tighter text-white truncate group-hover:text-indigo-400 transition-colors leading-tight">{fav.name}</h4>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">{fav.source}</p>
                          </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 text-7xl font-black text-white/5 uppercase italic group-hover:text-indigo-500/10 transition-colors">{fav.name[0]}</div>
                      </button>
                    ))}
                 </div>
               ) : (
                 <div className="py-24 text-center space-y-6 bg-slate-900/20 border border-dashed border-white/5 rounded-[3rem]">
                   <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                     <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" strokeWidth={2}/></svg>
                   </div>
                   <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">No signals saved to Priority Node</p>
                 </div>
               )}
            </div>
          )}

          {activeView === 'live' && (
            <div className={`mx-auto w-full transition-all duration-700 ${isTheater ? 'max-w-full h-full flex items-center justify-center bg-black' : 'max-w-5xl space-y-6 md:space-y-12'}`}>
              {selectedChannel ? (
                <>
                  <div className={`transition-all duration-700 ${isTheater ? 'w-full h-full' : 'relative rounded-2xl md:rounded-[3rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] ring-1 ring-white/10'}`}>
                    <VideoPlayer url={selectedChannel.url} poster={selectedChannel.logo} isTheater={isTheater} onToggleTheater={toggleTheater} channelName={selectedChannel.name} />
                  </div>
                  {!isTheater && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
                      <div className="p-6 md:p-12 bg-slate-900/40 border border-white/5 rounded-[2rem] md:rounded-[2.5rem] backdrop-blur-3xl">
                        <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-10">
                          <div className="w-20 h-20 md:w-32 md:h-32 bg-slate-950 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center p-4 md:p-6 border border-white/10 shadow-2xl shrink-0">
                            <img src={selectedChannel.logo} className="w-full h-full object-contain filter drop-shadow-lg" alt="" onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(selectedChannel.name)}`} />
                          </div>
                          <div className="space-y-4 min-w-0 flex-1 text-center md:text-left">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <h3 className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-none text-white truncate">{selectedChannel.name}</h3>
                              <div className="flex items-center justify-center md:justify-end space-x-2">
                                <button onClick={() => toggleFavorite(selectedChannel)} className={`p-3 rounded-2xl border transition-all active:scale-95 flex items-center space-x-2 ${isFavorite(selectedChannel) ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}>
                                  <svg className="w-5 h-5" fill={isFavorite(selectedChannel) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                  </svg>
                                  <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">{isFavorite(selectedChannel) ? 'Saved' : 'Save'}</span>
                                </button>
                                <button onClick={handleShare} className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 flex items-center space-x-2">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                    <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                  </svg>
                                  <span className="text-[9px] font-black uppercase tracking-widest">Share</span>
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap justify-center md:justify-start gap-3">
                              <span className="bg-indigo-500/10 text-indigo-400 px-4 py-1.5 rounded-full text-[9px] font-black border border-indigo-500/20 uppercase tracking-[0.2em]">{selectedChannel.source}</span>
                              <span className="bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full text-[9px] font-black border border-emerald-500/20 uppercase tracking-[0.2em]">Live 4K Uplink</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-8 md:p-12 bg-slate-900/40 border border-white/5 rounded-[2.5rem] space-y-8">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase tracking-[0.4em] text-indigo-400">Trending in node</h4>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {channels.slice(0, 4).map(c => (
                            <button key={c.id} onClick={() => handleChannelSelect(c)} className="group p-4 bg-black/40 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-all text-center space-y-3">
                              <div className="w-12 h-12 mx-auto bg-slate-900 rounded-xl flex items-center justify-center p-2"><img src={c.logo} className="w-full h-full object-contain" onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(c.name)}`} /></div>
                              <p className="text-[9px] font-black uppercase tracking-tighter truncate text-slate-400 group-hover:text-white transition-colors">{c.name}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-12 px-6">
                  <div className="text-center space-y-4 mb-12">
                    <div className="text-6xl md:text-8xl font-black italic tracking-tighter text-indigo-500/30 uppercase select-none">Kairo 4K</div>
                    <p className="text-xs md:text-sm font-black uppercase tracking-[0.4em] text-indigo-400/60">Uplink Signal Hub</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                    {DEFAULT_PLAYLISTS.map(source => (
                      <button key={source.name} onClick={() => handleSourceSelect(source.name)} className="group relative p-10 bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all text-left shadow-2xl">
                        <div className="relative z-10">
                          <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.828a5 5 0 010-7.07m7.07 0a5 5 0 010 7.07M3.343 21a11.96 11.96 0 010-18m17.314 0a11.96 11.96 0 010 18M12 13a1 1 0 110-2 1 1 0 010 2z" /></svg>
                          </div>
                          <span className="block text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 opacity-60">Frequency Node</span>
                          <h4 className="text-3xl font-black uppercase tracking-tighter text-white group-hover:text-indigo-400 transition-colors leading-none">{source.name}</h4>
                          <div className="mt-6 flex items-center space-x-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] group-hover:text-indigo-300 transition-colors">
                            <span>Access Signals</span>
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                          </div>
                        </div>
                        <div className="absolute -right-6 -bottom-6 text-[10rem] font-black text-white/5 uppercase italic group-hover:text-indigo-500/10 transition-colors pointer-events-none select-none">{source.name[0]}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        <MobileNav isTheater={isTheater} activeView={activeView} onViewChange={setActiveView} onSidebarOpen={() => setSidebarOpen(true)} />

        {/* Share Feedback Toast */}
        {showShareToast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 px-6 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 flex items-center space-x-3 border border-indigo-400">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
            <span className="text-xs font-black uppercase tracking-widest text-white">Signal link copied to clipboard</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
