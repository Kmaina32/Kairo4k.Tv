
import React, { useEffect, useRef, useState, useCallback } from 'react';

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
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, poster, isTheater, onToggleTheater }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isPipAvailable, setIsPipAvailable] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const controlsTimeoutRef = useRef<number | null>(null);

  const resetControlsTimeout = useCallback(() => {
    if (isLocked && isPlaying) {
        setShowControls(false);
        return;
    }
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  }, [isPlaying, isLocked]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (window.Hls && window.Hls.isSupported()) {
      const hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.log("HLS play caught", e));
      });
      return () => hls.destroy();
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    }

    setIsPipAvailable(document.pictureInPictureEnabled);
  }, [url]);

  const togglePlay = () => {
    if (isLocked) {
        resetControlsTimeout();
        return;
    }
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
      if (!newMuted && volume === 0) setVolume(0.5);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const togglePip = async () => {
    try {
      if (videoRef.current !== document.pictureInPictureElement) {
        await videoRef.current?.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    } catch (error) {
      console.error("PiP Error", error);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setProgress(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    const onEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('ended', onEnded);
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
        relative w-full overflow-hidden bg-black group select-none transition-all duration-700 ease-in-out
        ${isTheater ? 'h-full lg:aspect-[21/9]' : 'aspect-video rounded-2xl md:rounded-[3rem] shadow-3xl ring-1 ring-white/10'}
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
      />

      {/* Central Indicator */}
      {!showControls && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[60]">
           <div className="w-16 h-16 md:w-24 md:h-24 bg-white/10 backdrop-blur-3xl rounded-full flex items-center justify-center border border-white/20">
              <svg className="w-8 h-8 md:w-12 md:h-12 text-white ml-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
           </div>
        </div>
      )}

      {/* Control Overlay */}
      <div className={`
        absolute inset-0 bg-gradient-to-t from-black/90 via-transparent flex flex-col justify-end transition-all duration-500 z-[70]
        ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
      `}>
        
        {/* Mobile Seek Hint (larger touch area) */}
        <div className="px-4 md:px-8 mb-2">
          {!isLocked && (
            <input
                type="range"
                min="0"
                max={duration || 0}
                value={progress}
                onChange={handleSeek}
                className="w-full h-1.5 md:h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-indigo-500 transition-all"
            />
          )}
        </div>

        <div className="flex items-center justify-between px-4 md:px-8 pb-4 md:pb-10 pt-1">
          <div className="flex items-center space-x-4 md:space-x-8">
            {!isLocked && (
              <button onClick={togglePlay} className="p-2 text-white active:scale-90 scale-110">
                {isPlaying ? (
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
            )}

            <button onClick={() => setIsLocked(!isLocked)} className={`p-2 transition-colors ${isLocked ? 'text-indigo-400' : 'text-white/40'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d={isLocked ? "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" : "M8 11V7a4 4 0 118 0v4m-8 4h8"} />
              </svg>
            </button>

            {!isLocked && (
                <div className="hidden sm:flex items-center space-x-4 group/volume">
                  <button onClick={toggleMute} className="text-white">
                    {isMuted || volume === 0 ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM4.33 14.89l2.76-2.89H11V12H7.09l-2.76 2.89H4.33zm11.67 0V9.11L14.11 11H13v2h1.11l1.89 1.89zM19 12c0 4.28-2.99 7.86-7 8.77v2.06c5.13-.93 9-5.4 9-10.83s-3.87-9.9-9-10.83v2.06c4.01.91 7 4.49 7 8.77z"/></svg>
                    ) : (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                    )}
                  </button>
                </div>
            )}

            <span className="text-[10px] md:text-xs font-mono text-white/50 tracking-wider">
              {formatTime(progress)} <span className="opacity-20 mx-1">/</span> {formatTime(duration)}
            </span>
          </div>

          {!isLocked && (
            <div className="flex items-center space-x-3 md:space-x-8">
                {isPipAvailable && (
                  <button onClick={togglePip} className="p-2 text-white/60 active:scale-90" title="PiP">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  </button>
                )}
                
                <button onClick={onToggleTheater} className={`p-2 transition-all active:scale-90 ${isTheater ? 'text-indigo-400' : 'text-white/60'}`} title="Theater">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm3 4h10m-10 6h10"/></svg>
                </button>

                <button onClick={toggleFullscreen} className="p-2 text-white active:scale-90" title="Fullscreen">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"/></svg>
                </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {!isPlaying && progress === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-2xl z-[80]">
           <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
