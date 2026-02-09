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

interface BroadcastControlsProps {
  selectedChannel: any;
  scheduleLength: number;
  totalDuration: number;
  mediaCount: number;
  adCount: number;
  liveViewers: number;
  liveMetrics: LiveMetrics | null;
  formatDuration: (seconds: number) => string;
  onScheduleLive: (time: string) => void;
  onClearScheduleTime: () => void;
  onRefresh: () => void;
  onAutoCalc: () => void;
  autoCalcRunning: boolean;
  onSaveDurations: () => void;
  savingDurations: boolean;
  onResync: () => void;
  onGoLive: () => void;
  onGoOffline: () => void;
  disableGoLive: boolean;
  processingLabel: string | null;
  missingDurationCount: number;
  onShowMissingReport: () => void;
}

const BroadcastControls = ({
  selectedChannel,
  scheduleLength,
  totalDuration,
  mediaCount,
  adCount,
  liveViewers,
  liveMetrics,
  formatDuration,
  onScheduleLive,
  onClearScheduleTime,
  onRefresh,
  onAutoCalc,
  autoCalcRunning,
  onSaveDurations,
  savingDurations,
  onResync,
  onGoLive,
  onGoOffline,
  disableGoLive,
  processingLabel,
  missingDurationCount,
  onShowMissingReport
}: BroadcastControlsProps) => {
  if (!selectedChannel) return null;

  return (
    <div className="mt-10 pt-8 border-t border-white/5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
              <span className="text-lg font-black text-white">{formatDuration(totalDuration)}</span>
              <p className="text-[8px] font-black uppercase text-slate-600 mt-1">Total Loop</p>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
              <span className="text-lg font-black text-purple-400">{mediaCount}</span>
              <p className="text-[8px] font-black uppercase text-slate-600 mt-1">Media</p>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
              <span className="text-lg font-black text-orange-400">{adCount}</span>
              <p className="text-[8px] font-black uppercase text-slate-600 mt-1">Ads</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
              <p className="text-[8px] font-black uppercase text-slate-600">Live Viewers</p>
              <span className="text-2xl font-black text-emerald-400">{liveViewers}</span>
            </div>
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
              <p className="text-[8px] font-black uppercase text-slate-600">Current Segment</p>
              {liveMetrics ? (
                <div className="mt-1">
                  <span className="text-[10px] font-black uppercase text-white block truncate">{liveMetrics.title}</span>
                  <span className={`text-[8px] font-black uppercase ${liveMetrics.isAd ? 'text-orange-400' : 'text-purple-400'}`}>
                    {liveMetrics.isAd ? 'AD' : 'MEDIA'} * #{liveMetrics.index + 1}
                  </span>
                </div>
              ) : (
                <span className="text-[9px] text-slate-500">No signal</span>
              )}
            </div>
          </div>

          <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
            <p className="text-[8px] font-black uppercase text-slate-600">Segment Time</p>
            {liveMetrics ? (
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] font-mono text-white">{formatDuration(liveMetrics.segmentElapsed)}</span>
                <div className="flex-1 mx-3 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500"
                    style={{ width: `${Math.min((liveMetrics.segmentElapsed / Math.max(liveMetrics.segmentDuration, 1)) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-400">-{formatDuration(liveMetrics.segmentRemaining)}</span>
              </div>
            ) : (
              <span className="text-[9px] text-slate-500">Awaiting live signal</span>
            )}
          </div>

          <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${selectedChannel.is_active ? 'bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse' : 'bg-red-400'}`} />
              <span className={`text-sm font-black uppercase tracking-widest ${selectedChannel.is_active ? 'text-emerald-400' : 'text-red-400'}`}>
                {selectedChannel.is_active
                  ? selectedChannel.scheduled_start_time
                    ? 'SCHEDULED'
                    : 'LIVE & BROADCASTING'
                  : 'OFFLINE / STANDBY'
                }
              </span>
            </div>
            {selectedChannel.live_started_at && selectedChannel.is_active && (
              <p className="text-[8px] font-mono text-slate-500 mt-2">
                Started: {new Date(selectedChannel.live_started_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-black/40 border border-white/5 rounded-2xl p-4">
            <label className="text-[8px] font-black uppercase text-slate-600 mb-2 block">Schedule Start Time</label>
            <input
              type="datetime-local"
              defaultValue={selectedChannel.scheduled_start_time ? new Date(selectedChannel.scheduled_start_time).toISOString().slice(0, 16) : ''}
              onChange={(e) => {
                if (e.target.value) onScheduleLive(e.target.value);
                else onClearScheduleTime();
              }}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] text-white focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onRefresh}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] text-slate-300 transition-all"
            >
              Refresh Schedule
            </button>
            <button
              onClick={onAutoCalc}
              disabled={autoCalcRunning}
              className="flex-1 py-3 bg-orange-600/80 hover:bg-orange-600 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] text-white transition-all disabled:opacity-50"
            >
              {autoCalcRunning ? 'Auto-Calc...' : 'Auto-Calc Durations'}
            </button>
            <button
              onClick={onSaveDurations}
              disabled={savingDurations || scheduleLength === 0}
              className="flex-1 py-3 bg-emerald-600/80 hover:bg-emerald-600 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] text-white transition-all disabled:opacity-50"
            >
              {savingDurations ? 'Saving...' : 'Save Durations'}
            </button>
            <button
              onClick={onResync}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] text-white transition-all"
            >
              Resync Start
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {selectedChannel.is_active ? (
              <button
                onClick={onGoOffline}
                className="flex-1 py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-black uppercase text-xs tracking-[0.2em] text-white transition-all shadow-2xl shadow-red-900/20 flex items-center justify-center gap-3"
              >
                <div className="w-2 h-2 bg-white rounded-full" />
                Go Offline
              </button>
            ) : (
              <button
                onClick={onGoLive}
                disabled={disableGoLive}
                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/30 disabled:cursor-not-allowed rounded-2xl font-black uppercase text-xs tracking-[0.2em] text-white transition-all shadow-2xl shadow-emerald-900/20 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
              >
                {processingLabel ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {processingLabel}
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Go Live Now
                  </>
                )}
              </button>
            )}
          </div>

          {scheduleLength === 0 && !selectedChannel.is_active && (
            <p className="text-[9px] text-red-400/60 font-mono text-center">Add at least one media item to go live</p>
          )}
          {missingDurationCount > 0 && (
            <div className="text-center space-y-2">
              <p className="text-[9px] text-orange-400/80 font-mono">Missing durations: {missingDurationCount}</p>
              <button
                onClick={onShowMissingReport}
                className="text-[9px] font-black uppercase tracking-widest text-orange-400 hover:text-orange-300 transition-all"
              >
                View Missing Report
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BroadcastControls;
