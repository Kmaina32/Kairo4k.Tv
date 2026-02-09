import React from 'react';

interface LiveMetrics {
  title: string;
  isAd: boolean;
  segmentElapsed: number;
  segmentRemaining: number;
  segmentDuration: number;
  loopElapsed: number;
  loopDuration: number;
  index: number;
}

interface LiveTelemetryCardProps {
  liveViewers: number;
  liveMetrics: LiveMetrics | null;
  formatDuration: (seconds: number) => string;
  realtimeError?: string | null;
}

const LiveTelemetryCard = ({ liveViewers, liveMetrics, formatDuration, realtimeError }: LiveTelemetryCardProps) => {
  return (
    <div className="bg-gradient-to-br from-[#1a1a1e] to-[#111114] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-6 text-right">
        <p className="text-[10px] font-black text-slate-500 uppercase">Live Viewers</p>
        <p className="text-2xl font-black text-white leading-none">{liveViewers}</p>
        {realtimeError && (
          <p className="text-[9px] font-mono text-slate-500 mt-2">{realtimeError}</p>
        )}
      </div>

      <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-4">Now Airing</h4>
      {liveMetrics ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-black text-white truncate max-w-[80%]">{liveMetrics.title}</h2>
            <p className="text-xs font-bold text-slate-400 uppercase mt-1">
              {liveMetrics.isAd ? 'Commercial Break' : 'Main Content'} • Segment {liveMetrics.index + 1}
            </p>
          </div>
          <div className="space-y-2">
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all duration-1000"
                style={{ width: `${(liveMetrics.segmentElapsed / Math.max(liveMetrics.segmentDuration, 1)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold font-mono text-slate-500 uppercase">
              <span>{formatDuration(liveMetrics.segmentElapsed)}</span>
              <span>-{formatDuration(liveMetrics.segmentRemaining)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-2xl">
          <p className="text-xs font-bold text-slate-600 uppercase">Station Offline</p>
        </div>
      )}
    </div>
  );
};

export default LiveTelemetryCard;
