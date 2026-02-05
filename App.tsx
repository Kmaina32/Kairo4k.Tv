// Changed React import to import * as React to ensure the JSX namespace and IntrinsicElements are correctly resolved.
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
  // Initialize with local channels to avoid empty start
  const [channels, setChannels] = React.useState<Channel[]>(NASA_CHANNELS);
  const [selectedChannel, setSelectedChannel] = React.useState<Channel | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<string>('Distro');
  const [sidebarOpen, setSidebarOpen] = React.useState(window.innerWidth > 1024);
  const [isTheater, setIsTheater] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const availableSources = React.useMemo(() => {
    const sources = Array.from(new Set(channels.map(c => c.source)));
    return sources.length > 0 ? sources.sort() : DEFAULT_PLAYLISTS.map(p => p.name).sort();
  }, [channels]);

  const fetchWithFallback = async (url: string): Promise<string> => {
    if (!url) return ''; 
    let lastError = null;

    for (const proxy of PROXY_OPTIONS) {
      try {
        const finalUrl = proxy === 'DIRECT' 
          ? url 
          : `${proxy}${encodeURIComponent(url)}`;
        
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

        if (text && (text.includes('#EXTM3U') || text.includes('#EXTINF'))) {
          return text;
        }
      } catch (e) {
        lastError = e;
        console.warn(`Proxy ${proxy} failed for ${url}:`, e);
      }
    }
    throw lastError || new Error("Connection failed across all uplink nodes.");
  };

  const loadAllFeeds = React.useCallback(async (isInitial = false) => {
    if (isInitial) {
      setTimeout(() => setIsLoading(false), 1200);
    } else {
      setIsRefreshing(true);
    }
    
    setError(null);
    
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
      } catch (e) {
        console.error(`Failed to fetch signal node: ${p.name}`, e);
      }
    });

    if (!isInitial) {
      setTimeout(() => setIsRefreshing(false), 3000);
    }
  }, []);

  React.useEffect(() => { 
    loadAllFeeds(true); 
  }, [loadAllFeeds]);

  const filteredChannels = React.useMemo(() => {
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

  const handleSourceSelect = (sourceName: string) => {
    setActiveTab(sourceName);
    setSidebarOpen(true);
  };

  const handleShare = async () => {
    if (!selectedChannel) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Kairo 4K - ${selectedChannel.name}`,
          text: `Watch ${selectedChannel.name} live on Kairo 4K`,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Signal link copied to clipboard');
      }
    } catch (e) { console.error(e); }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(prev => !prev);
      if (e.key === 'f') toggleTheater();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheater = () => setIsTheater(prev => !prev);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden relative selection:bg-indigo-500/30">
      
      {sidebarOpen && !isTheater && window.innerWidth < 1024 && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] transition-all" onClick={() => setSidebarOpen(false)} />
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
      />

      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
        <Header 
          isTheater={isTheater}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
          title={selectedChannel?.name || 'Kairo 4K Uplink'}
          isRefreshing={isRefreshing}
          onRefresh={() => loadAllFeeds()}
        />

        <main className={`flex-1 overflow-y-auto pb-24 lg:pb-8 relative transition-all duration-700 ${isTheater ? 'p-0' : 'p-2 md:p-8 lg:p-12'}`}>
          {selectedChannel ? (
            <div className={`mx-auto w-full transition-all duration-700 ${isTheater ? 'max-w-full h-full flex items-center justify-center bg-black' : 'max-w-5xl space-y-4 md:space-y-12'}`}>
              <div className={`transition-all duration-700 ${isTheater ? 'w-full h-full' : 'relative rounded-2xl md:rounded-[3rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] ring-1 ring-white/10'}`}>
                <VideoPlayer 
                  url={selectedChannel.url} 
                  poster={selectedChannel.logo} 
                  isTheater={isTheater} 
                  onToggleTheater={toggleTheater} 
                  channelName={selectedChannel.name}
                />
              </div>
              
              {!isTheater && (
                <div className="p-5 md:p-12 bg-slate-900/40 border border-white/5 rounded-[2rem] md:rounded-[2.5rem] backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-5 duration-700">
                   <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-10">
                      <div className="w-20 h-20 md:w-32 md:h-32 bg-slate-950 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center p-4 md:p-6 border border-white/10 shadow-2xl shrink-0">
                        <img src={selectedChannel.logo} className="w-full h-full object-contain filter drop-shadow-lg" alt="" onError={(e) => e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(selectedChannel.name)}`} />
                      </div>
                      <div className="space-y-3 md:space-y-4 min-w-0 flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                          <h3 className="text-2xl md:text-5xl font-black tracking-tighter uppercase leading-none text-white truncate">{selectedChannel.name}</h3>
                          <button onClick={handleShare} className="mx-auto md:mx-0 p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl md:rounded-2xl text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 flex items-center space-x-2">
                             <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                               <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                             </svg>
                             <span className="text-[9px] font-black uppercase tracking-widest">Share</span>
                          </button>
                        </div>
                        <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-3">
                          <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-[9px] font-black border border-indigo-500/20 uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/5">{selectedChannel.source}</span>
                          <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black border border-emerald-500/20 uppercase tracking-[0.2em]">4K Ultra Signal</span>
                        </div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full max-w-6xl mx-auto flex flex-col items-center justify-center py-12 px-6">
               <div className="text-center space-y-4 mb-12">
                  <div className="text-6xl md:text-8xl font-black italic tracking-tighter text-indigo-500/30 uppercase select-none">Kairo 4K</div>
                  <p className="text-xs md:text-sm font-black uppercase tracking-[0.4em] text-indigo-400/60">Uplink Signal Hub</p>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                  {DEFAULT_PLAYLISTS.map(source => (
                    <button 
                      key={source.name}
                      onClick={() => handleSourceSelect(source.name)}
                      className="group relative p-10 bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden hover:bg-indigo-600/10 hover:border-indigo-500/30 transition-all text-left shadow-2xl"
                    >
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                             <path d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.828a5 5 0 010-7.07m7.07 0a5 5 0 010 7.07M3.343 21a11.96 11.96 0 010-18m17.314 0a11.96 11.96 0 010 18M12 13a1 1 0 110-2 1 1 0 010 2z" />
                           </svg>
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
        </main>

        <MobileNav 
          isTheater={isTheater}
          onSidebarOpen={() => setSidebarOpen(true)}
        />
      </div>
    </div>
  );
};

export default App;