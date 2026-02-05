/**
 * VideoPlayer component for handling HLS streams and playback controls.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import BrandLogo from './BrandLogo';

declare global {
  interface Window {
    Hls: any;
  }
}

interface VideoPlayerProps {
  url: string;
  poster: string;
  isTheater: boolean;
  onToggleTheater: () => void;
  channelName?: string;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const VideoPlayer = ({ url, poster, isTheater, onToggleTheater, channelName }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [levels, setLevels] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 is Auto
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  const hlsRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying && !showSpeedMenu && !showQualityMenu) setShowControls(false);
    }, 3000);
  }, [isPlaying, showSpeedMenu, showQualityMenu]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setErrorStatus(null);

    const initPlayer = () => {
      if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true,
          capLevelToPlayerSize: true,
          maxBufferLength: 30,
          manifestLoadingMaxRetry: 5,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          setLevels(hls.levels);
          setCurrentLevel(hls.currentLevel);
          video.play().catch(() => {});
          setIsPlaying(true);
        });

        // RECOVERY LOGIC: Handle fatal network errors without refreshing
        hls.on(window.Hls.Events.ERROR, (event: any, data: any) => {
          if (data.fatal) {
            switch (data.type) {
              case window.Hls.ErrorTypes.NETWORK_ERROR:
                setErrorStatus("Uplink network error. Retrying...");
                hls.startLoad();
                break;
              case window.Hls.ErrorTypes.MEDIA_ERROR:
                setErrorStatus("Media decode error. Swapping buffer...");
                hls.recoverMediaError();
                break;
              default:
                setErrorStatus("Fatal uplink failure. Node reset required.");
                hls.destroy();
                break;
            }
          }
        });

        hls.on(window.Hls.Events.LEVEL_SWITCHED, () => {
          setCurrentLevel(hls.currentLevel);
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(() => {});
          setIsPlaying(true);
        });
      }
    };

    initPlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
    resetControlsTimeout();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
      if (!newMuted && volume === 0) {
        setVolume(0.5);
        videoRef.current.volume = 0.5;
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const handleQualityChange = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentLevel(levelIndex);
    }
    setShowQualityMenu(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  const togglePip = async () => {
    try {
      if (videoRef.current !== document.pictureInPictureElement) {
        await videoRef.current?.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    } catch (e) {
      console.error("PiP failed", e);
    }
  };

  const toggleRecording = () => {
    if (!isRecording) startRecording();
    else stopRecording();
  };

  const startRecording = () => {
    if (!videoRef.current) return;
    try {
      // @ts-ignore
      const stream = videoRef.current.captureStream?.() || videoRef.current.mozCaptureStream?.();
      if (!stream) return;

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Kairo-Uplink-Record-${Date.now()}.webm`;
        a.click();
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => setProgress(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
    };
  }, []);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className={`
        relative w-full overflow-hidden bg-black group select-none transition-all duration-700
        ${isTheater ? 'h-full flex items-center bg-black' : 'aspect-video rounded-xl md:rounded-[3rem] shadow-2xl'}
      `}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => setShowControls(false)}
      onTouchStart={resetControlsTimeout}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        playsInline
      />

      {/* ERROR OVERLAY */}
      {errorStatus && (
        <div className="absolute inset-0 z-[65] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
          <div className="w-16 h-16 bg-red-600/20 border border-red-500/30 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h5 className="text-xl font-black uppercase tracking-tighter text-white mb-2 italic">Congestion Detected</h5>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">{errorStatus}</p>
        </div>
      )}

      {/* TOP HUD */}
      <div className={`absolute top-4 left-6 md:top-8 md:left-12 transition-opacity duration-500 z-[60] ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <BrandLogo size="sm" className="drop-shadow-2xl" />
      </div>

      {isRecording && (
        <div className="absolute top-4 right-6 md:top-8 md:right-12 flex items-center space-x-2 bg-red-600/20 backdrop-blur-md px-4 py-2 rounded-full border border-red-500/30 animate-pulse z-[60]">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Recording</span>
        </div>
      )}

      {/* CENTER PLAY BUTTON */}
      {!isPlaying && !errorStatus && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-40" onClick={togglePlay}>
          <div className="w-20 h-20 md:w-28 md:h-28 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl transform hover:scale-110 transition-all cursor-pointer">
            <svg className="w-10 h-10 md:w-14 md:h-14 text-white fill-white translate-x-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      )}

      {/* CONTROLS */}
      <div className={`
        absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pt-20 pb-6 md:pb-12 transition-all duration-500 z-50
        ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}
      `}>
        <div className="px-6 md:px-12 mb-4">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={progress}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        <div className="flex items-center justify-between px-6 md:px-12">
          <div className="flex items-center space-x-4 md:space-x-10">
            <button onClick={togglePlay} className="text-white hover:text-indigo-400 active:scale-90 transition-all">
              {isPlaying ? (
                <svg className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>

            <div className="flex items-center space-x-2">
              <button onClick={toggleMute} className="text-white/60 hover:text-white transition-all">
                {isMuted || volume === 0 ? (
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M5.586 15L4 13.414V10.586L5.586 9H8l4-4v14l-4-4H5.586z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                ) : (
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15L4 13.414V10.586L5.586 9H8l4-4v14l-4-4H5.586z" /></svg>
                )}
              </button>
              <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-0 group-hover:w-24 transition-all duration-700 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-indigo-500 hidden md:block" />
            </div>

            <div className="text-[10px] font-black tracking-[0.2em] text-white/40 font-mono hidden sm:block">
              {formatTime(progress)} <span className="opacity-20 mx-1">/</span> {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center space-x-3 md:space-x-6">
            <div className="relative">
              <button onClick={() => { setShowQualityMenu(!showQualityMenu); setShowSpeedMenu(false); }} className="text-[9px] font-black uppercase tracking-widest text-white/60 hover:text-white px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                {currentLevel === -1 ? 'AUTO' : `${levels[currentLevel]?.height}P`}
              </button>
              {showQualityMenu && (
                <div className="absolute bottom-full right-0 mb-4 bg-slate-900/95 border border-white/10 rounded-2xl p-2 w-32 flex flex-col shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <button onClick={() => handleQualityChange(-1)} className={`px-4 py-2 text-[10px] font-black text-left rounded-xl transition-all ${currentLevel === -1 ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>AUTO</button>
                  {levels.map((lvl, i) => (
                    <button key={i} onClick={() => handleQualityChange(i)} className={`px-4 py-2 text-[10px] font-black text-left rounded-xl transition-all ${currentLevel === i ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>{lvl.height}P</button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={toggleRecording} className={`p-2 transition-all ${isRecording ? 'text-red-500' : 'text-white/60 hover:text-white'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><circle cx="12" cy="12" r="3" /><path d="M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg></button>
            <button onClick={togglePip} className="text-white/60 hover:text-white p-2 hidden sm:block"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
            <button onClick={onToggleTheater} className={`p-2 transition-all ${isTheater ? 'text-indigo-400' : 'text-white/60 hover:text-white'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 12h10" /></svg></button>
            <button onClick={toggleFullscreen} className="text-white/60 hover:text-white p-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;