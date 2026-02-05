
import * as React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';

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

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, poster, isTheater, onToggleTheater }) => {
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
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying && !showSpeedMenu) setShowControls(false);
    }, 3000);
  }, [isPlaying, showSpeedMenu]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: any = null;

    const initPlayer = () => {
      if (window.Hls && window.Hls.isSupported()) {
        hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true,
          capLevelToPlayerSize: true,
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
          setIsPlaying(true);
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
      if (hls) hls.destroy();
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
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const startRecording = () => {
    if (!videoRef.current) return;
    try {
      // @ts-ignore
      const stream = videoRef.current.captureStream?.() || videoRef.current.mozCaptureStream?.();
      if (!stream) {
        alert("Recording not supported in this browser for this stream.");
        return;
      }

      const options = { mimeType: 'video/webm;codecs=vp9,opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Nexus-Record-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      alert("Failed to start recording. This might be due to security (CORS) restrictions.");
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
        relative w-full overflow-hidden bg-black group select-none transition-all duration-700
        ${isTheater ? 'h-full flex items-center bg-black' : 'aspect-video rounded-2xl md:rounded-[3rem] shadow-2xl ring-1 ring-white/10'}
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

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center space-x-2 bg-red-600/20 backdrop-blur-md px-2 py-1 md:px-3 md:py-1.5 rounded-full border border-red-500/30 animate-pulse z-[80]">
          <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full"></div>
          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-red-500">Rec. Uplink</span>
        </div>
      )}

      {/* Center Play Overlay */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer z-40"
          onClick={togglePlay}
        >
          <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-600/50 transform hover:scale-110 transition-all duration-500">
            <svg className="w-8 h-8 md:w-10 md:h-10 text-white translate-x-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      )}

      {/* Control Interface */}
      <div className={`
        absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pt-12 md:pt-20 pb-4 md:pb-10 transition-all duration-500 z-50
        ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 md:translate-y-8 pointer-events-none'}
      `}>
        {/* Progress Bar Container */}
        <div className="px-4 md:px-10 group/seek">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={progress}
            onChange={handleSeek}
            className="w-full h-1 md:h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
          />
        </div>

        <div className="flex items-center justify-between px-4 md:px-10 mt-2 md:mt-4">
          {/* Left Controls: Play, Volume, Time */}
          <div className="flex items-center space-x-2 md:space-x-8">
            <button onClick={togglePlay} className="text-white hover:text-indigo-400 transition-all active:scale-90 p-1 md:p-2">
              {isPlaying ? (
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>

            <div className="flex items-center group/volume space-x-1 md:space-x-2">
              <button onClick={toggleMute} className="text-white/80 hover:text-white transition-all p-1 md:p-2">
                {isMuted || volume === 0 ? (
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M5.586 15L4 13.414V10.586L5.586 9H8l4-4v14l-4-4H5.586z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                ) : (
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15L4 13.414V10.586L5.586 9H8l4-4v14l-4-4H5.586z" /></svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-12 md:w-0 md:group-hover/volume:w-32 transition-all duration-500 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div className="text-[8px] md:text-xs font-black tracking-widest text-white/60 font-mono hidden sm:block">
              {formatTime(progress)} <span className="opacity-20 mx-1">/</span> {formatTime(duration)}
            </div>
          </div>

          {/* Right Controls: Speed, Rec, Pip, Theater, Full */}
          <div className="flex items-center space-x-1 md:space-x-4">
            {/* Speed Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white p-1 md:p-2 flex items-center space-x-0.5"
              >
                <span>{playbackRate}x</span>
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl md:rounded-2xl p-1 md:p-2 w-16 md:w-20 flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {PLAYBACK_SPEEDS.map(speed => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`w-full py-1 md:py-1.5 text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${playbackRate === speed ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={toggleRecording} className={`p-1 md:p-2 transition-all active:scale-90 ${isRecording ? 'text-red-500' : 'text-white/60 hover:text-white'}`}>
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><circle cx="12" cy="12" r="3" /><path d="M12 21a9 9 0 100-18 9 9 0 000 18z" /></svg>
            </button>

            <button onClick={togglePip} className="text-white/60 hover:text-white p-1 md:p-2 hidden sm:block transition-all">
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </button>

            <button onClick={onToggleTheater} className={`p-1 md:p-2 transition-all ${isTheater ? 'text-indigo-400' : 'text-white/60 hover:text-white'}`}>
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 12h10" /></svg>
            </button>

            <button onClick={toggleFullscreen} className="text-white/60 hover:text-white p-1 md:p-2 transition-all">
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
