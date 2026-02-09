import React, { useState, useEffect, useRef } from 'react';
import { Channel, ProxyStatus, UserProfile, CloudStats, AppView } from './types';
import { DEFAULT_PLAYLISTS, PROXY_OPTIONS, VIRTUAL_CHANNELS, CACHE_TTL } from './constants';
import { parseM3U } from './services/m3uParser';
import { cloudService } from './services/cloudService';

// Aero-Flow Components
import VideoPlayer from './components/viewer/VideoPlayer';
import Header from './components/frontend/Header';
import LoadingScreen from './components/frontend/LoadingScreen';
import MobileNav from './components/frontend/MobileNav';
import AccountPage from './components/viewer/AccountPage';
import AdminDashboard from './components/admin/AdminDashboard';
import NexusChat from './components/viewer/NexusChat';
import AuthScreen from './components/backend/AuthScreen';
import MoviesPage from './components/viewer/MoviesPage';
import PlaylistsPage from './components/viewer/PlaylistsPage';
import FavoritesPage from './components/viewer/FavoritesPage';
import WatchlistPage from './components/viewer/WatchlistPage';
import HistoryPage from './components/viewer/HistoryPage';
import SubscriptionsPage from './components/viewer/SubscriptionsPage';
import MediaFavoritesPage from './components/viewer/MediaFavoritesPage';
import VirtualSyncPlayer from './components/viewer/VirtualSyncPlayer';
import { supabase } from './services/supabaseClient';
import { PlaylistSource } from './types';

const CHANNELS_PER_PAGE = 60;

