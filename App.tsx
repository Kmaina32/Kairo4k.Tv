
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
  const [activeTab, setActiveTab] = useState<string | null>(DEFAULT_PLAYLISTS[0].name);
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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const boot = async () => {
      setTimeout(() => setIsLoading(false), 1200);
      cloudService.getSystemStatus().then(setCloudStats);
      for (const p of DEFAULT_PLAYLISTS) {
        fetchWithFallback(p.url, p.name).then(text => {
          if (!text) return;
          const parsed = parseM3U(text, p.name);
          if (parsed.length > 0) {
            setChannels(prev => {
              const others = prev.filter(c => c.source !== p.name);
              return [...others, ...parsed];
            });
          }
        });
      }
    };
    boot();
  }, []);

  const fetchWithFallback = async (url: string, sourceName: string): Promise<string> => {
    if (!url) return '';
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
          if (text.includes('#EXTM3U')) {
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

  // --- DESKTOP LAYOUT ---
  const DesktopLayout = () => (
    <div className="flex flex-col h-screen bg-[#020617] text-slate-100 overflow-hidden">
      <Header isTheater={isTheater} sidebarOpen={false} onSidebarToggle={() => {}} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeView={activeView} onViewChange={setActiveView} isOpen={true} />
        <main ref={mainRef} className="flex-1 overflow-y-auto px-10 py-8 pb-24 no-scrollbar bg-slate-950/20">
          <div className="mx-auto w-full max-w-[1700px]">
            {selectedChannel && (
              <div className={`mb-10 animate-in fade-in duration-700 ${isTheater ? 'fixed inset-0 z-[300] bg-black m-0' : ''}`}>
                <div className={`shadow-2xl border border-white/5 bg-black overflow-hidden ${isTheater ? 'rounded-0 h-screen' : 'rounded-[32px] aspect-video w-full'}`}>
                  <VideoPlayer url={selectedChannel.url} poster={selectedChannel.logo} isTheater={isTheater} onToggleTheater={() => setIsTheater(!isTheater)} channelName={selectedChannel.name} />
                </div>
              </div>
            )}

            {/* Command Bar (Dropdown + Search) */}
            <div className="flex items-center gap-4 mb-10 h-14">
              <div className="relative h-full w-72" ref={dropdownRef}>
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="h-full w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 flex items-center justify-between hover:bg-white/[0.05] transition-all">
                  <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400 truncate mr-2">{activeTab || 'SELECT SOURCE'}</span>
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

            {/* Signal Grid */}
            {activeView === 'live' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
                {channels.filter(c => c.source === activeTab && c.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, visibleCount).map(ch => (
                  <div key={ch.id} className="relative group">
                    <button onClick={() => handleChannelSelect(ch)} className={`w-full relative bg-white/[0.01] border-2 rounded-[28px] transition-all overflow-hidden h-60 text-left ${selectedChannel?.id === ch.id ? 'border-indigo-500 bg-indigo-500/5' : 'border-white/5 hover:border-white/10'}`}>
                      <div className="absolute inset-0 opacity-10 grayscale group-hover:grayscale-0 transition-all" style={{ backgroundImage: `url(${ch.logo})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                      <div className="relative z-10 h-full flex flex-col justify-between p-6 bg-gradient-to-t from-[#020617] via-transparent to-transparent">
                        <img src={ch.logo} className="w-12 h-12 object-contain bg-black/60 rounded-xl p-2 border border-white/5 shadow-2xl" alt="" onError={(e) => e.currentTarget.src='https://api.dicebear.com/7.x/identicon/svg?seed='+ch.name} />
                        <h4 className="text-[10px] font-black uppercase text-white truncate leading-tight pr-8">{ch.name}</h4>
                      </div>
                    </button>
                    <button 
                      onClick={(e) => toggleFavorite(e, ch)}
                      className={`absolute bottom-6 right-6 z-20 p-2 rounded-lg transition-all ${favorites.some(f => f.id === ch.id) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                    >
                      <svg className="w-4 h-4" fill={favorites.some(f => f.id === ch.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeView === 'favorites' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
                {favorites.map(ch => (
                  <button key={ch.id} onClick={() => handleChannelSelect(ch)} className="group relative bg-white/[0.01] border-2 border-white/5 rounded-[28px] transition-all overflow-hidden h-60 hover:border-indigo-500">
                    <div className="absolute inset-0 opacity-10 transition-all" style={{ backgroundImage: `url(${ch.logo})`, backgroundSize: 'cover' }} />
                    <div className="relative z-10 h-full flex flex-col justify-between p-6 bg-gradient-to-t from-[#020617] via-transparent to-transparent text-left">
                      <img src={ch.logo} className="w-12 h-12 object-contain bg-black/60 rounded-xl p-2 border border-white/5" alt="" />
                      <h4 className="text-[10px] font-black uppercase text-white truncate leading-tight">{ch.name}</h4>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );

  // --- MOBILE LAYOUT ---
  const MobileLayout = () => (
    <div className="flex flex-col h-screen bg-[#020617] text-slate-100 overflow-hidden">
      <Header isTheater={false} sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />
      
      {selectedChannel && (
        <div className="flex-shrink-0 z-[60] sticky top-0 bg-[#020617] p-2 border-b border-white/5 shadow-xl">
          <div className="rounded-[24px] overflow-hidden shadow-2xl border border-white/10 bg-black aspect-video">
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
                 <button key={s.name} onClick={() => { setActiveTab(s.name); setActiveView('live'); setSidebarOpen(false); }} className={`p-4 rounded-xl text-left border ${activeTab === s.name ? 'bg-indigo-600 border-indigo-400' : 'bg-white/5 border-white/5'}`}>
                   <span className="text-[10px] font-black uppercase tracking-widest">{s.name}</span>
                 </button>
               ))}
            </div>
         </div>
      </div>

      <main ref={mainRef} className="flex-1 overflow-y-auto p-4 pb-32 no-scrollbar">
        {activeView === 'live' && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 ml-1">{activeTab} Nodes</h3>
            <div className="grid grid-cols-2 gap-3">
              {channels.filter(c => c.source === activeTab).map(ch => (
                <div key={ch.id} className="relative">
                  <button onClick={() => handleChannelSelect(ch)} className={`w-full bg-white/5 p-4 rounded-2xl border transition-all text-left h-40 flex flex-col justify-between ${selectedChannel?.id === ch.id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-white/5'}`}>
                    <img src={ch.logo} className="w-8 h-8 rounded-lg object-contain bg-black/60 p-2" alt="" />
                    <h4 className="text-[9px] font-black uppercase text-white truncate pr-4">{ch.name}</h4>
                  </button>
                  <button onClick={(e) => toggleFavorite(e, ch)} className={`absolute top-4 right-4 p-1.5 rounded-lg ${favorites.some(f => f.id === ch.id) ? 'text-indigo-400' : 'text-slate-600'}`}>
                    <svg className="w-3.5 h-3.5" fill={favorites.some(f => f.id === ch.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeView === 'favorites' && (
          <div className="grid grid-cols-2 gap-3">
             {favorites.length > 0 ? favorites.map(ch => (
                <button key={ch.id} onClick={() => handleChannelSelect(ch)} className="bg-white/5 p-4 rounded-2xl border border-white/5 h-40 flex flex-col justify-between text-left">
                   <img src={ch.logo} className="w-8 h-8 rounded-lg object-contain bg-black/60 p-2" alt="" />
                   <h4 className="text-[9px] font-black uppercase text-white truncate">{ch.name}</h4>
                </button>
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
