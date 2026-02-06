
import React from 'react';

interface VideoControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  playbackRate: number;
  isRecording: boolean;
  isTheater: boolean;
  qualityLevels: any[];
  currentLevel: number;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (val: number) => void;
  onPlaybackRateChange: (val: number) => void;
  onQualityChange: (level: number) => void;
  onToggleTheater: () => void;
  onToggleFullscreen: () => void;
  onTogglePIP: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  showControls: boolean;
}

const VideoControls = ({
  isPlaying,
  isMuted,
  volume,
  playbackRate,
  isRecording,
  isTheater,
  qualityLevels,
  currentLevel,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onPlaybackRateChange,
  onQualityChange,
  onToggleTheater,
  onToggleFullscreen,
  onTogglePIP,
  onStartRecording,
  onStopRecording,
  showControls
}: VideoControlsProps) => {
  const [showSpeedMenu, setShowSpeedMenu] = React.useState(false);
  const [showQualityMenu, setShowQualityMenu] = React.useState(false);

  return (
    <div className={`absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-black/40 transition-opacity duration-700 flex flex-col justify-end p-6 md:p-8 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4 md:space-x-6">
          {/* Play/Pause */}
          <button onClick={onTogglePlay} className="text-white hover:scale-110 transition-all p-3 bg-white/10 rounded-full hover:bg-indigo-600">
            {isPlaying ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
          </button>
          
          {/* Volume Group */}
          <div className="flex items-center space-x-3 group/vol">
            <button onClick={onToggleMute} className="text-white/70 hover:text-white transition-colors">
              {isMuted || volume === 0 ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M5.586 15L4 13.414V10.586L5.586 9H8l4-4v14l-4-4H5.586z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15L4 13.414V10.586L5.586 9H8l4-4v14l-4-4H5.586z" /></svg>}
            </button>
            <input 
              type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} 
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 md:w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
            />
          </div>

          {/* Speed Selector */}
          <div className="relative">
            <button onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowQualityMenu(false); }} className="text-[10px] md:text-[11px] font-black text-white/80 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 transition-all hover:bg-white/5 whitespace-nowrap">
              {playbackRate}x
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-full mb-4 bg-slate-900/95 border border-white/10 rounded-2xl p-2 flex flex-col min-w-[80px] backdrop-blur-xl shadow-2xl z-[100]">
                {[0.5, 1, 1.25, 1.5, 2].map(r => (
                  <button key={r} onClick={() => { onPlaybackRateChange(r); setShowSpeedMenu(false); }} className={`text-[10px] font-black p-2.5 rounded-xl transition-all ${playbackRate === r ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{r}x</button>
                ))}
              </div>
            )}
          </div>

          {/* Quality Selector (4K Focus) */}
          <div className="relative">
            <button onClick={() => { setShowQualityMenu(!showQualityMenu); setShowSpeedMenu(false); }} className="text-[10px] md:text-[11px] font-black text-white/80 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 transition-all hover:bg-white/5 whitespace-nowrap">
              {currentLevel === -1 ? 'AUTO' : (qualityLevels[currentLevel]?.height ? `${qualityLevels[currentLevel].height}p` : 'HD')}
            </button>
            {showQualityMenu && (
              <div className="absolute bottom-full mb-4 bg-slate-900/95 border border-white/10 rounded-2xl p-2 flex flex-col min-w-[100px] backdrop-blur-xl shadow-2xl z-[100]">
                <button onClick={() => { onQualityChange(-1); setShowQualityMenu(false); }} className={`text-[10px] font-black p-2.5 rounded-xl text-left transition-all ${currentLevel === -1 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>AUTO</button>
                {qualityLevels.map((lvl, idx) => (
                  <button key={idx} onClick={() => { onQualityChange(idx); setShowQualityMenu(false); }} className={`text-[10px] font-black p-2.5 rounded-xl text-left transition-all ${currentLevel === idx ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                    {lvl.height}p {lvl.height >= 2160 ? ' (4K)' : lvl.height >= 1440 ? ' (2K)' : ''}
                  </button>
                ))}
                {qualityLevels.length === 0 && (
                  <div className="p-2 text-[8px] font-black text-slate-500 uppercase">Fixed Quality</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 md:space-x-4">
          {/* Recording */}
          <button onClick={isRecording ? onStopRecording : onStartRecording} className={`flex items-center space-x-3 px-4 py-2 rounded-2xl border transition-all ${isRecording ? 'bg-red-600 border-red-500 animate-pulse text-white' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}>
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{isRecording ? 'REC' : 'REC'}</span>
          </button>
          
          {/* PiP */}
          <button onClick={onTogglePIP} className="text-white/60 hover:text-white p-2.5 bg-white/5 rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </button>
          
          {/* Theater */}
          <button onClick={onToggleTheater} className={`p-2.5 rounded-xl transition-all ${isTheater ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/60 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><rect x="3" y="4" width="18" height="16" rx="2" /></svg>
          </button>
          
          {/* Fullscreen */}
          <button onClick={onToggleFullscreen} className="text-white/60 hover:text-white p-2.5 bg-white/5 rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoControls;
