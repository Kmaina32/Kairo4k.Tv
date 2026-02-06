
import React, { useRef, useState, useEffect, useCallback } from 'react';
import VideoControls from './VideoControls';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [qualityLevels, setQualityLevels] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setErrorStatus(null);
    setQualityLevels([]);
    setCurrentLevel(-1);

    const initPlayer = () => {
      if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls({ 
          enableWorker: true, 
          lowLatencyMode: true,
          capLevelToPlayerSize: true
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        
        hls.on(window.Hls.Events.MANIFEST_PARSED, (event: any, data: any) => {
          setQualityLevels(data.levels || []);
          video.play().catch(() => {});
          setIsPlaying(true);
        });

        hls.on(window.Hls.Events.LEVEL_SWITCHED, (event: any, data: any) => {
          if (hls.autoLevelEnabled) setCurrentLevel(-1);
        });

        hls.on(window.Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) {
            if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
              setErrorStatus("Signal Lost: Retrying...");
              hls.startLoad();
            } else {
              hls.recoverMediaError();
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
      }
    };

    initPlayer();
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [url]);

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleVolumeChange = (newVol: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      setVolume(newVol);
      if (newVol > 0) setIsMuted(false);
    }
  };

  const handleQualityChange = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentLevel(level);
    }
  };

  const startRecording = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Detect most compatible format for mobile (Priority: MP4 > H264 WebM > VP9 WebM)
    const mimeTypes = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=h264',
      'video/webm;codecs=vp9',
      'video/webm'
    ];
    const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';

    setIsRecording(true);
    chunksRef.current = [];
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    
    const recordLoop = () => {
      if (!isRecording && mediaRecorderRef.current?.state !== 'recording') return;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.9)';
        ctx.font = 'bold 40px Inter, Arial';
        ctx.fillText('KAIRO 4K', canvas.width - 240, canvas.height - 60);
      }
      requestAnimationFrame(recordLoop);
    };
    requestAnimationFrame(recordLoop);

    const recorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.onstop = () => {
      const extension = supportedMimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunksRef.current, { type: supportedMimeType });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Kairo4K_${channelName?.replace(/\s/g, '_') || 'Broadcast'}.${extension}`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    };
    recorder.start();
  };

  const stopRecording = () => {
    setIsRecording(false);
    mediaRecorderRef.current?.stop();
  };

  return (
    <div 
      className={`relative w-full overflow-hidden bg-black group select-none transition-all duration-500
        ${isTheater ? 'fixed inset-0 z-[200] h-screen' : 'rounded-[32px] aspect-video'}`}
      onMouseMove={resetControlsTimeout}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain cursor-pointer"
        onClick={handleTogglePlay}
        playsInline
      />
      
      <canvas ref={canvasRef} className="hidden" />

      {/* MINIMAL BRANDING ONLY */}
      <div className="absolute top-6 left-8 z-30 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center space-x-1.5">
           <span className="text-sm md:text-lg font-black uppercase tracking-[0.2em] text-white">KAIRO</span>
           <span className="text-sm md:text-lg font-black text-indigo-500 tracking-tighter">4K</span>
        </div>
      </div>

      {errorStatus && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400 animate-pulse">{errorStatus}</span>
        </div>
      )}

      <VideoControls 
        isPlaying={isPlaying}
        isMuted={isMuted}
        volume={volume}
        playbackRate={playbackRate}
        isRecording={isRecording}
        isTheater={isTheater}
        qualityLevels={qualityLevels}
        currentLevel={currentLevel}
        onTogglePlay={handleTogglePlay}
        onToggleMute={() => { if(videoRef.current) { videoRef.current.muted = !isMuted; setIsMuted(!isMuted); } }}
        onVolumeChange={handleVolumeChange}
        onPlaybackRateChange={(r) => { if(videoRef.current) { videoRef.current.playbackRate = r; setPlaybackRate(r); } }}
        onQualityChange={handleQualityChange}
        onToggleTheater={onToggleTheater}
        onToggleFullscreen={() => videoRef.current?.requestFullscreen()}
        onTogglePIP={async () => { try { if (videoRef.current !== document.pictureInPictureElement) await videoRef.current?.requestPictureInPicture(); else await document.exitPictureInPicture(); } catch(e){} }}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        showControls={showControls}
      />
    </div>
  );
};

export default VideoPlayer;
