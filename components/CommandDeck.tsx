
import React, { useState, useEffect, useRef } from 'react';

interface LogEntry {
    id: string;
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
    message: string;
    source: string;
}

const CommandDeck = () => {
    // Real-time State
    const [cpuLoad, setCpuLoad] = useState(0);
    const [memoryUsage, setMemoryUsage] = useState(0);
    const [bandwidth, setBandwidth] = useState<number[]>(new Array(60).fill(50));
    const [activeConnections, setActiveConnections] = useState(142);
    const [logs, setLogs] = useState<LogEntry[]>([
        { id: '1', timestamp: new Date().toLocaleTimeString(), level: 'INFO', message: 'System Initiated', source: 'KERNEL' }
    ]);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Simulated Real-time Data Feed
    useEffect(() => {
        const interval = setInterval(() => {
            // Simulate CPU/Mem fluctuation
            setCpuLoad(prev => {
                const noise = Math.random() * 20 - 10;
                let next = prev + noise;
                if (next < 20) next = 20 + Math.random() * 10;
                if (next > 90) next = 90 - Math.random() * 10;
                return Math.max(0, Math.min(100, next));
            });

            setMemoryUsage(prev => {
                const noise = Math.random() * 5 - 2.5;
                let next = prev + noise;
                if (next < 40) next = 40 + Math.random() * 5;
                if (next > 80) next = 80 - Math.random() * 5;
                return Math.max(0, Math.min(100, next));
            });

            // Simulate Bandwidth Stream
            setBandwidth(prev => {
                const last = prev[prev.length - 1];
                const noise = Math.random() * 30 - 15;
                let next = last + noise;
                if (next < 10) next = 10 + Math.random() * 10;
                if (next > 90) next = 90 - Math.random() * 10;
                return [...prev.slice(1), next];
            });

            // Simulate Connections
            setActiveConnections(prev => {
                const change = Math.floor(Math.random() * 7 - 3);
                return Math.max(100, prev + change);
            });

            // Simulate Logs
            if (Math.random() > 0.6) {
                addLog();
            }
        }, 800);

        return () => clearInterval(interval);
    }, []);

    const addLog = () => {
        const actions = ['Packet routed', 'Handshake accepted', 'Buffer flushed', 'Key rotation', 'Signal optimized', 'Node synced', 'Latency correction', 'Cache invalidated'];
        const sources = ['CORE-01', 'NET-GATE', 'DB-SHARD', 'AUTH-SVC', 'MEDIA-09', 'LB-03'];
        const levels: LogEntry['level'][] = ['INFO', 'INFO', 'INFO', 'SUCCESS', 'WARN'];

        const newLog: LogEntry = {
            id: Math.random().toString(36),
            timestamp: new Date().toLocaleTimeString(),
            level: levels[Math.floor(Math.random() * levels.length)],
            message: `${actions[Math.floor(Math.random() * actions.length)]} - ${Math.random().toString(16).substring(2, 6).toUpperCase()}`,
            source: sources[Math.floor(Math.random() * sources.length)]
        };

        setLogs(prev => [...prev.slice(-14), newLog]);
    };

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Simple SVG Path Generator for Smooth Curves
    const generatePath = (data: number[], height: number, width: number) => {
        if (data.length === 0) return '';

        const stepX = width / (data.length - 1);

        // Start point
        let path = `M0,${height - (data[0] / 100) * height}`;

        for (let i = 1; i < data.length; i++) {
            const x = i * stepX;
            const y = height - (data[i] / 100) * height;
            // Simple line for now to ensure performance
            path += ` L${x},${y}`;
        }

        return path;
    };

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
                        <div className="absolute top-0 left-0 h-full w-full bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,#000_2px,#000_4px)] z-10 opacity-30" />
                        <div className={`h-full transition-all duration-300 ${memoryUsage > 90 ? 'bg-red-500' : 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]'}`} style={{ width: `${memoryUsage}%` }} />
                    </div>
                </div>

                {/* ACTIVE CONNECTIONS */}
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                        <svg className="w-16 h-16 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Network Nodes</h3>
                    <div className="flex items-end gap-2 mb-4">
                        <span className="text-4xl font-black text-white tracking-tighter">{activeConnections}</span>
                        <span className="text-xs font-mono text-emerald-500 mb-2">ACTIVE SESSIONS</span>
                    </div>
                    <div className="grid grid-cols-10 gap-1 h-2">
                        {[...Array(20)].map((_, i) => (
                            <div key={i} className={`rounded-full transition-all duration-500 ${Math.random() > 0.3 ? 'bg-emerald-500/80 shadow-[0_0_4px_rgba(16,185,129,0.8)]' : 'bg-emerald-900/40'}`} style={{ opacity: Math.random() > 0.5 ? 1 : 0.4 }} />
                        ))}
                    </div>
                </div>

                {/* SYSTEM STATUS */}
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between hover:border-white/20 transition-colors">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">System State</h3>
                        <div className="flex items-center gap-3 mt-4">
                            <div className="relative">
                                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,1)]" />
                                <div className="absolute inset-0 rounded-full border border-emerald-500 animate-ping" />
                            </div>
                            <span className="text-xl font-black text-white tracking-widest text-shadow-glow">OPTIMAL</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-4 border-t border-white/5 pt-4">
                        <span>UPTIME</span>
                        <span className="text-white font-bold">42d 13h 22m</span>
                    </div>
                </div>
            </div>

            {/* BANDWIDTH VISUALIZER */}
            <div className="bg-[#050510] border border-white/10 rounded-[24px] p-6 relative overflow-hidden shadow-2xl">
                <div className="flex justify-between items-center mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-orange-500 rounded-sm animate-pulse" />
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">
                            Realtime Network Traffic
                        </h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">800ms Interval</span>
                </div>

                {/* Graph Container */}
                <div className="h-48 w-full relative">
                    {/* Grid Lines */}
                    <div className="absolute inset-0 grid grid-rows-4 grid-cols-6 pointer-events-none opacity-20">
                        {[...Array(24)].map((_, i) => (
                            <div key={i} className="border-r border-b border-orange-500/20" />
                        ))}
                    </div>

                    {/* SVG GRAPH */}
                    <svg className="w-full h-full relative z-0" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <defs>
                            <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgba(249, 115, 22, 0.4)" />
                                <stop offset="100%" stopColor="rgba(249, 115, 22, 0)" />
                            </linearGradient>
                            <clipPath id="clip">
                                <rect width="100" height="100" />
                            </clipPath>
                        </defs>

                        {/* Area Fill */}
                        <path
                            d={`M0,100 ${generatePath(bandwidth, 100, 100).replace('M0,', 'L0,')} L100,100 Z`}
                            fill="url(#trafficGradient)"
                            className="transition-all duration-300 ease-linear"
                        />

                        {/* Stroke Line */}
                        <path
                            d={generatePath(bandwidth, 100, 100)}
                            fill="none"
                            stroke="#f97316"
                            strokeWidth="0.5"
                            vectorEffect="non-scaling-stroke"
                            className="transition-all duration-300 ease-linear drop-shadow-[0_0_5px_rgba(249,115,22,0.8)]"
                        />
                    </svg>

                    {/* Scanline Effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/10 to-transparent h-[4px] w-full animate-[scan_3s_linear_infinite] pointer-events-none" />
                </div>
            </div>

            {/* BOTTOM ROW: LOGS & QUICK ACTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LIVE TERMINAL */}
                <div className="lg:col-span-2 bg-[#0a0a0a] border border-white/10 rounded-[24px] p-1 font-mono text-[10px] h-64 flex flex-col relative overflow-hidden shadow-2xl">
                    <div className="bg-white/5 px-4 py-2 flex justify-between items-center rounded-t-[20px] border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3" /></svg>
                            <span className="text-slate-400 uppercase tracking-widest font-bold">System Event Log</span>
                        </div>
                        <div className="flex gap-1.5 opacity-50">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar text-slate-300 font-mono tracking-tight">
                        {logs.map((log) => (
                            <div key={log.id} className="flex gap-3 hover:bg-white/5 p-0.5 rounded transition-colors border-l-2 border-transparent hover:border-white/20 pl-2">
                                <span className="text-slate-600 select-none w-16 text-right">{log.timestamp}</span>
                                <span className={`font-bold w-12 text-center rounded px-1 ${log.level === 'INFO' ? 'bg-blue-500/10 text-blue-400' :
                                        log.level === 'WARN' ? 'bg-yellow-500/10 text-yellow-400' :
                                            log.level === 'ERROR' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                                    }`}>{log.level}</span>
                                <span className="text-purple-400 w-20 select-none font-bold opacity-80">{log.source}</span>
                                <span className="flex-1 text-slate-300 opacity-90">{log.message}</span>
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>

                {/* QUICK METRICS/ACTIONS */}
                <div className="bg-gradient-to-br from-white/5 to-transparent rounded-[24px] border border-white/10 p-6 flex flex-col justify-between backdrop-blur-md">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            Environment
                        </h3>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Region</span>
                                <span className="text-[10px] font-mono text-white bg-white/10 px-2 py-1 rounded">US-EAST-1</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Latency</span>
                                <span className="text-xs text-emerald-400 font-mono">24ms <span className="text-slate-600">Avg</span></span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Storage</span>
                                <span className="text-xs text-orange-400 font-mono">82% <span className="text-slate-600">Used</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <button className="py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-slate-300 hover:text-white border border-white/5 hover:border-white/20">
                            Flush Cache
                        </button>
                        <button className="py-3 bg-orange-600/20 hover:bg-orange-600/30 text-orange-500 hover:text-orange-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-orange-500/20 hover:border-orange-500/40">
                            Diagnostics
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(500%); opacity: 0; }
                }
                .text-shadow-glow {
                    text-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
                }
            `}</style>
        </div>
    );
};

export default CommandDeck;
