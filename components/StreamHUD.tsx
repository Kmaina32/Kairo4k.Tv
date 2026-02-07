import React, { useEffect, useState } from 'react';

interface StreamHUDProps {
  channelName: string;
  isRecording: boolean;
  quality: string;
}

const StreamHUD = ({ channelName, isRecording, quality }: StreamHUDProps) => {
  const [time, setTime] = useState(new Date());
  const [fps, setFps] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    // Fake FPS fluctuation for effect
    const fpsTimer = setInterval(() => {
      setFps(Math.floor(58 + Math.random() * 4)); 
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(fpsTimer);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-40 select-none">
      {/* TOP HUD BAR */}
      <div className="flex justify-between items-start">
        {/* LEFT: SIGNAL SOURCE */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
              SIGNAL_SOURCE: {channelName || 'UNKNOWN'}
            </span>
          </div>
          <div className="h-0.5 w-32 bg-gradient-to-r from-emerald-500/50 to-transparent" />
          <span className="text-[8px] font-mono text-emerald-500/60 tracking-widest pl-4">
            SECURE_CONNECTION_ESTABLISHED
          </span>
        </div>

        {/* RIGHT: SYSTEM STATUS */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
             <span>RES: <span className="text-white">{quality}</span></span>
             <span>FPS: <span className="text-white">{fps}</span></span>
             <span className="text-indigo-400">{time.toLocaleTimeString([], { hour12: false })} UTC</span>
          </div>
          <div className="flex gap-1">
            {[1,2,3,4].map(i => (
              <div key={i} className={`h-1 w-4 rounded-full ${i <= 3 ? 'bg-indigo-500' : 'bg-indigo-500/20'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* CENTER CROSSHAIR (Subtle) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="white">
          <path d="M20 0v10 M20 30v10 M0 20h10 M30 20h10" strokeWidth="1" />
        </svg>
      </div>
      
      {/* BOTTOM DECORATIONS */}
      <div className="flex justify-between items-end opacity-40">
        <div className="border-l-2 border-b-2 border-white/20 w-8 h-8 rounded-bl-xl" />
        <div className="border-r-2 border-b-2 border-white/20 w-8 h-8 rounded-br-xl" />
      </div>
    </div>
  );
};

export default StreamHUD;
