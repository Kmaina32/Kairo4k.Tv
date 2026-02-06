
import React, { useState, useEffect } from 'react';

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
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close menus when controls hide
  useEffect(() => {
    if (!showControls) {
      setShowSpeedMenu(false);
      setShowQualityMenu(false);
    }
  }, [showControls]);

  const MenuOverlay = ({ children, onClose }: { children: React.ReactNode, onClose: () => void }) => (
    <div className={`absolute bottom-full left-0 right-0 mb-4 px-4 ${isMobile ? 'fixed inset-x-0 bottom-24 flex justify-center z-[200]' : 'z-[100]'}`}>
      <div className={`bg-slate-900/90 border border-white/10 rounded-[28px] p-3 backdrop-blur-2xl shadow-2xl flex flex-col gap-1 min-w-[140px] ${isMobile ? 'max-w-xs w-full' : ''}`}>
        {children}
        {isMobile && (
          <button onClick={onClose} className="mt-2 py-3 rounded-2xl bg-white/5 text-[10px] font-black uppercase text-slate-400">Close</button>
        )}
      </div>
    </div>
  );

  return (
    <div className={`absolute bottom-0 inset-x-0 transition-all duration-500 pb-6 md:pb-10 px-6 md:px-12 flex justify-center ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
      
      {/* THE UNIFIED COMMAND BRIDGE */}
      <div className="glass h-16 md:h-20 w-full max-w-5xl rounded-[32px] flex items-center justify-between px-6 md:px-10 gap-2 border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        
        {/* GROUP ALPHA: CORE CONTROLS */}
        <div className="flex items-center space-x-3 md:space-x-6 flex-shrink-0">
          <button onClick={onTogglePlay} className="text-white hover:scale-110 transition-all p-2.5 bg-white/5 rounded-full hover:bg-indigo-600 active:scale-90">
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>

          <div className="flex items-center space-x-3">
            <button onClick={onToggleMute} className="text-white/60 hover:text-white transition-colors">
              {isMuted || volume === 0 ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M5.586 15L4 13.414V10.586L5.586 9H8l4-4v14l-4-4H5.586z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15L4 13.414V10.586L5.586 9H8l4-4v14l-4-4H5.586z" /></svg>
              )}
            </button>
            <input 
              type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} 
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-12 md:w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 hidden sm:block"
            />
          </div>
        </div>

        {/* GROUP BETA: BRANDING (CENTER) */}
        <div className="hidden lg:flex flex-col items-center flex-shrink-0">
          <div className="flex items-center space-x-1">
             <span className="text-[12px] font-black uppercase tracking-[0.4em] text-white">KAIRO</span>
             <span className="text-[12px] font-black text-indigo-500 tracking-tighter">4K</span>
          </div>
        </div>

        {/* GROUP GAMMA: STREAM INTELLIGENCE & DISPLAY */}
        <div className="flex items-center space-x-2 md:space-x-4">
          
          {/* Stream Settings Wrapper */}
          <div className="flex items-center space-x-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
            {/* Speed */}
            <div className="relative">
              <button 
                onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowQualityMenu(false); }} 
                className={`text-[9px] md:text-[10px] font-black px-2.5 py-1.5 rounded-xl transition-all ${showSpeedMenu ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white'}`}
              >
                {playbackRate}x
              </button>
              {showSpeedMenu && (
                <MenuOverlay onClose={() => setShowSpeedMenu(false)}>
                  {[0.5, 1, 1.25, 1.5, 2].map(r => (
                    <button key={r} onClick={() => { onPlaybackRateChange(r); setShowSpeedMenu(false); }} className={`text-[10px] font-black p-3 rounded-2xl text-left transition-all ${playbackRate === r ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>{r}x</button>
                  ))}
                </MenuOverlay>
              )}
            </div>

            {/* Quality */}
            <div className="relative">
              <button 
                onClick={() => { setShowQualityMenu(!showQualityMenu); setShowSpeedMenu(false); }} 
                className={`text-[9px] md:text-[10px] font-black px-2.5 py-1.5 rounded-xl transition-all ${showQualityMenu ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white'}`}
              >
                {currentLevel === -1 ? 'AUTO' : (qualityLevels[currentLevel]?.height ? `${qualityLevels[currentLevel].height}P` : 'HD')}
              </button>
              {showQualityMenu && (
                <MenuOverlay onClose={() => setShowQualityMenu(false)}>
                  <button onClick={() => { onQualityChange(-1); setShowQualityMenu(false); }} className={`text-[10px] font-black p-3 rounded-2xl text-left transition-all ${currentLevel === -1 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>AUTO</button>
                  {qualityLevels.map((lvl, idx) => (
                    <button key={idx} onClick={() => { onQualityChange(idx); setShowQualityMenu(false); }} className={`text-[10px] font-black p-3 rounded-2xl text-left transition-all ${currentLevel === idx ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                      {lvl.height}P {lvl.height >= 2160 ? ' (4K)' : ''}
                    </button>
                  ))}
                </MenuOverlay>
              )}
            </div>

            {/* Recording */}
            <button 
              onClick={isRecording ? onStopRecording : onStartRecording} 
              className={`p-1.5 rounded-xl transition-all ${isRecording ? 'text-red-500 animate-pulse' : 'text-white/40 hover:text-white'}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500' : 'bg-current shadow-[0_0_8px_currentColor]'}`} />
            </button>
          </div>

          {/* Display Mode Group */}
          <div className="flex items-center space-x-1.5 md:space-x-3">
             <button onClick={onTogglePIP} className="hidden sm:flex text-white/40 hover:text-white p-2 md:p-3 bg-white/5 rounded-2xl transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
             </button>
             
             <button onClick={onToggleTheater} className={`p-2 md:p-3 rounded-2xl transition-all ${isTheater ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><rect x="3" y="4" width="18" height="16" rx="2" /></svg>
             </button>
             
             <button onClick={onToggleFullscreen} className="text-white/40 hover:text-white p-2 md:p-3 bg-white/5 rounded-2xl transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
             </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default VideoControls;
