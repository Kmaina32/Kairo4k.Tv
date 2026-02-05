// Standard React import to resolve JSX intrinsic elements namespace issues
import * as React from 'react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Channel } from './types';
import { DEFAULT_PLAYLISTS, PROXY_OPTIONS, NASA_CHANNELS } from './constants';
import { parseM3U } from './services/m3uParser';
import { getChannelInsight } from './services/geminiService';

// Individual Components
import VideoPlayer from './components/VideoPlayer';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChannelInsight from './components/ChannelInsight';
import LoadingScreen from './components/LoadingScreen';
import MobileNav from './components/MobileNav';

// Use React wildcard import to ensure JSX intrinsic elements are recognized correctly
const App: React.FC = () => {
  // Initialize with local channels to avoid empty start
  const [channels, setChannels] = useState<Channel[]>(NASA_CHANNELS);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('Distro');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024);
  const [isTheater, setIsTheater] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>('');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      setAiInsight('Signal frequency analysis in progress...');
      getChannelInsight(selectedChannel.name, selectedChannel.group)
        .then(res => setAiInsight(res))
        .catch(() => setAiInsight('Unable to establish AI insight uplink.'));
    } else {
      setAiInsight('');
    }
  }, [selectedChannel]);

  const availableSources = useMemo(() => {
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
        
        // Use a timeout to avoid hanging on dead proxies
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(finalUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) continue;

        let text = await res.text();
        
        // Handle AllOrigins JSON wrapper if raw fails
        if (proxy.includes('allorigins') && !text.includes('#EXTM3U')) {
          try {
            const json = JSON.parse(text);
            text = json.contents || text;
          } catch(e) {}
        }

        // Validate content is actually an M3U playlist
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

  const loadAllFeeds = useCallback(async (isInitial = false) => {
    if (isInitial) {
      // Short delay to let the loading screen pulse once, then enter
      setTimeout(() => setIsLoading(false), 1200);
    } else {
      setIsRefreshing(true);
    }
    
    setError(null);
    
    // Background fetch each source individually to avoid blocking
    // Using individual promises to update UI as they arrive
    DEFAULT_PLAYLISTS.forEach(async (p) => {
      if (!p.url) return;
      try {
        const text = await fetchWithFallback(p.url);
        const parsed = parseM3U(text, p.name);
        if (parsed.length > 0) {
          setChannels(prev => {
            // Filter out existing channels from this source to avoid duplicates on refresh
            const otherSources = prev.filter(c => c.source !== p.name);
            return [...otherSources, ...parsed];
          });
        }
      } catch (e) {
        console.error(`Failed to fetch signal node: ${p.name}`, e);
      }
    });

    // Cleanup refreshing state after a reasonable time for background tasks
    if (!isInitial) {
      setTimeout(() => setIsRefreshing(false), 3000);
    }
  }, []);

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

  useEffect(() => {
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
      
      {/* Sidebar Overlay (Mobile) */}
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

      {/* Main Signal Bridge */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
        <Header 
          isTheater={isTheater}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={setSidebarOpen}
          title={selectedChannel?.name || 'K 4k Uplink Ready'}
          isRefreshing={isRefreshing}
          onRefresh={() => loadAllFeeds()}
        />

        <main className={`flex-1 overflow-y-auto pb-24 lg:pb-8 relative transition-all duration-700 ${isTheater ? 'p-0' : 'p-4 md:p-8 lg:p-12'}`}>
          {selectedChannel ? (
            <div className={`mx-auto w-full transition-all duration-700 ${isTheater ? 'max-w-full h-full flex items-center justify-center bg-black' : 'max-w-5xl space-y-12'}`}>
              <div className={`transition-all duration-700 ${isTheater ? 'w-full h-full' : 'relative rounded-3xl md:rounded-[3rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] ring-1 ring-white/10'}`}>
                <VideoPlayer 
                  url={selectedChannel.url} 
                  poster={selectedChannel.logo} 
                  isTheater={isTheater} 
                  onToggleTheater={toggleTheater} 
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
                          <span className="bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full text-[10px] font-black border border-emerald-500/20 uppercase tracking-[0.2em]">4K Ultra Signal</span>
                        </div>
                        
                        <ChannelInsight insight={aiInsight} />
                      </div>
                   </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
               <div className="text-8xl font-black italic tracking-tighter text-indigo-500/20 uppercase mb-12 select-none">K 4k</div>
               <p className="text-[11px] font-black uppercase tracking-[0.5em] text-indigo-400/50">Frequency Selection Required</p>
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