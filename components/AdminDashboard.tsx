import React, { useState, useEffect } from 'react';
import { CloudStats, UserProfile } from '../types';
import { cloudService } from '../services/cloudService';
import NexusChat from './NexusChat';
import { supabase } from '../services/supabaseClient';
import AddPlaylistModal from './AddPlaylistModal';
import MediaModal from './AddMediaModal';
import MediaUploadPanel from './MediaUploadPanel';
import StorageAnalytics from './StorageAnalytics';
import CommandDeck from './CommandDeck';

interface AdminDashboardProps {
    stats: CloudStats | null;
    user: UserProfile;
    onClose: () => void;
}

const AdminDashboard = ({ stats, user, onClose }: AdminDashboardProps) => {
    const [isAuditing, setIsAuditing] = useState(false);

    // Persist admin view in localStorage
    const [adminView, setAdminView] = useState<'overview' | 'users' | 'playlists' | 'media' | 'upload' | 'storage'>(() => {
        const saved = localStorage.getItem('nexus_admin_view');
        return (saved as any) || 'overview';
    });

    useEffect(() => {
        localStorage.setItem('nexus_admin_view', adminView);
    }, [adminView]);

    const [users, setUsers] = useState<any[]>([]);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [mediaLibrary, setMediaLibrary] = useState<any[]>([]);
    const [mediaCategory, setMediaCategory] = useState<'All' | 'Movie' | 'Series' | 'Fallen' | 'Documentary' | 'Music'>(() => {
        return (localStorage.getItem('nexus_admin_media_cat') as any) || 'All';
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        localStorage.setItem('nexus_admin_media_cat', mediaCategory);
    }, [mediaCategory]);

    // Modals
    const [playlistModalState, setPlaylistModalState] = useState<{ open: boolean, initialData?: any }>({ open: false });
    const [mediaModalState, setMediaModalState] = useState<{ open: boolean, initialData?: any, parentId?: string }>({ open: false });

    useEffect(() => {
        if (adminView === 'users') fetchUsers();
        if (adminView === 'playlists') fetchPlaylists();
        if (adminView === 'media') fetchMediaLibrary();
    }, [adminView, mediaCategory]);

    const filteredAdminMedia = mediaCategory === 'All'
        ? mediaLibrary
        : mediaLibrary.filter((m: any) => m.category === mediaCategory);

    const fetchUsers = async () => {
        setLoading(true);
        const { data } = await supabase.from('profiles').select('*').order('joined_at', { ascending: false });
        if (data) setUsers(data);
        setLoading(false);
    };

    const fetchPlaylists = async () => {
        setLoading(true);
        const { data } = await supabase.from('playlists').select('*').order('created_at', { ascending: false });
        if (data) setPlaylists(data);
        setLoading(false);
    };

    const fetchMediaLibrary = async () => {
        setLoading(true);
        // Fetch only top-level items (no episodes) for the main view
        const { data } = await supabase.from('media_library')
            .select('*')
            .is('parent_id', null)
            .order('created_at', { ascending: false });
        if (data) setMediaLibrary(data);
        setLoading(false);
    };

    const handleToggleSuspend = async (item: any) => {
        try {
            const { error } = await supabase
                .from('media_library')
                .update({ is_active: !item.is_active })
                .eq('id', item.id);
            if (error) throw error;
            fetchMediaLibrary();
        } catch (err) {
            console.error(err);
            alert('Failed to update status');
        }
    };

    const handleDeletePlaylist = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) return;
        try {
            const { error } = await supabase.from('playlists').delete().eq('id', id);
            if (error) throw error;
            await cloudService.logEvent(user.username, `Deleted playlist source: ${name}`);
            fetchPlaylists();
        } catch (err) {
            console.error('Error deleting playlist:', err);
            alert('Failed to delete playlist');
        }
    };

    const handleDeleteMedia = async (id: string, title: string) => {
        if (!confirm(`Delete "${title}" and all its episodes?`)) return;
        try {
            const { error } = await supabase.from('media_library').delete().eq('id', id);
            if (error) throw error;
            fetchMediaLibrary();
        } catch (err) {
            console.error(err);
            alert('Failed to delete media');
        }
    };

    const handleRunAudit = async () => {
        setIsAuditing(true);
        await cloudService.logEvent(user.username, 'Manual Signal Audit Initiated');
        setTimeout(() => setIsAuditing(false), 3000);
    };

    const navItems = [
        { id: 'overview' as const, label: 'Command Deck', icon: <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /> },
        { id: 'users' as const, label: 'Operator Nodes', icon: <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
        { id: 'playlists' as const, label: 'Signal Sources', icon: <path d="M13 10V3L4 14h7v7l9-11h-7z" /> },
        { id: 'media' as const, label: 'Media Library', icon: <path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /> },
        { id: 'upload' as const, label: 'Upload to R2', icon: <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /> },
        { id: 'storage' as const, label: 'R2 Storage', icon: <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /> },
    ];

    const statsCards = [
        { label: 'Active Signals', value: '117', trend: '+12%', color: 'text-emerald-400' },
        { label: 'Degraded Nodes', value: '15', trend: '+2', color: 'text-orange-400' },
        { label: 'Library Content', value: `${mediaLibrary.length} Items`, trend: 'NEW', color: 'text-purple-400' },
        { label: 'Avg Latency', value: '542ms', trend: '-24ms', color: 'text-blue-400' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex h-screen bg-[#020617] text-white overflow-hidden font-mono">
            {/* ADMIN SIDEBAR - DESKTOP ONLY */}
            <aside className="hidden lg:flex w-72 bg-black/40 border-r border-white/5 flex-col p-6 backdrop-blur-xl z-20">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    </div>
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">Kairo 4k Admin</h2>
                        <span className="text-[8px] font-mono text-orange-500/60 uppercase tracking-widest">Level 5 Access</span>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setAdminView(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all group ${adminView === item.id ? 'bg-orange-600 text-white shadow-xl shadow-orange-900/20' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
                        >
                            <svg className={`w-5 h-5 ${adminView === item.id ? 'text-white' : 'text-slate-600 group-hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                {item.icon}
                            </svg>
                            <span className="text-[10px] font-black uppercase tracking-[0.15em]">{item.label}</span>
                        </button>
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="w-full py-4 rounded-2xl border border-white/5 flex items-center justify-center gap-3 text-slate-500 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all font-black uppercase text-[10px] tracking-widest"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Exit Nexus
                    </button>
                </div>
            </aside>

            {/* MOBILE HEADER */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/95 to-transparent z-[60] flex items-center justify-center px-4 pointer-events-none animate-in slide-in-from-top-4">
                <h1 className="text-2xl font-black tracking-[0.2em] drop-shadow-md uppercase text-orange-500">
                    KAIRO<span className="text-white"> 4K</span>
                </h1>

                {/* Exit Button (Absolute Positioned) */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white backdrop-blur-md border border-white/5">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 overflow-y-auto no-scrollbar relative p-4 md:p-8 lg:p-12 pb-24 lg:pb-12 pt-20 lg:pt-12">
                <div className="max-w-7xl mx-auto pb-8 lg:pb-0">

                    {/* VIEW HEADER */}
                    <div className="flex items-end justify-between mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div>
                            <h1 className="text-4xl font-black uppercase tracking-[0.1em] text-white mb-2">
                                {navItems.find(n => n.id === adminView)?.label}
                            </h1>
                            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest pl-1">
                                System Status: <span className="text-emerald-500">OPTIMAL</span>
                            </p>
                        </div>
                        <div className="flex gap-3">
                            {/* Contextual Actions Could Go Here */}
                        </div>
                    </div>

                    {/* OVERVIEW (COMMAND DECK) */}
                    {adminView === 'overview' && (
                        <CommandDeck />
                    )}

                    {/* MEDIA LIBRARY */}
                    {adminView === 'media' && (
                        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 min-h-screen pb-40">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Content Library</h3>
                                    <p className="text-[10px] text-slate-500 font-mono mt-1">{mediaLibrary.length} Primary Titles</p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setMediaModalState({ open: true })}
                                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-900/20 flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        Upload
                                    </button>
                                </div>
                            </div>

                            {/* FILTERS & SEARCH */}
                            <div className="flex flex-wrap items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5">
                                {['All', 'Movie', 'Series', 'Fallen', 'Documentary', 'Music'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setMediaCategory(cat as any)}
                                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mediaCategory === cat ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                                <div className="ml-auto flex-1 min-w-[200px]">
                                    <input
                                        type="text"
                                        placeholder="Search library..."
                                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {filteredAdminMedia.map((item: any) => (
                                    <div key={item.id} className={`group relative aspect-[2/3] rounded-3xl overflow-hidden border transition-all shadow-lg hover:shadow-purple-900/20 ${item.is_active ? 'bg-[#0f172a] border-white/5' : 'bg-red-950/20 border-red-500/20'}`}>
                                        {item.cover_url ? (
                                            <img src={item.cover_url} alt={item.title} className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100 ${!item.is_active && 'grayscale'}`} />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                                                <svg className="w-12 h-12 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />

                                        {/* Status Badge */}
                                        <div className="absolute top-3 left-3 flex gap-2">
                                            <span className={`px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[7px] font-black uppercase tracking-widest border ${item.is_active ? 'text-slate-300 border-white/10' : 'text-red-500 border-red-500/30'}`}>
                                                {item.category} {!item.is_active && '(OFF)'}
                                            </span>
                                        </div>

                                        {/* Action Bar Overlay */}
                                        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                            <button onClick={() => setMediaModalState({ open: true, initialData: item })} title="Edit" className="p-2 bg-black/60 backdrop-blur-md rounded-xl text-white/60 hover:text-white hover:bg-white/10 border border-white/5">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button onClick={() => handleToggleSuspend(item)} title={item.is_active ? "Suspend" : "Activate"} className={`p-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/5 ${item.is_active ? 'text-orange-400 hover:text-orange-200' : 'text-emerald-400 hover:text-emerald-200'}`}>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                            </button>
                                            {item.category === 'Series' && (
                                                <button onClick={() => setMediaModalState({ open: true, parentId: item.id })} title="Add Episode" className="p-2 bg-purple-600/60 backdrop-blur-md rounded-xl text-white hover:bg-purple-500 border border-purple-500/30">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteMedia(item.id, item.title); }} title="Delete" className="p-2 bg-red-600/60 backdrop-blur-md rounded-xl text-white hover:bg-red-500 border border-red-500/30">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>

                                        <div className="absolute bottom-0 left-0 right-0 p-5">
                                            <h3 className="text-sm font-black text-white leading-tight mb-1 line-clamp-2">{item.title}</h3>
                                            <p className="text-[9px] font-mono text-slate-400 mt-1">{item.description?.substring(0, 60)}...</p>
                                        </div>
                                    </div>
                                ))}
                                {mediaLibrary.length === 0 && !loading && (
                                    <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[32px]">
                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                            <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        </div>
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Library Empty</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {adminView === 'playlists' && (
                        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setPlaylistModalState({ open: true })}
                                    className="px-8 py-4 bg-orange-600 hover:bg-orange-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-900/20"
                                >
                                    Add New Source
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {playlists.map((p) => (
                                    <div key={p.id} className="bg-white/5 p-6 rounded-[28px] border border-white/5 hover:border-orange-500/40 transition-all flex items-center justify-between group">
                                        <div className="flex-1 min-w-0 pr-10">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black uppercase ${p.type === 'Premium' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700/30 text-slate-400'}`}>
                                                    {p.type.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black uppercase tracking-widest truncate text-white">{p.name}</h4>
                                                    <span className="text-[9px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded mt-1 inline-block">{p.type}</span>
                                                </div>
                                            </div>
                                            <p className="text-[9px] font-mono text-slate-600 truncate pl-14">{p.url}</p>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setPlaylistModalState({ open: true, initialData: p })}
                                                className="p-3 bg-blue-500/10 rounded-xl text-blue-400 hover:bg-blue-500 hover:text-white transition-all"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDeletePlaylist(p.id, p.name)}
                                                className="p-3 bg-red-500/10 rounded-xl text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* USERS VIEW (Re-styled) */}
                    {adminView === 'users' && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                            <div className="flex justify-end">
                                <button onClick={fetchUsers} className="text-orange-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">Refresh Network</button>
                            </div>
                            {users.map((u) => (
                                <div key={u.id} className="bg-white/5 p-6 rounded-[28px] border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-black border border-white/5 flex items-center justify-center text-slate-500 font-black text-lg">
                                            {u.username?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black uppercase tracking-widest text-white">{u.username}</h4>
                                            <p className="text-[9px] font-mono text-slate-500 uppercase mt-0.5 tracking-wider">ID: {u.id.split('-')[0]}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border ${u.rank === 'Admin' ? 'bg-orange-900/20 border-orange-500/20 text-orange-500' : 'bg-emerald-900/20 border-emerald-500/20 text-emerald-500'}`}>
                                        {u.rank}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* R2 UPLOAD VIEW */}
                    {adminView === 'upload' && (
                        <div className="animate-in fade-in zoom-in-95 duration-500">
                            <MediaUploadPanel onUploadComplete={() => {
                                // Optionally switch to library or show success notification
                                cloudService.logEvent(user.username, 'Uploaded media to R2');
                            }} />
                        </div>
                    )}

                    {/* R2 STORAGE ANALYTICS VIEW */}
                    {adminView === 'storage' && (
                        <div className="animate-in fade-in zoom-in-95 duration-500">
                            <StorageAnalytics />
                        </div>
                    )}
                </div>
            </main>

            {/* MODALS */}
            {playlistModalState.open && (
                <AddPlaylistModal
                    onClose={() => setPlaylistModalState({ open: false })}
                    onSuccess={() => {
                        fetchPlaylists();
                        cloudService.logEvent(user.username, 'Updated playlist source');
                    }}
                    initialData={playlistModalState.initialData}
                />
            )}
            {mediaModalState.open && (
                <MediaModal
                    onClose={() => setMediaModalState({ open: false })}
                    onSuccess={() => {
                        fetchMediaLibrary();
                        cloudService.logEvent(user.username, 'Updated Library');
                    }}
                    initialData={mediaModalState.initialData}
                    parentId={mediaModalState.parentId}
                />
            )}
            {/* MOBILE BOTTOM NAV */}
            <div className="lg:hidden fixed bottom-6 left-4 right-4 z-50">
                <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-3xl p-2 shadow-2xl flex items-center justify-between overflow-x-auto no-scrollbar">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setAdminView(item.id)}
                            className={`flex flex-col items-center justify-center min-w-[3.5rem] p-3 rounded-2xl transition-all ${adminView === item.id ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40' : 'text-slate-500 hover:text-white'}`}
                        >
                            <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {item.icon}
                            </svg>
                        </button>
                    ))}
                    <div className="w-px h-8 bg-white/10 mx-2" />
                    <button
                        onClick={onClose}
                        className="flex flex-col items-center justify-center min-w-[3.5rem] p-3 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
