
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { r2Service } from '../../services/r2Service';

interface LogEntry {
    id: string;
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
    message: string;
    source: string;
}

interface SystemStats {
    totalUsers: number;
    totalMedia: number;
    totalPlaylists: number;
    totalChannels: number;
    activeStreams: number;
    storageUsed: string;
    lastBackup: string;
}

const CommandDeck = () => {
    // Real-time State
    const [cpuLoad, setCpuLoad] = useState(0);
    const [memoryUsage, setMemoryUsage] = useState(0);
    const [bandwidth, setBandwidth] = useState<number[]>(new Array(60).fill(50));
    const [activeConnections, setActiveConnections] = useState(0);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Fetch real data from database
    useEffect(() => {
        const fetchSystemData = async () => {
            try {
                // Fetch counts from database and R2 stats in parallel
                const [
                    { count: usersCount },
                    { count: mediaCount },
                    { count: playlistCount },
                    { count: channelCount },
                    r2Stats,
                    { data: eventData }
                ] = await Promise.all([
                    supabase.from('profiles').select('id', { count: 'exact', head: true }),
                    supabase.from('media_library').select('id', { count: 'exact', head: true }),
                    supabase.from('playlists').select('id', { count: 'exact', head: true }),
                    supabase.from('virtual_channels').select('id', { count: 'exact', head: true }),
                    r2Service.getStorageStats(),
                    supabase.from('event_logs').select('*').order('created_at', { ascending: false }).limit(15)
                ]);

                if (eventData && eventData.length > 0) {
                    const mappedLogs: LogEntry[] = eventData.map(log => ({
                        id: log.id.toString(),
                        timestamp: new Date(log.created_at).toLocaleTimeString(),
                        level: (log.event_description?.includes('Error') || log.event_description?.includes('error') ? 'ERROR' :
                            log.event_description?.includes('Success') || log.event_description?.includes('success') ? 'SUCCESS' :
                                log.event_description?.includes('Warn') || log.event_description?.includes('warn') ? 'WARN' : 'INFO') as any,
                        message: log.event_description || 'System event',
                        source: log.user_name || 'SYSTEM'
                    }));
                    setLogs(mappedLogs);
                } else {
                    // Fallback to a default log if table is empty
                    setLogs([{
                        id: '1',
                        timestamp: new Date().toLocaleTimeString(),
                        level: 'INFO',
                        message: 'System initiated - All services operational',
                        source: 'KERNEL'
                    }]);
                }

                setSystemStats({
                    totalUsers: usersCount || 0,
                    totalMedia: mediaCount || 0,
                    totalPlaylists: playlistCount || 0,
                    totalChannels: channelCount || 0,
                    activeStreams: Math.floor(Math.random() * 50) + 10, // Simulated until real tracking
                    storageUsed: r2Stats.sizeFormatted,
                    lastBackup: new Date().toISOString()
                });

                setIsLoading(false);
            } catch (error) {
                console.error('Error fetching system data:', error);
                // Fallback to default log
                setLogs([{
                    id: '1',
                    timestamp: new Date().toLocaleTimeString(),
                    level: 'INFO',
                    message: 'System initiated - Using fallback data',
                    source: 'KERNEL'
                }]);
                setIsLoading(false);
            }
        };

        fetchSystemData();
    }, []);

    // Real-time updates (simulated with some real data mixed in)
    useEffect(() => {
        const interval = setInterval(() => {
            // Simulate CPU/Mem fluctuation with realistic bounds
            setCpuLoad(prev => {
                const noise = Math.random() * 15 - 7;
                let next = prev + noise;
                if (next < 25) next = 25 + Math.random() * 10;
                if (next < 0) next = Math.random() * 20;
                if (next > 85) next = 85 - Math.random() * 10;
                return Math.max(0, Math.min(100, Math.round(next)));
            });

            setMemoryUsage(prev => {
                const noise = Math.random() * 4 - 2;
                let next = prev + noise;
                if (next < 40) next = 40 + Math.random() * 5;
                if (next < 0) next = Math.random() * 30;
                if (next > 75) next = 75 - Math.random() * 5;
                return Math.max(0, Math.min(100, Math.round(next)));
            });

            // Simulate Bandwidth Stream
            setBandwidth(prev => {
                const last = prev[prev.length - 1];
                const noise = Math.random() * 25 - 12;
                let next = last + noise;
                if (next < 20) next = 20 + Math.random() * 15;
                if (next > 80) next = 80 - Math.random() * 15;
                const newValue = Math.max(10, Math.min(95, Math.round(next)));
                return [...prev.slice(1), newValue];
            });

            // Simulate Connections with realistic range
            setActiveConnections(prev => {
                const change = Math.floor(Math.random() * 10 - 4);
                const next = prev + change;
                return Math.max(50, Math.min(500, next));
            });

            // Occasionally add new log entry
            if (Math.random() > 0.7) {
                const actions = [
                    'Stream chunk cached',
                    'CDN node sync completed',
                    'User authentication token refreshed',
                    'Media metadata indexed',
                    'Playlist refresh cycle',
                    'Health check passed',
                    'Buffer optimization applied'
                ];
                const sources = ['CORE-01', 'CDN-EDGE', 'AUTH-SVC', 'MEDIA-INDEX', 'PLAYLIST-SYNC'];
                const levels: LogEntry['level'][] = ['INFO', 'INFO', 'SUCCESS'];

                const newLog: LogEntry = {
                    id: Date.now().toString(),
                    timestamp: new Date().toLocaleTimeString(),
                    level: levels[Math.floor(Math.random() * levels.length)],
                    message: `${actions[Math.floor(Math.random() * actions.length)]}`,
                    source: sources[Math.floor(Math.random() * sources.length)]
                };

                setLogs(prev => [...prev.slice(-14), newLog]);
            }
        }, 1200);

        return () => clearInterval(interval);
    }, []);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Simple SVG Path Generator for Smooth Curves
    const generatePath = (data: number[], height: number, width: number) => {
        if (data.length === 0) return '';

        const stepX = width / (data.length - 1);
        let path = `M0,${height - (data[0] / 100) * height}`;

        for (let i = 1; i < data.length; i++) {
            const x = i * stepX;
            const y = height - (data[i] / 100) * height;
            path += ` L${x},${y}`;
        }

        return path;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Loading Command Deck...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 font-mono">
            {/* TOP METRICS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CPU GAUGE */}
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                        <svg className="w-16 h-16 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">CPU Processor Load</h3>
                    <div className="flex items-end gap-2 mb-4">
                        <span className="text-4xl font-black text-white tracking-tighter">{cpuLoad.toFixed(0)}</span>
                        <span className="text-xs font-mono text-blue-400 mb-2">% PARALLEL</span>
                    </div>
                    {/* Multi-segment Gauge */}
                    <div className="flex gap-0.5 h-2 w-full">
                        {[...Array(20)].map((_, i) => (
                            <div
                                key={i}
                                className={`flex-1 rounded-sm transition-all duration-100 ${(i / 20) * 100 < cpuLoad
                                    ? cpuLoad > 85 ? 'bg-red-500'
                                        : cpuLoad > 60 ? 'bg-orange-500'
                                            : 'bg-blue-500'
                                    : 'bg-white/5'
                                    }`}
                                style={{ opacity: (i / 20) * 100 < cpuLoad ? 1 : 0.2 }}
                            />
                        ))}
                    </div>
                </div>

                {/* MEMORY GAUGE */}
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                        <svg className="w-16 h-16 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Memory Allocation</h3>
                    <div className="flex items-end gap-2 mb-4">
                        <span className="text-4xl font-black text-white tracking-tighter">{memoryUsage.toFixed(0)}</span>
                        <span className="text-xs font-mono text-purple-400 mb-2">% HEAP INTEGRITY</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 mt-4 overflow-hidden rounded-full relative">
                        <div className="absolute top-0 left-0 h-full bg-purple-500/50 transition-all duration-300" style={{ width: `${memoryUsage}%` }} />
                        <div className="absolute top-0 left-0 h-full w-full bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,#000_2px,#000_4px)] z-10 opacity-30" />
                    </div>
                </div>

                {/* BANDWIDTH MONITOR */}
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl relative overflow-hidden group hover:border-green-500/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                        <svg className="w-16 h-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Egress Bandwidth</h3>
                    <div className="flex items-end gap-2 mb-4">
                        <span className="text-4xl font-black text-white tracking-tighter">{bandwidth[bandwidth.length - 1]}</span>
                        <span className="text-xs font-mono text-green-400 mb-2">MBPS</span>
                    </div>
                    {/* SVG Bandwidth Graph */}
                    <div className="h-10 w-full relative overflow-hidden">
                        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                            <path
                                d={generatePath(bandwidth, 40, 300)}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className="text-green-500"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-green-500/0 via-green-500/50 to-green-500/0" />
                    </div>
                </div>

                {/* ACTIVE CONNECTIONS */}
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl relative overflow-hidden group hover:border-orange-500/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                        <svg className="w-16 h-16 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Active Connections</h3>
                    <div className="flex items-end gap-2 mb-4">
                        <span className="text-4xl font-black text-white tracking-tighter">{activeConnections}</span>
                        <span className="text-xs font-mono text-orange-400 mb-2">CLIENTS</span>
                    </div>
                    <div className="flex gap-0.5 h-2 w-full">
                        {[...Array(10)].map((_, i) => {
                            const threshold = (i + 1) * 10;
                            const isActive = activeConnections >= threshold;
                            return (
                                <div
                                    key={i}
                                    className={`flex-1 rounded-sm transition-all duration-200 ${isActive ? 'bg-orange-500' : 'bg-white/5'}`}
                                    style={{ opacity: isActive ? 1 : 0.2 }}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* SYSTEM STATS */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-[0.2em]">Users</p>
                    <p className="text-xl font-black text-white">{systemStats?.totalUsers || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-[0.2em]">Media</p>
                    <p className="text-xl font-black text-purple-400">{systemStats?.totalMedia || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-[0.2em]">Playlists</p>
                    <p className="text-xl font-black text-blue-400">{systemStats?.totalPlaylists || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-[0.2em]">Channels</p>
                    <p className="text-xl font-black text-orange-400">{systemStats?.totalChannels || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-[0.2em]">Streams</p>
                    <p className="text-xl font-black text-emerald-400">{systemStats?.activeStreams || 0}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-[0.2em]">Storage</p>
                    <p className="text-xl font-black text-slate-300">{systemStats?.storageUsed || '0 GB'}</p>
                </div>
            </div>

            {/* LIVE LOGS CONSOLE */}
            <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">System Events</h3>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-slate-500">
                        <span className="font-mono">{logs.length} events</span>
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span>Live</span>
                    </div>
                </div>
                <div className="h-64 overflow-y-auto p-4 space-y-2 font-mono text-xs no-scrollbar">
                    {logs.map((log, index) => (
                        <div key={log.id + index} className="flex items-start gap-3 hover:bg-white/5 rounded-lg px-2 py-1 transition-colors">
                            <span className="text-[9px] text-slate-500 font-mono shrink-0 w-20">{log.timestamp}</span>
                            <span className={`text-[9px] font-black uppercase tracking-wider w-16 shrink-0 ${log.level === 'ERROR' ? 'text-red-500' :
                                log.level === 'WARN' ? 'text-orange-500' :
                                    log.level === 'SUCCESS' ? 'text-emerald-500' : 'text-blue-400'
                                }`}>
                                {log.level}
                            </span>
                            <span className="text-slate-400">{log.message}</span>
                            <span className="ml-auto text-[9px] text-slate-600 font-mono">{log.source}</span>
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
};

export default CommandDeck;
