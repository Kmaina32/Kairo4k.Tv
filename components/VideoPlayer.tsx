
import React, { useRef, useState, useEffect, useCallback } from 'react';
import CommandDeck from './VideoControls';
import DiagnosticsPanel from './StatsMonitor';

/**
 * CLOUDFLARE R2 CORS NOTICE:
 * If you encounter CORS errors with .mp4 or .m3u8 files, add this CORS policy to your R2 bucket settings:
 * [
 *   {
 *     "AllowedOrigins": ["*"],
 *     "AllowedMethods": ["GET", "HEAD"],
 *     "AllowedHeaders": ["*"],
 *     "ExposeHeaders": []
 *   }
 * ]
 */

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement>(null); // For "static" effect

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isStaticActive, setIsStaticActive] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const lastUrlRef = useRef<string>('');

  // Stats
  const [stats, setStats] = useState({ bandwidth: 0, buffer: 0, latency: 0 });
  const [qualityLabel, setQualityLabel] = useState('HD');
  const [qualityLevels, setQualityLevels] = useState<{ index: number; height: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1);

  const hlsRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const controlsTimeoutRef = useRef<number | null>(null);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 4000);
  }, [isPlaying]);

  // Static Effect Draw Loop
  const drawStatic = useCallback(() => {
    const canvas = staticCanvasRef.current;
    if (!canvas || !isStaticActive) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const idata = ctx.createImageData(w, h);
    const buffer32 = new Uint32Array(idata.data.buffer);
    const len = buffer32.length;

    for (let i = 0; i < len; i++) {
      if (Math.random() < 0.1) {
        buffer32[i] = 0xffffffff;
      } else {
        buffer32[i] = 0x00000000;
      }
    }
    ctx.putImageData(idata, 0, 0);
    requestAnimationFrame(drawStatic);
  }, [isStaticActive]);

  useEffect(() => {
    if (isStaticActive) {
      requestAnimationFrame(drawStatic);
    }
  }, [isStaticActive, drawStatic]);

  useEffect(() => {
    // Trigger static effect on URL change
    setIsStaticActive(true);
    const t = setTimeout(() => setIsStaticActive(false), 800);

    const video = videoRef.current;
    if (!video) return;

    setErrorStatus(null);
    setQualityLevels([]);

    const initPlayer = () => {
      if (lastUrlRef.current === url) return; // Prevent redundant reloads
      lastUrlRef.current = url;

      const isHLS = url.toLowerCase().includes('.m3u8');
      const isStaticVideo = url.toLowerCase().match(/\.(mp4|m4v|webm|mov|ogg)$/);

      // Reset buffering state on source change
      setIsBuffering(true);

      const onWaiting = () => {
        console.log('🔴 Video waiting (buffering)');
        setIsBuffering(true);
      };
      const onPlaying = () => {
        console.log('🟢 Video playing');
        setIsBuffering(false);
        setErrorStatus(null);
      };
      const onCanPlay = () => {
        console.log('🟡 Video can play');
        setIsBuffering(false);
      };
      const onLoadedData = () => {
        console.log('🔵 Video loaded data');
        setIsBuffering(false);
      };
      const onStalled = () => {
        console.log('🟠 Video stalled');
        setIsBuffering(true);
      };

      const onTimeUpdate = () => {
        // If movie is progressing, it's definitely not "locking"
        if (video.currentTime > 0) {
          setIsBuffering(false);
          setErrorStatus(null);
        }
      };

      video.addEventListener('waiting', onWaiting);
      video.addEventListener('playing', onPlaying);
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('loadeddata', onLoadedData);
      video.addEventListener('stalled', onStalled);
      video.addEventListener('timeupdate', onTimeUpdate);

      const cleanupEvents = () => {
        video.removeEventListener('waiting', onWaiting);
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('loadeddata', onLoadedData);
        video.removeEventListener('stalled', onStalled);
        video.removeEventListener('timeupdate', onTimeUpdate);
      };

      if (window.Hls && window.Hls.isSupported() && isHLS && !isStaticVideo) {
        const hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          maxBufferSize: 60 * 1000 * 1000, // 60MB
          obrEwmaDefaultEstimate: 5000000, // 5Mbps initial
          backBufferLength: 90,
          autoStartLoad: true,
          startLevel: -1, // Auto
          abrEwmaFastLive: 3,
          abrEwmaSlowLive: 15,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(window.Hls.Events.MANIFEST_PARSED, (_: any, data: any) => {
          setIsBuffering(false); // Clear initial buffering when manifest is ready
          video.play().catch(e => {
            if (e.name !== 'AbortError') console.error('Playback failed:', e);
          }).then(() => {
            setIsBuffering(false);
            setErrorStatus(null);
          });
          setIsPlaying(true);
          setErrorStatus(null);
          if (hls.levels) {
            setQualityLevels(hls.levels.map((l: any, i: number) => ({ index: i, height: l.height })));
          }
        });

        // Hook up stats
        hls.on(window.Hls.Events.FRAG_LOADED, (_: any, data: any) => {
          if (data && data.stats) {
            setStats(prev => ({
              ...prev,
              bandwidth: data.stats.bwEstimate,
              latency: data.stats.latency
            }));
          }
        });

        // Monitor buffer
        const checkBuffer = setInterval(() => {
          if (video.buffered.length > 0) {
            setStats(prev => ({ ...prev, buffer: video.buffered.end(video.buffered.length - 1) - video.currentTime }));
          }
        }, 1000);

        hls.on(window.Hls.Events.LEVEL_SWITCHED, (_: any, data: any) => {
          const level = hls.levels[data.level];
          if (level) setQualityLabel(level.height + 'P');
        });

        hls.on(window.Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) {
            if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
              setErrorStatus("BUFFERING");
              setIsBuffering(true);
              hls.startLoad();
            } else {
              hls.recoverMediaError();
            }
          }
        });

        return () => {
          clearInterval(checkBuffer);
          cleanupEvents();
        };
      } else {
        // Fallback for native HLS (Safari) or direct MP4
        video.src = url;
        const onLoaded = () => {
          setIsBuffering(false); // Clear buffering when metadata loads
          video.play().catch(e => {
            if (e.name !== 'AbortError') console.error('Playback failed:', e);
          }).then(() => {
            setIsBuffering(false);
            setErrorStatus(null);
            setIsPlaying(true);
          });
          setErrorStatus(null);
        };
        video.addEventListener('loadedmetadata', onLoaded);
        return () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          cleanupEvents();
        };
      }
    };

    const cleanup = initPlayer();
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
      clearTimeout(t);
      if (typeof cleanup === 'function') cleanup();
    };
  }, [url]);

  const handleSetQuality = (index: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentQuality(index);
    }
  };

  const handleTogglePiP = () => {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    } else if (videoRef.current) {
      videoRef.current.requestPictureInPicture();
    }
  };

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(e => {
          if (e.name !== 'AbortError') console.error('Playback failed:', e);
        });
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isPlaying && videoRef.current?.paused) {
        videoRef.current.play().catch(() => { });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isPlaying]);

  const startRecording = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setIsRecording(true);
    chunksRef.current = [];
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(30);

    const recordLoop = () => {
      if (!isRecording && mediaRecorderRef.current?.state !== 'recording') return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Add overlay to recording
        ctx.fillStyle = '#4f46e5';
        ctx.font = 'bold 30px monospace';
        ctx.fillText('REC // KAIRO_TERMINAL', 40, 60);
      }
      requestAnimationFrame(recordLoop);
    };
    requestAnimationFrame(recordLoop);

    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `CAPTURE_${Date.now()}.webm`;
      a.click();
    };
    recorder.start();
  };

  const stopRecording = () => {
    setIsRecording(false);
    mediaRecorderRef.current?.stop();
  };

  return (
    <div
      className={`relative w-full h-full bg-black select-none group
        ${isTheater ? 'fixed inset-0 z-[200]' : 'rounded-[2rem] border-2 border-slate-800'}`}
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        onClick={handleTogglePlay}
        crossOrigin="anonymous"
        playsInline
      />

      {/* STATIC INTERFERENCE LAYER */}
      {/* STATIC INTERFERENCE LAYER (DISABLED) */}
      {/* 
      <canvas
        ref={staticCanvasRef}
        width={320} height={180}
        className={`absolute inset-0 w-full h-full pointer-events-none mix-blend-screen opacity-50 transition-opacity duration-300 ${isStaticActive ? 'opacity-50' : 'opacity-0'}`}
      />
      */}

      {/* INVISIBLE CANVAS FOR RECORDING */}
      <canvas ref={canvasRef} className="hidden" />

      {/* CONSOLIDATED DIAGNOSTICS & INFO (The "i" icon) */}
      <DiagnosticsPanel
        stats={stats}
        visible={showStats}
        onToggle={() => setShowStats(!showStats)}
        channelName={channelName || 'UNKNOWN_SOURCE'}
        isRecording={isRecording}
        quality={qualityLabel}
      />

      {/* SUBTLE LOADING / BUFFERING INDICATOR REMOVED */}

      {/* COMMAND DECK */}
      <CommandDeck
        isPlaying={isPlaying}
        isMuted={isMuted}
        volume={volume}
        playbackRate={playbackRate}
        isRecording={isRecording}
        isTheater={isTheater}
        qualityLevels={qualityLevels}
        currentLevel={currentQuality}
        onTogglePlay={handleTogglePlay}
        onToggleMute={() => { if (videoRef.current) { videoRef.current.muted = !isMuted; setIsMuted(!isMuted); } }}
        onVolumeChange={(val) => { if (videoRef.current) { videoRef.current.volume = val; setVolume(val); } }}
        onPlaybackRateChange={(val) => { if (videoRef.current) { videoRef.current.playbackRate = val; setPlaybackRate(val); } }}
        onQualityChange={handleSetQuality}
        onToggleTheater={onToggleTheater}
        onToggleFullscreen={() => videoRef.current?.requestFullscreen()}
        onTogglePIP={handleTogglePiP}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        showControls={showControls}
      />
    </div>
  );
};

export default VideoPlayer;
