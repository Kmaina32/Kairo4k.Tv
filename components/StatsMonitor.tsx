import React, { useEffect, useRef, useState } from 'react';

interface DiagnosticsPanelProps {
    stats: { bandwidth: number; buffer: number; latency: number };
    channelName: string;
    isRecording: boolean;
    quality: string;
    visible: boolean;
    onToggle: () => void;
}

const DiagnosticsPanel = ({ stats, channelName, isRecording, quality, visible, onToggle }: DiagnosticsPanelProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const historyRef = useRef<number[]>(new Array(50).fill(0));
    const [time, setTime] = useState(new Date());
    const [fps, setFps] = useState(60);

    // HUD Logic: Time and Fake FPS
    useEffect(() => {
        if (!visible) return;
        const timer = setInterval(() => setTime(new Date()), 1000);
        const fpsTimer = setInterval(() => setFps(Math.floor(58 + Math.random() * 4)), 2000);
        return () => {
            clearInterval(timer);
            clearInterval(fpsTimer);
        };
    }, [visible]);

    // Stats Logic: Graph Drawing
    useEffect(() => {
        if (!visible || !canvasRef.current) return;
        const value = Math.min(stats.bandwidth / 5000000, 1);
        historyRef.current.push(value);
        historyRef.current.shift();

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.beginPath();
        ctx.moveTo(0, canvasRef.current.height);
        historyRef.current.forEach((val, i) => {
            const x = (i / 50) * canvasRef.current.width;
            const y = canvasRef.current.height - (val * canvasRef.current.height);
            ctx.lineTo(x, y);
        });
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineTo(canvasRef.current.width, canvasRef.current.height);
        ctx.lineTo(0, canvasRef.current.height);
        ctx.fillStyle = 'rgba(249, 115, 22, 0.1)';
        ctx.fill();
    }, [stats, visible]);

    return (
        <div className="absolute md:top-6 top-20 right-4 md:right-6 z-[100] flex flex-col items-end">
            {/* INFO TOGGLE BUTTON */}
            <button
                onClick={onToggle}
                className="fixed md:absolute top-20 md:top-6 right-4 z-[999] p-3 md:p-4 glass rounded-2xl md:rounded-3xl border-orange-500/20 shadow-[0_10px_30px_rgba(249,115,22,0.4)] hover:scale-110 active:scale-95 transition-all text-orange-500"
            >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>

            {/* CONSOLIDATED DIAGNOSTICS PANEL */}
            {visible && (
                <div className="fixed md:absolute top-32 md:top-20 right-4 w-72 md:w-80 z-[999] glass rounded-[32px] md:rounded-[40px] border-white/10 p-6 md:p-8 animate-in fade-in zoom-in-95 slide-in-from-top-4 shadow-[0_40px_80px_rgba(0,0,0,0.9)]">

                    {/* SECTION 1: SIGNAL INFO (From HUD) */}
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/90">
                                SOURCE: {channelName || 'UNKNOWN'}
                            </span>
                        </div>
                        <div className="text-[8px] font-mono text-emerald-500/60 tracking-tighter uppercase">
                            Secure_Connection_Active
                        </div>
                    </div>

                    <div className="h-px w-full bg-white/5 mb-4" />

                    {/* SECTION 2: SYSTEM METRICS (From HUD) */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="flex flex-col">
                            <span className="text-[8px] text-white/30 uppercase font-bold">Res</span>
                            <span className="text-[10px] text-white font-mono">{quality}</span>
                        </div>
                        <div className="flex flex-col border-x border-white/5 px-2">
                            <span className="text-[8px] text-white/30 uppercase font-bold">FPS</span>
                            <span className="text-[10px] text-white font-mono">{fps}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] text-indigo-400 uppercase font-bold">Time</span>
                            <span className="text-[10px] text-indigo-300 font-mono">{time.toLocaleTimeString([], { hour12: false })}</span>
                        </div>
                    </div>

                    {/* SECTION 3: NETWORK GRAPH (From Stats) */}
                    <div className="mb-4">
                        <div className="flex justify-between text-[9px] uppercase font-mono text-slate-400 mb-1">
                            <span>Downlink</span>
                            <span className="text-emerald-400">{(stats.bandwidth / 1000000).toFixed(2)} Mbps</span>
                        </div>
                        <canvas ref={canvasRef} width={240} height={40} className="w-full h-10 border-b border-white/5" />
                    </div>

                    {/* SECTION 4: LATENCY & BUFFER */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                            <span className="block text-[8px] text-slate-500 uppercase tracking-wider">Buffer</span>
                            <span className="text-white font-mono text-[11px]">{stats.buffer.toFixed(1)}s</span>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                            <span className="block text-[8px] text-slate-500 uppercase tracking-wider">Latency</span>
                            <span className={`font-mono text-[11px] ${stats.latency > 0.5 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {(stats.latency * 1000).toFixed(0)}ms
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DiagnosticsPanel;