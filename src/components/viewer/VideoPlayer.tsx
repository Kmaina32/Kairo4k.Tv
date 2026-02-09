
import React, { useRef, useState, useEffect, useCallback } from 'react';
import CommandDeck from './VideoControls';
import DiagnosticsPanel from '../admin/StatsMonitor';
import { supabase } from '../../services/supabaseClient';
import { CLOUDFLARE_BASE_URL } from '../../constants';

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
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  initialSeek?: number;
}

const VideoPlayer = ({ url, poster, isTheater, onToggleTheater, channelName, onEnded, onTimeUpdate, initialSeek }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement>(null);
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
  const onTimeUpdateRef = useRef(onTimeUpdate);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  // Ad Engine State
  const [activeAd, setActiveAd] = useState<any>(null);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const adRef = useRef<any>(null);
  const lastAdTimeRef = useRef<number>(0);

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
      buffer32[i] = Math.random() < 0.1 ? 0xffffffff : 0x00000000;
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

    const checkPreRoll = async () => {
      try {
        const { data: config } = await supabase.from('ads_config').select('*').eq('placement', 'pre-roll').eq('is_enabled', true).maybeSingle();
        if (config) {
          const { data: ads } = await supabase.from('ads_library').select('*').eq('is_active', true);
          if (ads && ads.length > 0) {
            const randomAd = ads[Math.floor(Math.random() * ads.length)];
            setActiveAd(randomAd);
            setIsAdPlaying(true);
          }
        }
      } catch (err) {
        console.error("Ad Engine Pre-Roll Error:", err);
      }
    };
    checkPreRoll();

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

      const onWaiting = () => setIsBuffering(true);
      const onPlaying = () => { setIsBuffering(false); setErrorStatus(null); setIsPlaying(true); };
      const onCanPlay = () => setIsBuffering(false);
      const onLoadedData = () => setIsBuffering(false);
      const onStalled = () => setIsBuffering(true);
      const onTimeUpdateInternal = () => {
        if (video.currentTime > 0) {
          setIsBuffering(false);
          setErrorStatus(null);
        }

        // AD ENGINE: MID-ROLL CHECK
        const checkMidRoll = async () => {
          if (isAdPlaying) return;
          const currentTime = Math.floor(video.currentTime);

          onTimeUpdateRef.current && onTimeUpdateRef.current(video.currentTime);

          // PERSISTENCE LOCAL SYSTEM: Save progress
          if (currentTime > 0 && currentTime % 5 === 0) {
            localStorage.setItem(`nexus_progress_${url}`, currentTime.toString());
          }

          // Fetch config for frequency
          const { data: config } = await supabase.from('ads_config').select('*').eq('placement', 'mid-roll').eq('is_enabled', true).maybeSingle();
          if (!config) return;

          const freqSec = (config.frequency_minutes || 10) * 60;

          if (currentTime > 0 && currentTime % freqSec === 0 && currentTime !== lastAdTimeRef.current) {
            lastAdTimeRef.current = currentTime;
            video.pause();
            const { data: ads } = await supabase.from('ads_library').select('*').eq('is_active', true);
            if (ads && ads.length > 0) {
              setActiveAd(ads[Math.floor(Math.random() * ads.length)]);
              setIsAdPlaying(true);
            }
          }
        };
        checkMidRoll();
      };
      const handleEnded = () => {
        setIsPlaying(false);
        if (onEnded) onEnded();
      };
      const onPlay = () => setIsPlaying(true);
      const onPause = () => setIsPlaying(false);

      video.addEventListener('waiting', onWaiting);
      video.addEventListener('playing', onPlaying);
      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('loadeddata', onLoadedData);
      video.addEventListener('stalled', onStalled);
      video.addEventListener('timeupdate', onTimeUpdateInternal);
      video.addEventListener('ended', handleEnded);
      video.addEventListener('play', onPlay);
      video.addEventListener('pause', onPause);

      // Initial buffering state
      setIsBuffering(true);

      const cleanupEvents = () => {
        video.removeEventListener('waiting', onWaiting);
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('loadeddata', onLoadedData);
        video.removeEventListener('stalled', onStalled);
        video.removeEventListener('timeupdate', onTimeUpdateInternal);
        video.removeEventListener('ended', handleEnded);
        video.removeEventListener('play', onPlay);
        video.removeEventListener('pause', onPause);
      };

      if (window.Hls && window.Hls.isSupported() && isHLS && !isStaticVideo) {
        const hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true,
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          maxBufferSize: 60 * 1000 * 1000,
          obrEwmaDefaultEstimate: 5000000,
          backBufferLength: 90,
          autoStartLoad: true,
          startLevel: -1,
          abrEwmaFastLive: 3,
          abrEwmaSlowLive: 15,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(window.Hls.Events.MANIFEST_PARSED, (_: any, data: any) => {
          setIsBuffering(false);

          const savedProg = localStorage.getItem(`nexus_progress_${url}`);
          video.currentTime = initialSeek || parseFloat(savedProg || '0');

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

        hls.on(window.Hls.Events.FRAG_LOADED, (_: any, data: any) => {
          if (data && data.stats) {
            setStats(prev => ({
              ...prev,
              bandwidth: data.stats.bwEstimate,
              latency: data.stats.latency
            }));
          }
        });

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
        video.src = url;

        const savedProg = localStorage.getItem(`nexus_progress_${url}`);
        video.currentTime = initialSeek || parseFloat(savedProg || '0');

        // FORCED AUTOPLAY SYSTEM (Direct)
        const startPlayback = async () => {
          try {
            video.muted = false;
            await video.play();
            setIsBuffering(false);
          } catch (err) {
            console.warn("Unmuted autoplay blocked, retrying muted...");
            video.muted = true;
            try {
              await video.play();
              setIsBuffering(false);
            } catch (e: any) {
              if (e.name !== 'AbortError') {
                console.error("Total playback failure:", e);
                setIsBuffering(false);
              }
            }
          }
        };
        startPlayback();
        setIsPlaying(true);

        return () => {
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

  const handleTogglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      setIsBuffering(true); // Show loading while attempting to play
      try {
        // Try unmuted first
        video.muted = false;
        await video.play();
        setIsPlaying(true);
        setIsBuffering(false);
      } catch (err) {
        // Autoplay blocked, try muted
        console.warn("Unmuted play blocked, trying muted...");
        try {
          video.muted = true;
          await video.play();
          setIsPlaying(true);
          setIsBuffering(false);
        } catch (e) {
          console.error("Total playback failure:", e);
          setIsBuffering(false);
          setErrorStatus("PLAYBACK ERROR");
        }
      }
    } else {
      video.pause();
      setIsPlaying(false);
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
      if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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

  // Ambient Glow Loop
  useEffect(() => {
    let animationFrame: number;
    const drawAmbient = () => {
      const video = videoRef.current;
      const ambientCanvas = ambientCanvasRef.current;
      if (!video || !ambientCanvas || (!isTheater && !isPlaying) || video.paused || video.ended) {
        animationFrame = requestAnimationFrame(drawAmbient);
        return;
      }

      ambientCanvas.width = 64;
      ambientCanvas.height = 36;
      const ctx = ambientCanvas.getContext('2d');
      if (ctx) ctx.drawImage(video, 0, 0, 64, 36);

      animationFrame = requestAnimationFrame(drawAmbient);
    };

    animationFrame = requestAnimationFrame(drawAmbient);
    return () => cancelAnimationFrame(animationFrame);
  }, [isTheater, isPlaying]);

  return (
    <div
      className={`relative w-full h-full bg-black select-none group
        ${isTheater ? 'fixed inset-0 z-[200]' : 'rounded-[2rem] border-2 border-slate-800'}`}
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
    >
      {/* AMBIENT GLOW LAYER */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
        <canvas
          ref={ambientCanvasRef}
          className="w-full h-full scale-150 blur-[80px]"
          style={{ filter: 'brightness(1.5) saturate(2)' }}
        />
      </div>

      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain relative z-10"
        onClick={handleTogglePlay}
        crossOrigin="anonymous"
        playsInline
      />

      {/* CENTERED PLAY BUTTON OVERLAY - Shows when paused */}
      {!isPlaying && !isBuffering && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer bg-black/30"
          onClick={handleTogglePlay}
        >
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-orange-500/90 flex items-center justify-center shadow-2xl shadow-orange-500/30 hover:scale-110 transition-transform duration-300 hover:bg-orange-400">
            <svg className="w-10 h-10 md:w-14 md:h-14 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* BUFFERING/LOADING INDICATOR */}
      {isBuffering && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          {/* Spinning loader */}
          <div className="relative w-16 h-16 md:w-24 md:h-24">
            <div className="absolute inset-0 border-4 border-orange-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-orange-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-transparent border-t-orange-400/70 rounded-full animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }}></div>
          </div>
          {/* Loading text */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <span className="text-xs md:text-sm font-black uppercase tracking-[0.3em] text-orange-500 animate-pulse">
              {errorStatus || 'LOCKING SIGNAL...'}
            </span>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* INVISIBLE CANVAS FOR RECORDING */}
      <canvas ref={canvasRef} className="hidden" />

      {/* DIAGNOSTICS */}
      <DiagnosticsPanel
        stats={stats}
        visible={showStats}
        onToggle={() => setShowStats(!showStats)}
        channelName={channelName || 'UNKNOWN_SOURCE'}
        isRecording={isRecording}
        quality={qualityLabel}
      />

      {/* AD OVERLAY SYSTEM */}
      {isAdPlaying && activeAd && (
        <div className="absolute inset-0 z-[150] bg-black animate-in fade-in duration-500">
          <video
            src={activeAd.ad_url.startsWith('http') ? activeAd.ad_url : `${CLOUDFLARE_BASE_URL}${activeAd.ad_url}`}
            autoPlay
            className="w-full h-full object-contain"
            onEnded={() => {
              setIsAdPlaying(false);
              setActiveAd(null);
              if (videoRef.current) videoRef.current.play();
            }}
          />
          <div className="absolute top-10 left-10 flex flex-col gap-2">
            <span className="bg-orange-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-xl">Sponsored Ad</span>
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{activeAd.title}</span>
          </div>
          {activeAd.click_through_url && (
            <a
              href={activeAd.click_through_url} target="_blank" rel="noreferrer"
              className="absolute bottom-10 right-10 px-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-[10px] font-black uppercase text-white hover:bg-white/20 transition-all"
            >
              Learn More
            </a>
          )}
          <div className="absolute bottom-10 left-10 flex items-center gap-3">
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Secure Connection</span>
          </div>
        </div>
      )}

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
