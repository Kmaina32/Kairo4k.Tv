
import React, { useState, useEffect, useRef } from 'react';
import { Channel, ProxyStatus, UserProfile, CloudStats } from './types';
import { DEFAULT_PLAYLISTS, PROXY_OPTIONS, NASA_CHANNELS, CACHE_TTL } from './constants';
import { parseM3U } from './services/m3uParser';
import { cloudService } from './services/cloudService';

// Aero-Flow Components
import VideoPlayer from './components/VideoPlayer';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoadingScreen from './components/LoadingScreen';
import MobileNav from './components/MobileNav';

const CHANNELS_PER_PAGE = 60;

const App = () => {
  // Shared State
  const [channels, setChannels] = useState<Channel[]>(NASA_CHANNELS);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('Free Live Sports');
  const [activeView, setActiveView] = useState<'live' | 'favorites' | 'account'>('live');
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  const [isTheater, setIsTheater] = useState(false);
  const [favorites, setFavorites] = useState<Channel[]>([]);
  const [visibleCount, setVisibleCount] = useState(CHANNELS_PER_PAGE);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const [proxyHealth, setProxyHealth] = useState<ProxyStatus[]>(
    PROXY_OPTIONS.map(url => ({ url, status: 'healthy', latency: 0 }))
  );
  const [cloudStats, setCloudStats] = useState<CloudStats | null>(null);

  const mainRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasAutoPlayedRef = useRef(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const boot = async () => {
      setTimeout(() => setIsLoading(false), 1200);
      cloudService.getSystemStatus().then(setCloudStats);
      
      const promises = DEFAULT_PLAYLISTS
        .filter(p => p.url !== '')
        .map(p => fetchWithFallback(p.url, p.name).then(text => {
          if (!text) return;
          const parsed = parseM3U(text, p.name);
          if (parsed.length > 0) {
            setChannels(prev => {
              const others = prev.filter(c => c.source !== p.name);
              const updated = [...others, ...parsed];
              
              // AUTO-PLAY LOGIC: First load 'Free Live Sports' and pick 'Big 12 Network'
              if (p.name === 'Free Live Sports' && !hasAutoPlayedRef.current) {
                const big12 = parsed.find(c => 
                  c.name.toLowerCase().includes('big 12 network') || 
                  c.name.toLowerCase().includes('big 12')
                );
                if (big12) {
                  setSelectedChannel(big12);
                  hasAutoPlayedRef.current = true;
                } else if (!selectedChannel) {
                  setSelectedChannel(parsed[0]);
                  hasAutoPlayedRef.current = true;
                }
              }
              
              return updated;
            });
          }
        }));
      
      await Promise.allSettled(promises);
    };
    boot();
  }, []);

  const fetchWithFallback = async (url: string, sourceName: string): Promise<string> => {
    if (!url) return '';
    
    if (url.startsWith('data:')) {
      try {
        const response = await fetch(url);
        return await response.text();
      } catch (e) {
        return '';
      }
    }

    const cacheKey = `kairo_cache_${sourceName}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) return data;
    }
    const shuffled = [...proxyHealth].sort((a, b) => (a.status === 'healthy' ? -1 : 1));
    for (const proxy of shuffled) {
      try {
        const res = await fetch(`${proxy.url}${encodeURIComponent(url)}`);
        if (res.ok) {
          const text = await res.text();
          if (text.includes('#EXTM3U') || text.includes('#EXTINF')) {
            localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: text }));
            return text;
          }
        }
      } catch (e) {}
    }
    return '';
  };

  useEffect(() => {
    const saved = localStorage.getItem('kairo_favorites');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('kairo_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    if (activeView !== 'live') setActiveView('live');
    if (isMobile) setSidebarOpen(false);
    
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleFavorite = (e: React.MouseEvent, channel: Channel) => {
    e.stopPropagation();
    const isFav = favorites.some(f => f.id === channel.id);
    if (isFav) {
      setFavorites(prev => prev.filter(f => f.id !== channel.id));
    } else {
      setFavorites(prev => [...prev, channel]);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (isLoading) return <LoadingScreen />;

  const filteredChannels = channels
    .filter(c => c.source === activeTab && c.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, visibleCount);

  const ChannelCard = ({ channel }: { channel: Channel }) => (
    <div className="relative group h-60">
      <button 
        onClick={() => handleChannelSelect(channel)} 
        className={`w-full h-full relative bg-[#020617] border-2 rounded-[32px] transition-all overflow-hidden text-left ${selectedChannel?.id === channel.id ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-white/5 hover:border-white/20'}`}
      >
        <div 
          className="absolute inset-0 opacity-90 transition-all duration-700 group-hover:scale-110" 
          style={{ 
            backgroundImage: `url(${channel.logo})`, 
            backgroundSize: 'cover', 
            backgroundPosition: 'center',
            filter: 'contrast(1.1) brightness(0.6)' 
          }} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/90 via-transparent to-transparent z-10" />
        <div className="relative z-20 h-full flex flex-col justify-between p-6">
          <div className="w-14 h-14 bg-black/80 rounded-2xl flex items-center justify-center p-2 border border-white/10 shadow-2xl backdrop-blur-md">
            <img src={channel.logo} className="w-full h-full object-contain" alt="" onError={(e) => e.currentTarget.src='https://api.dicebear.com/7.x/identicon/svg?seed='+channel.name} />
          </div>
          <div>
            <span className="text-[8px] font-black uppercase text-indigo-400 tracking-[0.2em] mb-1 block opacity-60">
              {channel.source}
            </span>
            <h4 className="text-[11px] font-black uppercase text-white truncate pr-16 tracking-[0.15em] drop-shadow-lg">
              {channel.name}
            </h4>
          </div>
        </div>
      </button>
      <button 
        onClick={(e) => toggleFavorite(e, channel)}
        className={`absolute bottom-6 right-6 z-30 w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${favorites.some(f => f.id === channel.id) ? 'bg-indigo-600 text-white shadow-xl' : 'bg-white/10 text-white/40 hover:text-white hover:bg-white/20 backdrop-blur-md'}`}
      >
        <svg className="w-5 h-5" fill={favorites.some(f => f.id === channel.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
      </button>
    </div>
  );

  const DesktopLayout = () => (
    <div className="flex flex-col h-screen bg-[#020617] text-slate-100 overflow-hidden">
      <Header isTheater={isTheater} sidebarOpen={false} onSidebarToggle={() => {}} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeView={activeView} onViewChange={setActiveView} isOpen={true} />
        <main ref={mainRef} className="flex-1 overflow-y-auto px-10 py-8 pb-32 no-scrollbar bg-slate-950/20">
          <div className="mx-auto w-full max-w-[1700px]">
            {selectedChannel && (
              <div className={`mb-12 animate-in fade-in duration-700 ${isTheater ? 'fixed inset-0 z-[300] bg-black m-0' : ''}`}>
                <div className={`shadow-2xl border border-white/5 bg-black overflow-hidden ${isTheater ? 'rounded-0 h-screen' : 'rounded-[40px] aspect-video w-full'}`}>
                  <VideoPlayer url={selectedChannel.url} poster={selectedChannel.logo} isTheater={isTheater} onToggleTheater={() => setIsTheater(!isTheater)} channelName={selectedChannel.name} />
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 mb-10 h-14">
              <div className="relative h-full w-80" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                  className="h-full w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 flex items-center justify-between hover:bg-white/[0.05] transition-all"
                >
                  <span className="text-[11px] font-black uppercase tracking-widest truncate text-slate-300">
                    {activeTab || 'SELECT SOURCE'}
                  </span>
                  <svg className={`w-4 h-4 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M19 9l-7 7-7-7" /></svg>
                </button>
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl p-2 shadow-2xl z-[200] backdrop-blur-xl">
                    <div className="max-h-[35vh] overflow-y-auto no-scrollbar">
                      {DEFAULT_PLAYLISTS.map(s => (
                        <button key={s.name} onClick={() => { setActiveTab(s.name); setIsDropdownOpen(false); }} className={`w-full px-4 py-3 rounded-xl text-left transition-all text-[10px] font-black uppercase tracking-widest mb-1 ${activeTab === s.name ? 'bg-indigo-600 text-white' : 'hover:bg-white/5 text-slate-400'}`}>
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1 h-full relative">
                <input 
                  type="text" 
                  placeholder="SEARCH SIGNALS..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="h-full w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 text-[11px] font-black uppercase tracking-[0.2em] text-white outline-none focus:border-indigo-500/40 focus:bg-white/[0.06] transition-all" 
                />
              </div>
            </div>
            {activeView === 'live' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {filteredChannels.length > 0 ? filteredChannels.map(ch => (
                  <ChannelCard key={ch.id} channel={ch} />
                )) : (
                  <div className="col-span-full py-20 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">
                      No signals found in this sector
                    </p>
                  </div>
                )}
              </div>
            )}
            {activeView === 'favorites' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {favorites.map(ch => (
                  <ChannelCard key={ch.id} channel={ch} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );

  const MobileLayout = () => (
    <div className="flex flex-col h-screen bg-[#020617] text-slate-100 overflow-hidden">
      <Header isTheater={false} sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />
      
      {selectedChannel && (
        <div className="flex-shrink-0 z-[60] sticky top-0 bg-[#020617] p-2 border-b border-white/5 shadow-xl">
          <div className="rounded-[24px] overflow-hidden shadow-2xl border border-white/10 bg-black aspect-[16/12]">
            <VideoPlayer url={selectedChannel.url} poster={selectedChannel.logo} isTheater={false} onToggleTheater={() => {}} channelName={selectedChannel.name} />
          </div>
        </div>
      )}

      {sidebarOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[400]" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 w-72 bg-[#020617] z-[500] transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <div className="p-8">
            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-500 mb-8">SOURCES</h4>
            <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[80vh] no-scrollbar">
               {DEFAULT_PLAYLISTS.map(s => (
                 <button key={s.name} onClick={() => { setActiveTab(s.name); setActiveView('live'); setSidebarOpen(false); }} className={`p-4 rounded-xl text-left border transition-all ${activeTab === s.name ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/5'}`}>
                   <span className="text-[10px] font-black uppercase tracking-widest">{s.name}</span>
                 </button>
               ))}
            </div>
         </div>
      </div>

      <main ref={mainRef} className="flex-1 overflow-y-auto p-4 pb-20 no-scrollbar">
        {activeView === 'live' && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest ml-1 text-slate-500">
              {activeTab} Nodes
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {filteredChannels.length > 0 ? filteredChannels.map(ch => (
                <div key={ch.id} className="relative h-44">
                  <button onClick={() => handleChannelSelect(ch)} className={`w-full h-full relative bg-[#020617] rounded-3xl border transition-all text-left overflow-hidden ${selectedChannel?.id === ch.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-white/5'}`}>
                    <div className="absolute inset-0 opacity-90" style={{ backgroundImage: `url(${ch.logo})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.6)' }} />
                    <div className="relative z-10 h-full flex flex-col justify-between p-4 bg-gradient-to-t from-[#020617] to-transparent">
                      <div className="w-10 h-10 rounded-xl bg-black/80 p-1.5 border border-white/10 flex items-center justify-center">
                        <img src={ch.logo} className="w-full h-full object-contain" alt="" />
                      </div>
                      <h4 className="text-[9px] font-black uppercase text-white truncate pr-4 tracking-widest drop-shadow-md">{ch.name}</h4>
                    </div>
                  </button>
                  <button onClick={(e) => toggleFavorite(e, ch)} className={`absolute bottom-3 right-3 z-20 p-2 rounded-xl bg-black/40 backdrop-blur-md ${favorites.some(f => f.id === ch.id) ? 'text-indigo-400' : 'text-white/40'}`}>
                    <svg className="w-3.5 h-3.5" fill={favorites.some(f => f.id === ch.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  </button>
                </div>
              )) : (
                <div className="col-span-2 text-center py-10 opacity-20 text-[8px] uppercase font-black tracking-widest">No signals found</div>
              )}
            </div>
          </div>
        )}
        {activeView === 'favorites' && (
          <div className="grid grid-cols-2 gap-3">
             {favorites.length > 0 ? favorites.map(ch => (
                <div key={ch.id} className="relative h-44">
                  <button onClick={() => handleChannelSelect(ch)} className="w-full h-full relative bg-[#020617] rounded-3xl border border-white/5 text-left overflow-hidden">
                    <div className="absolute inset-0 opacity-90" style={{ backgroundImage: `url(${ch.logo})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.6)' }} />
                    <div className="relative z-10 h-full flex flex-col justify-between p-4 bg-gradient-to-t from-[#020617] to-transparent">
                      <div className="w-10 h-10 rounded-xl bg-black/80 p-1.5 border border-white/10 flex items-center justify-center">
                        <img src={ch.logo} className="w-full h-full object-contain" alt="" />
                      </div>
                      <h4 className="text-[9px] font-black uppercase text-white truncate pr-4 tracking-widest drop-shadow-md">{ch.name}</h4>
                    </div>
                  </button>
                </div>
             )) : <div className="col-span-2 text-center py-20 opacity-30 text-[9px] uppercase font-black tracking-widest">Locked Signals Empty</div>}
          </div>
        )}
      </main>

      <MobileNav isTheater={false} activeView={activeView} onViewChange={setActiveView} onSidebarOpen={() => setSidebarOpen(true)} />
    </div>
  );

  return isMobile ? <MobileLayout /> : <DesktopLayout />;
};

export default App;
