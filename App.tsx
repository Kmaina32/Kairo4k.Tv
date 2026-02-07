import React, { useState, useEffect, useRef } from 'react';
import { Channel, ProxyStatus, UserProfile, CloudStats } from './types';
import { DEFAULT_PLAYLISTS, PROXY_OPTIONS, NASA_CHANNELS, CACHE_TTL } from './constants';
import { parseM3U } from './services/m3uParser';
import { cloudService } from './services/cloudService';

// Aero-Flow Components
import VideoPlayer from './components/VideoPlayer';
import Header from './components/Header';
import LoadingScreen from './components/LoadingScreen';
import MobileNav from './components/MobileNav';
import AccountPage from './components/AccountPage';
import AdminDashboard from './components/AdminDashboard';
import NexusChat from './components/NexusChat';
import AuthScreen from './components/AuthScreen';
import MoviesPage from './components/MoviesPage';
import FavoritesPage from './components/FavoritesPage';
import { supabase } from './services/supabaseClient';
import { PlaylistSource } from './types';

const CHANNELS_PER_PAGE = 60;

const App = () => {
  // Shared State
  const [channels, setChannels] = useState<Channel[]>(NASA_CHANNELS);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('Free Live Sports');
  const [activeView, setActiveView] = useState<'live' | 'favorites' | 'account' | 'admin' | 'movies'>('live');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isTheater, setIsTheater] = useState(false);
  const [favorites, setFavorites] = useState<Channel[]>([]);
  const [visibleCount, setVisibleCount] = useState(CHANNELS_PER_PAGE);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const [proxyHealth, setProxyHealth] = useState<ProxyStatus[]>(
    PROXY_OPTIONS.map(url => ({ url, status: 'healthy', latency: 0 }))
  );
  const [cloudStats, setCloudStats] = useState<CloudStats | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<any>(null);
  const [dbPlaylists, setDbPlaylists] = useState<PlaylistSource[]>([]);

  const mainRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasAutoPlayedRef = useRef(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // 1. Handle Auth Session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchUserProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchUserProfile(session.user.id);
      else setCurrentUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setCurrentUser({
        id: data.id,
        username: data.username,
        rank: data.rank,
        joinedAt: new Date(data.joined_at).getTime(),
        lastSync: new Date(data.last_sync).getTime()
      });
    }
  };

  useEffect(() => {
    const boot = async () => {
      try {
        setIsLoading(true);
        console.group('🚀 Kairo Boot Sequence');

        // Fetch dynamic playlists from Cloud DB
        const { data: playlistsData } = await supabase.from('playlists').select('*').eq('is_active', true);
        const effectivePlaylists = playlistsData && playlistsData.length > 0 ? playlistsData : DEFAULT_PLAYLISTS;
        setDbPlaylists(effectivePlaylists);

        if (effectivePlaylists.length > 0 && !activeTab) {
          setActiveTab(effectivePlaylists[0].name);
        }

        cloudService.getSystemStatus().then(setCloudStats);

        const promises = effectivePlaylists
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

        // Set a maximum wait time of 10 seconds for fetching all playlists
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 10000));
        await Promise.race([Promise.allSettled(promises), timeoutPromise]);

      } catch (error) {
        console.error('Critical Boot Failure:', error);
      } finally {
        setIsLoading(false);
        console.groupEnd();
      }
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
      } catch (e) { }
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

  const filteredChannels = channels
    .filter(c => c.source === activeTab && c.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, visibleCount);

  useEffect(() => {
    // KEYBOARD SHORTCUTS FOR ZAPPING
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeView !== 'live' || !selectedChannel) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = filteredChannels.findIndex(c => c.id === selectedChannel.id);
        if (currentIndex === -1) return;

        let nextIndex = e.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= filteredChannels.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = filteredChannels.length - 1;

        handleChannelSelect(filteredChannels[nextIndex]);
      }
      if (e.key === ' ' && !isDropdownOpen) { // Space to toggle menu
        // e.preventDefault();
        // setSidebarOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedChannel, filteredChannels, activeView, isDropdownOpen]);





  const renderChannelCard = (channel: Channel) => (
    <div key={channel.id} className="relative group h-40 md:h-60">
      <button
        onClick={() => handleChannelSelect(channel)}
        className={`w-full h-full relative bg-[#020617] border-2 rounded-3xl transition-all overflow-hidden text-left ${selectedChannel?.id === channel.id ? 'border-orange-500 ring-4 ring-orange-500/10' : 'border-white/5 hover:border-white/20'}`}
      >
        <div
          className="absolute inset-0 opacity-70 transition-all duration-700 group-hover:scale-110"
          style={{
            backgroundImage: `url(${channel.logo})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#000',
            filter: 'contrast(1.1) brightness(0.5)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-black/40 to-transparent z-10" />
        <div className="relative z-20 h-full flex flex-col justify-end p-4">
          <div className="flex-1" />
          <div>
            <span className="text-[7px] font-black uppercase text-orange-400 tracking-[0.1em] mb-0.5 block opacity-60">
              {channel.source}
            </span>
            <h4 className="text-[10px] font-black uppercase text-white truncate tracking-wider drop-shadow-md">
              {channel.name}
            </h4>
          </div>
        </div>
      </button>
      <button
        onClick={(e) => toggleFavorite(e, channel)}
        className={`absolute top-3 right-3 z-30 w-8 h-8 flex items-center justify-center rounded-xl transition-all ${favorites.some(f => f.id === channel.id) ? 'bg-orange-600 text-white shadow-xl' : 'bg-white/10 text-white/40 hover:text-white hover:bg-white/20 backdrop-blur-md'}`}
      >
        <svg className="w-3.5 h-3.5" fill={favorites.some(f => f.id === channel.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
      </button>
    </div>
  );

  const DesktopLayout = () => (
    <div className="h-screen w-screen bg-black text-slate-100 font-mono selection:bg-orange-500/30 flex overflow-hidden">
      {/* BACKGROUND GRID */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#f97316 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      {/* Expandable Sidebar */}
      <aside className={`z-20 flex flex-col bg-black/50 backdrop-blur-md border-r border-white/5 transition-all duration-300 ease-in-out ${sidebarOpen && activeView !== 'admin' ? 'w-96' : 'w-0'} overflow-hidden`}>
        {(sidebarOpen && activeView !== 'admin') && <>
          <div className="p-6 border-b border-white/5" style={{ minWidth: '24rem' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-white">Sector Map</h2>
              <button onClick={() => setSidebarOpen(false)} className="text-white/40 hover:text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between hover:bg-white/10 transition-all"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">{activeTab}</span>
                <svg className={`w-3 h-3 text-white/40 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl">
                  {dbPlaylists.map(s => (
                    <button key={s.name} onClick={() => { setActiveTab(s.name); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest hover:bg-white/5 text-slate-400 hover:text-white transition-all">
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar" style={{ minWidth: '24rem' }}>
            {filteredChannels.length > 0 ? filteredChannels.map(ch => (
              <button
                key={ch.id}
                onClick={() => handleChannelSelect(ch)}
                className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all group relative overflow-hidden ${selectedChannel?.id === ch.id ? 'bg-orange-600 border-orange-500' : 'bg-white/5 border-transparent hover:border-white/10'}`}
              >
                <div className="w-10 h-10 bg-black/50 rounded-lg p-1 flex-shrink-0">
                  <img src={ch.logo} className="w-full h-full object-contain" alt="" />
                </div>
                <div className="text-left flex-1 min-w-0 z-10">
                  <h4 className={`text-[10px] font-black uppercase truncate tracking-wider ${selectedChannel?.id === ch.id ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{ch.name}</h4>
                  <span className={`text-[8px] uppercase tracking-widest ${selectedChannel?.id === ch.id ? 'text-orange-200' : 'text-slate-600'}`}>{ch.group || 'UHF'}</span>
                </div>
                {selectedChannel?.id === ch.id && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                )}
              </button>
            )) : (
              <div className="py-10 text-center opacity-20 text-[9px] uppercase tracking-widest">No Signals Found</div>
            )}
          </div>
          <div className="p-4 bg-black/40 border-t border-white/5 flex justify-between items-center text-[9px] font-mono text-slate-600 uppercase" style={{ minWidth: '24rem' }}>
            <span>Nodes: {filteredChannels.length}</span>
            <span className="text-orange-500/50">Online</span>
          </div>
        </>}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        <Header
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onViewChange={setActiveView}
          activeView={activeView}
          user={currentUser}
        />

        <div className="flex-1 relative flex flex-col">
          {activeView === 'admin' ? (
            <AdminDashboard stats={cloudStats} user={currentUser} onClose={() => setActiveView('live')} />
          ) : activeView === 'account' ? (
            <AccountPage user={currentUser} stats={cloudStats} onViewChange={setActiveView} />
          ) : activeView === 'movies' ? (
            <MoviesPage onBack={() => setActiveView('live')} />
          ) : activeView === 'favorites' ? (
            <FavoritesPage
              favorites={favorites}
              onSelectChannel={handleChannelSelect}
              onRemoveFavorite={(e) => toggleFavorite(e as any, e)}
              selectedChannel={selectedChannel}
            />
          ) : (
            <div className="flex-1 relative p-4 flex items-center justify-center">
              {selectedChannel ? (
                <div className="w-full h-full relative rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 bg-black group">
                  <div className="absolute top-12 left-8 z-20 pointer-events-none">
                    <h1 className="text-4xl font-black tracking-widest drop-shadow-2xl uppercase kairo-cyber-glow" style={{ fontFamily: 'Comfortaa, sans-serif' }}>
                      KAIRO<span className="text-white opacity-80 decoration-orange-500 underline underline-offset-4"> 4K</span>
                    </h1>
                  </div>
                  <VideoPlayer
                    url={selectedChannel.url}
                    poster={selectedChannel.logo}
                    isTheater={isTheater}
                    onToggleTheater={() => setIsTheater(!isTheater)}
                    channelName={selectedChannel.name}
                  />
                  <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col gap-2 items-center opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none">
                    <div className="w-1 h-12 bg-white/20 rounded-full" />
                    <span className="text-[10px] bg-black/50 px-2 py-1 rounded text-white">▲ ▼ CH</span>
                    <div className="w-1 h-12 bg-white/20 rounded-full" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center opacity-40">
                  <div className="w-24 h-24 border-2 border-white/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <div className="w-20 h-20 border-2 border-dashed border-white/20 rounded-full animate-spin-slow" />
                  </div>
                  <p className="text-sm tracking-[0.5em] uppercase">Signal Offline</p>
                  <p className="text-xs text-orange-500 mt-2 tracking-widest">Select Node to Establish Link</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );

  const MobileLayout = () => {
    const renderContent = () => {
      switch (activeView) {
        case 'favorites':
          return (
            <FavoritesPage
              favorites={favorites}
              onSelectChannel={(ch) => { handleChannelSelect(ch); setActiveView('live'); }}
              onRemoveFavorite={(e) => toggleFavorite(e as any, e)}
              selectedChannel={selectedChannel}
            />
          );
        case 'account':
          return <AccountPage user={currentUser} stats={cloudStats} onViewChange={setActiveView} />;
        case 'admin':
          return <AdminDashboard stats={cloudStats} user={currentUser} onClose={() => setActiveView('account')} />;
        case 'movies':
          return <MoviesPage onBack={() => setActiveView('live')} />;
        default: // live
          return (
            <div className="flex-1 flex flex-col h-full pt-16">
              {/* STICKY PLAYER CONTAINER */}
              <div className="sticky top-0 z-40 bg-black shadow-2xl border-b border-orange-500/10">
                <div className="aspect-[4/3] w-full relative">
                  {selectedChannel ? (
                    <>
                      <div className="absolute top-3 left-4 z-20 pointer-events-none">
                        <h1 className="text-sm font-black tracking-[0.3em] drop-shadow-2xl uppercase kairo-cyber-glow" style={{ fontFamily: 'Comfortaa, sans-serif' }}>
                          KAIRO<span className="text-white opacity-80 decoration-orange-500 underline underline-offset-2"> 4K</span>
                        </h1>
                      </div>
                      <VideoPlayer
                        url={selectedChannel.url}
                        poster={selectedChannel.logo}
                        isTheater={false}
                        onToggleTheater={() => { }}
                        channelName={selectedChannel.name}
                      />
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 border-b border-white/5">
                      <div className="w-12 h-12 border-2 border-orange-500/20 rounded-full animate-pulse border-t-orange-500 border-l-transparent mb-3 animate-spin" />
                      <p className="text-[10px] uppercase tracking-[0.3em] opacity-30">Locking Signal...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* SCROLLABLE GRID */}
              <div className="flex-1 overflow-y-auto p-4 no-scrollbar pb-32 bg-gradient-to-b from-[#020617] to-black">
                <div className="flex items-center justify-between mb-6 px-1">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-orange-500/60">Active Nodes</h3>
                  <span className="text-[8px] font-mono text-slate-600">{filteredChannels.length} Linked</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {filteredChannels.map(ch => renderChannelCard(ch))}
                  {/* INFINITE SCROLL PLACEHOLDER */}
                  <div className="col-span-2 py-10 flex flex-col items-center justify-center opacity-10">
                    <div className="w-1 h-12 bg-orange-500 rounded-full animate-bounce mb-4" />
                    <span className="text-[8px] font-black uppercase tracking-[0.5em]">End of Transmission</span>
                  </div>
                </div>
              </div>
            </div>
          );
      }
    };

    return (
      <div className="flex flex-col h-[100dvh] bg-black text-slate-100 overflow-hidden relative">
        {/* MOBILE HEADER (NO MENU BUTTON) */}
        <div className="absolute top-0 left-0 right-0 z-50 h-16 flex items-center justify-center px-4 bg-gradient-to-b from-black/95 to-transparent pointer-events-none">
          <h1 className="text-2xl font-black tracking-[0.2em] drop-shadow-md uppercase kairo-cyber-glow">
            KAIRO<span className="text-white"> 4K</span>
          </h1>
        </div>

        {renderContent()}

        {sidebarOpen && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col p-6 animate-in slide-in-from-right-10 pt-10">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-sm font-black uppercase tracking-widest text-orange-500">Source Select</h2>
              <button onClick={() => setSidebarOpen(false)} className="p-3 bg-white/5 rounded-2xl border border-white/5">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="relative mb-8">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-white/5 border border-white/10 rounded-[24px] px-6 py-5 flex items-center justify-between shadow-2xl"
              >
                <span className="text-xs font-black uppercase tracking-widest text-white">{activeTab}</span>
                <svg className={`w-4 h-4 text-white/40 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-slate-900 border border-white/10 rounded-[28px] overflow-hidden z-[110] max-h-60 overflow-y-auto shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
                  {dbPlaylists.map(s => (
                    <button key={s.name} onClick={() => { setActiveTab(s.name); setIsDropdownOpen(false); }} className="w-full text-left px-6 py-5 text-xs font-black uppercase tracking-widest hover:bg-white/5 text-slate-400 border-b border-white/5 last:border-none">
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-10">
              {filteredChannels.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => { handleChannelSelect(ch); setSidebarOpen(false); setActiveView('live'); }}
                  className={`w-full p-4 rounded-[24px] border-2 text-left flex items-center gap-4 transition-all ${selectedChannel?.id === ch.id ? 'bg-orange-600 border-orange-500 shadow-[0_10px_20px_rgba(249,115,22,0.2)]' : 'bg-white/5 border-white/5'}`}
                >
                  <div className="w-12 h-12 bg-black/50 rounded-xl p-1.5 border border-white/5">
                    <img src={ch.logo} className="w-full h-full object-contain" alt="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[10px] font-black uppercase tracking-wider truncate text-white">{ch.name}</h4>
                    <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/30 truncate block">{ch.group || 'UHF'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeView !== 'admin' && (
          <MobileNav
            isTheater={isTheater}
            activeView={activeView}
            onViewChange={setActiveView}
            onSidebarOpen={() => setSidebarOpen(true)}
          />
        )}
      </div>
    );
  };

  // Final return for the App component
  if (!session) {
    return <AuthScreen onSuccess={() => { }} />;
  }

  if (isLoading && channels.length === 0) return <LoadingScreen />;

  return isMobile ? <MobileLayout /> : <DesktopLayout />;
};

export default App;