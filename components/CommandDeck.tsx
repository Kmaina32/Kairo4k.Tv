import React, { useState } from 'react';

interface CommandDeckProps {
    isPlaying: boolean;
    isMuted: boolean;
    volume: number;
    isRecording: boolean;
    qualityLevels: { index: number; height: number }[];
    currentQuality: number;
    onSetQuality: (index: number) => void;
    onTogglePlay: () => void;
    onToggleMute: () => void;
    onVolumeChange: (val: number) => void;
    onToggleFullscreen: () => void;
    onToggleStats: () => void;
    onTogglePiP: () => void;
    onStartRecording: () => void;
    onStopRecording: () => void;
    showControls: boolean;
}

const CommandDeck = ({
    isPlaying,
    isMuted,
    volume,
    isRecording,
    qualityLevels = [],
    currentQuality,
    onSetQuality,
    onTogglePlay,
    onToggleMute,
    onVolumeChange,
    onToggleFullscreen,
    onToggleStats,
    onTogglePiP,
    onStartRecording,
    onStopRecording,
    showControls
}: CommandDeckProps) => {

    const [showQualityMenu, setShowQualityMenu] = useState(false);

    return (
        <div className={`absolute bottom-6 inset-x-0 mx-auto w-full max-w-4xl transition-all duration-500 z-50
      ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>

            <div className="glass-panel mx-4 p-2 md:p-3 rounded-[2rem] bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.6)] flex items-center justify-between gap-4">

                {/* LEFT: TRANSPORT */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onTogglePlay}
                        className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl md:rounded-[20px] shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all hover:scale-105 active:scale-95"
                    >
                        {isPlaying ? (
                            <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                        ) : (
                            <svg className="w-5 h-5 md:w-6 md:h-6 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        )}
                    </button>

                    <div className="hidden sm:flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl ml-2">
                        <button onClick={onToggleMute} className="p-2 text-white/60 hover:text-white transition-colors">
                            {isMuted || volume === 0 ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15L4 13.414V10.586L5.586 9H8l4-4v14l-4-4H5.586z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15L4 13.414V10.586L5.586 9H8l4-4v14l-4-4H5.586z" /></svg>
                            )}
                        </button>
                        <input
                            type="range" min="0" max="1" step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                            className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>
                </div>

                {/* CENTER: DECORATIVE / BRANDING */}
                <div className="flex-1 flex justify-center">
                    <div className="h-1 w-full max-w-[200px] bg-gradient-to-r from-transparent via-white/10 to-transparent relative">
                        <div className="absolute inset-0 bg-indigo-500/50 w-1/2 mx-auto animate-pulse blur-sm" />
                    </div>
                </div>

                {/* RIGHT: UTILITIES */}
                <div className="flex items-center gap-2">
                    {/* QUALITY SELECTOR */}
                    <div className="relative">
                        <button
                            onClick={() => setShowQualityMenu(!showQualityMenu)}
                            className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/5 text-[10px] font-black tracking-wider text-white/60 hover:text-white hover:bg-white/10 transition-all uppercase"
                        >
                            {currentQuality === -1 || !qualityLevels?.length ? 'AUTO' : `${qualityLevels.find(q => q.index === currentQuality)?.height || 'HD'}P`}
                        </button>
                        {showQualityMenu && (
                            <div className="absolute bottom-full mb-2 right-0 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden p-1 min-w-[80px] shadow-xl">
                                <button
                                    onClick={() => { onSetQuality(-1); setShowQualityMenu(false); }}
                                    className={`w-full text-left px-3 py-2 text-[10px] font-black hover:bg-white/10 rounded-lg ${currentQuality === -1 ? 'text-indigo-400' : 'text-slate-400'}`}
                                >
                                    AUTO
                                </button>
                                {qualityLevels && qualityLevels.map(q => (
                                    <button
                                        key={q.index}
                                        onClick={() => { onSetQuality(q.index); setShowQualityMenu(false); }}
                                        className={`w-full text-left px-3 py-2 text-[10px] font-black hover:bg-white/10 rounded-lg ${currentQuality === q.index ? 'text-indigo-400' : 'text-slate-400'}`}
                                    >
                                        {q.height}P
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onToggleStats}
                        className="hidden sm:flex p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/5 text-white/40 hover:text-emerald-400 hover:bg-white/10 transition-all"
                        title="System Diagnostics"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
                    </button>

                    <button
                        onClick={onTogglePiP}
                        className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                        title="Picture in Picture"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-10 9h9v6h-9z" transform="scale(0.8) translate(3,3)" /></svg>
                    </button>

                    <button
                        onClick={isRecording ? onStartRecording : onStopRecording}
                        className={`hidden sm:flex p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${isRecording ? 'bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-white/5 text-white/40 hover:text-white'}`}
                        title="Record Stream"
                    >
                        <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500' : 'bg-current'}`} />
                    </button>

                    <button
                        onClick={onToggleFullscreen}
                        className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CommandDeck;