const App = () => {
  // Shared State
  const [channels, setChannels] = useState<Channel[]>(VIRTUAL_CHANNELS);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(() => {
    const saved = localStorage.getItem('nexus_selected_channel');
    return saved ? JSON.parse(saved) : null;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(() => localStorage.getItem('nexus_active_tab') || 'Free Live Sports');
  const [activeView, setActiveView] = useState<AppView>(() => {
    return (localStorage.getItem('nexus_active_view') as any) || 'live';
  });
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isTheater, setIsTheater] = useState(() => localStorage.getItem('nexus_is_theater') === 'true');
  const [favorites, setFavorites] = useState<Channel[]>(() => {
    const saved = localStorage.getItem('nexus_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [visibleCount, setVisibleCount] = useState(CHANNELS_PER_PAGE);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const [proxyHealth, setProxyHealth] = useState<ProxyStatus[]>(
    PROXY_OPTIONS.map(url => ({ url, status: 'healthy', latency: 0 }))
  );

  const [cloudStats, setCloudStats] = useState<CloudStats | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<any>(null);
  const [dbPlaylists, setDbPlaylists] = useState<PlaylistSource[]>([]);
  const [activeVodCategory, setActiveVodCategory] = useState('All');

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
    const { data: { session } } = await supabase.auth.getSession();
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setCurrentUser({
        id: data.id,
        username: data.username,
        email: session?.user?.email,
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

        const { data: vChannels } = await supabase.from('virtual_channels').select('*').eq('is_active', true);
        if (vChannels) {
          const virtualSource: PlaylistSource = { name: 'KAIRO ORIGINALS', url: '', type: 'Premium' };
          // Only add if not already exists
          setDbPlaylists(prev => {
            if (prev.some(p => p.name === 'KAIRO ORIGINALS')) return prev;
            return [virtualSource, ...prev];
          });

          const vMapped: Channel[] = vChannels.map(vc => ({
            id: vc.id,
            name: vc.name,
            group: 'Kairo Originals',
            logo: vc.logo_url || 'https://www.kairo.me/wp-content/uploads/2021/02/kairo_home.jpg', // Use your logo URL here
            url: 'virtual://' + vc.id, // Special protocol for virtual channels
            source: 'KAIRO ORIGINALS'
          }));

          // Deduplicate channels by ID before setting
          setChannels(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newChannels = vMapped.filter(c => !existingIds.has(c.id));
            return [...prev, ...newChannels];
          });
        }

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
        console.error(`Failed to fetch data URL for ${sourceName}:`, e);
        return '';
      }
    }

    const cacheKey = `kairo_cache_${sourceName}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) return data;
    }

    // Sort proxies by health status (healthy first)
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
      } catch (e) {
        console.error(`Proxy ${proxy.url} failed for ${sourceName}:`, e);
      }
    }

    // Direct fetch as final fallback
    try {
      const directRes = await fetch(url, { mode: 'cors' });
      if (directRes.ok) {
        const text = await directRes.text();
        if (text.includes('#EXTM3U') || text.includes('#EXTINF')) {
          localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: text }));
          return text;
        }
      }
    } catch (e) {
      console.error(`Direct fetch failed for ${sourceName}:`, e);
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
    .slice(0, visibleCount)
    // Deduplicate by id to prevent duplicate key warnings
    .filter((c, index, arr) => arr.findIndex(ch => ch.id === c.id) === index);

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
    <div key={`${channel.id}-${channel.source}`} className="relative group h-40 md:h-60">
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

  const DesktopLayout = () => {
    const isVodView = ['movies', 'playlists', 'watchlist', 'history', 'media-favorites', 'subscriptions', 'account'].includes(activeView);
    return (
      <div className="h-screen w-screen bg-black text-slate-100 font-mono selection:bg-orange-500/30 flex overflow-hidden">
        {/* BACKGROUND GRID */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#f97316 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />

        {/* Expandable Sidebar */}
        <aside className={`z-20 flex flex-col bg-black/50 backdrop-blur-md border-r border-white/5 transition-all duration-300 ease-in-out ${sidebarOpen && activeView !== 'admin' ? 'w-96' : 'w-0'} overflow-hidden relative`}>
          {(sidebarOpen && activeView !== 'admin') && (
            isVodView ? (
              <div className="flex-1 flex flex-col p-8 pt-12" style={{ minWidth: '24rem' }}>
                <div className="flex items-center justify-between mb-10">
                  <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-orange-500">Theater Control</h2>
                  <button onClick={() => setSidebarOpen(false)} className="text-white/40 hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <nav className="space-y-2 flex-1">
                  <button
                    onClick={() => setActiveView('movies')}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${activeView === 'movies' ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Home Theater
                  </button>
                  <button
                    onClick={() => setActiveView('playlists')}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${activeView === 'playlists' ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    Playlists
                  </button>
                  <button
                    onClick={() => setActiveView('subscriptions')}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${activeView === 'subscriptions' ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    Subscribed
                  </button>
                  <button
                    onClick={() => setActiveView('watchlist')}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${activeView === 'watchlist' ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                    Watchlist
                  </button>
                  <button
                    onClick={() => setActiveView('media-favorites')}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${activeView === 'media-favorites' ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    Saved
                  </button>
                  <div className="pt-8 mt-6 border-t border-white/5">
                    <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 mb-6 px-4">Activity</h4>
                    <button
                      onClick={() => setActiveView('history')}
                      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest ${activeView === 'history' ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      History
                    </button>
                  </div>
                </nav>

                <div className="pt-8 border-t border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-700">
                  Theater Mode Active
                </div>
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-white/5" style={{ minWidth: '24rem' }}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-white">Live Channels</h2>
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
                <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ minWidth: '24rem' }}>
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
              </>
            )
          )}
        </aside>

        {/* Desktop Sidebar Trigger */}
        {!sidebarOpen && activeView !== 'admin' && (
          <div className="absolute left-0 top-0 bottom-0 z-30 flex items-center w-4 group">
            {/* Hit area */}
            <div className="absolute inset-0 bg-transparent" />

            {/* Visible Trigger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="absolute left-0 p-3 bg-white/5 hover:bg-orange-600 text-slate-400 hover:text-white rounded-r-2xl border-y border-r border-white/10 hover:border-orange-500 backdrop-blur-md transition-all duration-300 -translate-x-2 group-hover:translate-x-0 shadow-2xl"
              title="Open Sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" transform="rotate(180 12 12)" />
              </svg>
            </button>
          </div>
        )}

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

            {activeView === 'admin' && (
              <div className="flex-1 overflow-hidden">
                <AdminDashboard stats={cloudStats} user={currentUser} onClose={() => setActiveView('live')} />
              </div>
            )}

            {activeView === 'account' && (
              <div className="flex-1 overflow-hidden">
                <AccountPage user={currentUser} stats={cloudStats} onViewChange={setActiveView} />
              </div>
            )}

            {activeView === 'movies' && (
              <div className="flex-1 overflow-hidden">
                <MoviesPage onBack={() => setActiveView('live')} onViewChange={setActiveView} />
              </div>
            )}

            {activeView === 'playlists' && (
              <div className="flex-1 overflow-hidden">
                <PlaylistsPage
                  onSelectMedia={(item) => {
                    localStorage.setItem('nexus_selected_media', JSON.stringify(item));
                    setActiveView('movies');
                  }}
                />
              </div>
            )}

            {activeView === 'favorites' && (
              <div className="flex-1 overflow-hidden">
                <FavoritesPage
                  favorites={favorites}
                  onSelectChannel={handleChannelSelect}
                  onRemoveFavorite={(e) => toggleFavorite(e as any, e)}
                  selectedChannel={selectedChannel}
                />
              </div>
            )}

            {activeView === 'media-favorites' && (
              <div className="flex-1 overflow-hidden">
                <MediaFavoritesPage
                  onSelectMedia={(item) => {
                    localStorage.setItem('nexus_selected_media', JSON.stringify(item));
                    setActiveView('movies');
                  }}
                />
              </div>
            )}

            {activeView === 'watchlist' && (
              <div className="flex-1 overflow-hidden">
                <WatchlistPage onSelectMedia={(item) => {
                  localStorage.setItem('nexus_selected_media', JSON.stringify(item));
                  setActiveView('movies');
                }} />
              </div>
            )}

            {activeView === 'history' && (
              <div className="flex-1 overflow-hidden">
                <HistoryPage onSelectMedia={(item) => {
                  localStorage.setItem('nexus_selected_media', JSON.stringify(item));
                  setActiveView('movies');
                }} />
              </div>
            )}

            {activeView === 'subscriptions' && (
              <div className="flex-1 overflow-hidden">
                <SubscriptionsPage />
              </div>
            )}

            {activeView === 'live' && (
              <div className="flex-1 relative p-4 flex flex-col gap-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {selectedChannel ? (
                  <>
                    <div className="w-full aspect-video relative rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 bg-black group shrink-0">
                      <div className="absolute top-12 left-8 z-20 pointer-events-none">
                        <h1 className="text-4xl font-black tracking-widest drop-shadow-2xl uppercase kairo-cyber-glow" style={{ fontFamily: 'Comfortaa, sans-serif' }}>
                          KAIRO<span className="text-white opacity-80 decoration-orange-500 underline underline-offset-4"> 4K</span>
                        </h1>
                      </div>
                      {selectedChannel.url.startsWith('virtual://') ? (
                        <VirtualSyncPlayer
                          channelId={selectedChannel.url.replace('virtual://', '')}
                          channelName={selectedChannel.name}
                          isTheater={isTheater}
                          onToggleTheater={() => setIsTheater(!isTheater)}
                        />
                      ) : (
                        <VideoPlayer
                          url={selectedChannel.url}
                          poster={selectedChannel.logo}
                          isTheater={isTheater}
                          onToggleTheater={() => setIsTheater(!isTheater)}
                          channelName={selectedChannel.name}
                        />
                      )}
                      <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col gap-2 items-center opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none">
                        <div className="w-1 h-12 bg-white/20 rounded-full" />
                        <span className="text-[10px] bg-black/50 px-2 py-1 rounded text-white">▲ ▼ CH</span>
                        <div className="w-1 h-12 bg-white/20 rounded-full" />
                      </div>
                    </div>

                    {/* Desktop "More Media" Grid below player */}
                    <div className="pt-10 border-t border-white/5 pb-20">
                      <h3 className="text-sm font-black uppercase tracking-[0.3em] text-orange-500 mb-8 flex items-center gap-4">
                        Recommended Channels
                        <div className="flex-1 h-px bg-white/5" />
                      </h3>
                      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                        {filteredChannels.map(ch => renderChannelCard(ch))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                    <div className="w-24 h-24 border-2 border-white/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
                      <div className="w-20 h-20 border-2 border-dashed border-white/20 rounded-full animate-spin-slow" />
                    </div>
                    <p className="text-sm tracking-[0.5em] uppercase">No channel selected</p>
                    <p className="text-xs text-orange-500 mt-2 tracking-widest">Select a channel to start watching</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  };

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
        case 'media-favorites':
          return (
            <MediaFavoritesPage
              onSelectMedia={(item) => {
                localStorage.setItem('nexus_selected_media', JSON.stringify(item));
                setActiveView('movies');
              }}
            />
          );
        case 'account':
          return <AccountPage user={currentUser} stats={cloudStats} onViewChange={setActiveView} />;
        case 'admin':
          return <AdminDashboard stats={cloudStats} user={currentUser} onClose={() => setActiveView('account')} />;
        case 'movies':
          return (
            <MoviesPage
              onBack={() => setActiveView('live')}
              onViewChange={setActiveView}
              activeCategory={activeVodCategory}
              onCategoryChange={setActiveVodCategory}
            />
          );
        case 'watchlist':
          return <WatchlistPage onSelectMedia={(item) => {
            localStorage.setItem('nexus_selected_media', JSON.stringify(item));
            setActiveView('movies');
          }} />;
        case 'history':
          return <HistoryPage onSelectMedia={(item) => {
            localStorage.setItem('nexus_selected_media', JSON.stringify(item));
            setActiveView('movies');
          }} />;
        case 'subscriptions':
          return <SubscriptionsPage />;
        case 'playlists':
          return (
            <PlaylistsPage
              onSelectMedia={(item) => {
                localStorage.setItem('nexus_selected_media', JSON.stringify(item));
                setActiveView('movies');
              }}
            />
          );
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
                      {selectedChannel.url.startsWith('virtual://') ? (
                        <VirtualSyncPlayer
                          channelId={selectedChannel.url.replace('virtual://', '')}
                          channelName={selectedChannel.name}
                          isTheater={false}
                          onToggleTheater={() => { }}
                        />
                      ) : (
                        <VideoPlayer
                          url={selectedChannel.url}
                          poster={selectedChannel.logo}
                          isTheater={false}
                          onToggleTheater={() => { }}
                          channelName={selectedChannel.name}
                        />
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 border-b border-white/5">
                      <div className="w-12 h-12 border-2 border-orange-500/20 rounded-full animate-pulse border-t-orange-500 border-l-transparent mb-3 animate-spin" />
                      <p className="text-[10px] uppercase tracking-[0.3em] opacity-30">Loading...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* SCROLLABLE GRID */}
              <div className="flex-1 overflow-y-auto p-4 no-scrollbar pb-32 bg-gradient-to-b from-[#020617] to-black">
                <div className="flex items-center justify-between mb-6 px-1">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-orange-500/60">Available Channels</h3>
                  <span className="text-[8px] font-mono text-slate-600">{filteredChannels.length} Online</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {filteredChannels.map(ch => renderChannelCard(ch))}
                  {/* INFINITE SCROLL PLACEHOLDER */}
                  <div className="col-span-2 py-10 flex flex-col items-center justify-center opacity-10">
                    <div className="w-1 h-12 bg-orange-500 rounded-full animate-bounce mb-4" />
                    <span className="text-[8px] font-black uppercase tracking-[0.5em]">End of list</span>
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
              <h2 className="text-sm font-black uppercase tracking-widest text-orange-500">Categories</h2>
              <button onClick={() => setSidebarOpen(false)} className="p-3 bg-white/5 rounded-2xl border border-white/5">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="relative mb-8">
              {activeView === 'movies' ? (
                <div className="grid grid-cols-2 gap-3">
                  {['All', 'Movie', 'Series', 'Fallen', 'Documentary', 'Music'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setActiveVodCategory(cat); setSidebarOpen(false); }}
                      className={`px-4 py-4 rounded-[24px] border-2 text-left flex items-center gap-3 transition-all ${activeVodCategory === cat ? 'bg-orange-600 border-orange-500 shadow-lg' : 'bg-white/5 border-white/5'}`}
                    >
                      <div className="w-8 h-8 bg-black/50 rounded-lg flex items-center justify-center text-[10px] font-black">
                        {cat === 'All' && '🌟'}
                        {cat === 'Movie' && '🎬'}
                        {cat === 'Series' && '📺'}
                        {cat === 'Fallen' && '⚔️'}
                        {cat === 'Documentary' && '📜'}
                        {cat === 'Music' && '🎵'}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">{cat}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
            {activeView !== 'movies' && (
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
            )}
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
