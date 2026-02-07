import React, { useEffect, useRef } from 'react';

interface StatsMonitorProps {
    stats: {
        bandwidth: number;
        buffer: number;
        latency: number;
    };
    visible: boolean;
    onToggle: () => void;
}

const StatsMonitor = ({ stats, visible, onToggle }: StatsMonitorProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const historyRef = useRef<number[]>(new Array(50).fill(0));

    useEffect(() => {
        if (!visible) return;

        const value = Math.min(stats.bandwidth / 5000000, 1);
        historyRef.current.push(value);
        historyRef.current.shift();

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);

        historyRef.current.forEach((val, i) => {
            const x = (i / 50) * canvas.width;
            const y = canvas.height - (val * canvas.height);
            ctx.lineTo(x, y);
        });

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
        ctx.fill();
    }, [stats, visible]);

    return (
        /* This is the master container that holds both the icon and the panel */
        <div className="absolute top-6 right-6 z-[100] flex flex-col items-end">

            {/* 1. THE ICON BUTTON */}
            <button
                onClick={onToggle}
                className={`p-2.5 rounded-full transition-all duration-300 border backdrop-blur-md ${visible
                        ? 'bg-emerald-500 border-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                        : 'bg-black/40 border-white/10 text-white hover:bg-black/60'
                    }`}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                </svg>
            </button>

            {/* 2. THE STATS PANEL (Positioned relatively to the container above) */}
            {visible && (
                <div className="mt-3 bg-black/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl w-64 shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-top-2 origin-top-right">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-4 border-b border-white/5 pb-2">
                        System Diagnostics
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-[9px] uppercase font-mono text-slate-400 mb-1">
                                <span>Downlink</span>
                                <span className="text-emerald-400">{(stats.bandwidth / 1000000).toFixed(2)} Mbps</span>
                            </div>
                            <canvas ref={canvasRef} width={220} height={40} className="w-full h-10 border-b border-white/5" />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                <span className="block text-[8px] text-slate-500 uppercase tracking-wider">Buffer</span>
                                <span className="text-white font-mono text-sm">{stats.buffer.toFixed(1)}s</span>
                            </div>
                            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                                <span className="block text-[8px] text-slate-500 uppercase tracking-wider">Latency</span>
                                <span className={`font-mono text-sm ${stats.latency > 0.5 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {(stats.latency * 1000).toFixed(0)}ms
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatsMonitor;