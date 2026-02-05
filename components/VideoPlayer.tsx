import React from 'react';
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

const VideoPlayer = ({ url, poster, isTheater, onToggleTheater, channelName }: VideoPlayerProps) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [showControls, setShowControls] = React.useState(true);
  const [isRecording, setIsRecording] = React.useState(false);
  const [levels, setLevels] = React.useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = React.useState<number>(-1);
  const [errorStatus, setErrorStatus] = React.useState<string | null>(null);
  const [showQualityMenu, setShowQualityMenu] = React.useState(false);
  
  const hlsRef = React.useRef<any>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const controlsTimeoutRef = React.useRef<number | null>(null);

  // Auto-close error status after 6 seconds to allow viewing the stream
  React.useEffect(() => {
    if (errorStatus) {
      const timer = setTimeout(() => {
        setErrorStatus(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [errorStatus]);

  const resetControlsTimeout = React.useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying && !showQualityMenu) setShowControls(false);
    }, 3500);
  }, [isPlaying, showQualityMenu]);

  React.useEffect(() => {
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

        hls.on(window.Hls.Events.ERROR, (event: any, data: any) => {
          if (data.fatal) {
            switch (data.type) {
              case window.Hls.ErrorTypes.NETWORK_ERROR:
                setErrorStatus("Congestion Detected. Attempting Reconnect...");
                hls.startLoad();
                break;
              case window.Hls.ErrorTypes.MEDIA_ERROR:
                setErrorStatus("Signal Distortion. Resyncing...");
                hls.recoverMediaError();
                break;
              default:
                setErrorStatus("Frequency Lost. Manual Override Recommended.");
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if ((videoRef.current as any)?.webkitEnterFullscreen) {
        (videoRef.current as any).webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
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
      console.warn("PiP not supported", e);
    }
  };

  const startRecording = () => {
    if (!videoRef.current) return;
    try {
      const videoElement = videoRef.current as any;
      const stream = videoElement.captureStream?.() || videoElement.mozCaptureStream?.();
      if (!stream) {
        alert("Recording protocol not supported on this terminal.");
        return;
      }

      // MP4 priority for high compatibility
      const types = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
      const supportedType = types.find(type => MediaRecorder.isTypeSupported(type));
      if (!supportedType) {
        alert("No supported capture formats found.");
        return;
      }

      const recorder = new MediaRecorder(stream, { mimeType: supportedType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: supportedType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = supportedType.includes('mp4') ? 'mp4' : 'webm';
        a.download = `Kairo-Signal-${Date.now()}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      };
      
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  React.useEffect(() => {
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
        ${isTheater ? 'fixed inset-0 z-[200] h-screen bg-black flex items-center' : 'aspect-video rounded-xl md:rounded-[2.5rem] shadow-2xl'}
      `}
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        playsInline
        webkit-playsinline="true"
        autoPlay
      />

      {/* ALERT HUD WITH AUTO-CLOSE */}
      {errorStatus && (
        <div className="absolute inset-0 z-[210] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in slide-in-from-top-4">
          <div className="w-14 h-14 bg-red-600/20 border border-red-500/30 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
             <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <p className="text-[12px] font-black uppercase tracking-[0.4em] text-red-500 mb-2">{errorStatus}</p>
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Clearing Alert in T-Minus 5s...</p>
        </div>
      )}

      {/* CONTROLS OVERLAY */}
      <div className={`
        absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-500 flex flex-col justify-between p-4 md:p-8
        ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}>
        {/* TOP PANEL */}
        <div className="flex justify-between items-start">
          <BrandLogo size="sm" className="opacity-80 drop-shadow-lg" />
          {isRecording && (
            <div className="flex items-center space-x-2 bg-red-600 px-3 py-1.5 rounded-full border border-red-400/50 animate-pulse shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="text-[8px] font-black uppercase tracking-widest text-white">Capturing Signal</span>
            </div>
          )}
        </div>

        {/* BOTTOM PANEL */}
        <div className="space-y-4">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={progress}
            onChange={(e) => {
              const time = parseFloat(e.target.value);
              if (videoRef.current) videoRef.current.currentTime = time;
            }}
            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-indigo-500"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 md:space-x-8">
              <button onClick={togglePlay} className="text-white active:scale-90 transition-transform">
                {isPlaying ? (
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              
              <button onClick={() => { if(videoRef.current) videoRef.current.muted = !videoRef.current.muted; setIsMuted(!isMuted); }} className="text-white/80 hover:text-white active:scale-90 transition-all">
                {isMuted ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M5.586 15L4 13.414V10.586L5.586 9H8l4-4v14l-4-4H5.586z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15L4 13.414V10.586L5.586 9H8l4-4v14l-4-4H5.586z" /></svg>
                )}
              </button>

              <span className="text-[10px] font-black text-white/50 tracking-widest hidden sm:block font-mono">
                {formatTime(progress)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center space-x-1 md:space-x-3">
              <button onClick={() => isRecording ? stopRecording() : startRecording()} className={`p-2.5 rounded-full transition-all active:scale-90 ${isRecording ? 'text-red-500 bg-red-500/10 border border-red-500/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><circle cx="12" cy="12" r="2" /><path d="M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg>
              </button>
              
              <button onClick={togglePip} title="Picture in Picture" className="text-white/60 hover:text-white hover:bg-white/5 p-2.5 rounded-full transition-all active:scale-90">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </button>

              <button onClick={onToggleTheater} title="Theater Mode" className={`p-2.5 rounded-full transition-all active:scale-90 ${isTheater ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 12h10" /></svg>
              </button>

              <button onClick={toggleFullscreen} title="Fullscreen" className="text-white/60 hover:text-white hover:bg-white/5 p-2.5 rounded-full transition-all active:scale-90">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;