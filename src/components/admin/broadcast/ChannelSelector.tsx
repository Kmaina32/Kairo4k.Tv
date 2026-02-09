import React from 'react';

interface ChannelSelectorProps {
  channels: any[];
  selectedChannel: any | null;
  onSelect: (channel: any) => void;
}

const ChannelSelector = ({ channels, selectedChannel, onSelect }: ChannelSelectorProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Active Frequencies</h3>
      {channels.length === 0 ? (
        <div className="p-8 text-center opacity-30">
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">No channels initialized</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <select
              value={selectedChannel?.id || ''}
              onChange={(e) => {
                const next = channels.find(c => c.id === e.target.value);
                if (next) onSelect(next);
              }}
              className="w-full appearance-none bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-10 text-[10px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-purple-500/60"
            >
              <option value="" disabled>Select Channel</option>
              {channels.map(chan => (
                <option key={chan.id} value={chan.id}>{chan.name}</option>
              ))}
            </select>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {selectedChannel && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${selectedChannel.is_active ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-red-400'}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white block truncate">{selectedChannel.name}</span>
                  {selectedChannel.description && (
                    <span className="text-[8px] uppercase tracking-wider block mt-1 truncate text-slate-500">{selectedChannel.description}</span>
                  )}
                </div>
                <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${selectedChannel.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {selectedChannel.is_active ? 'LIVE' : 'OFF'}
                </span>
              </div>
              {selectedChannel.live_started_at && selectedChannel.is_active && (
                <div className="mt-3 text-[8px] font-mono text-emerald-400 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Started: {new Date(selectedChannel.live_started_at).toLocaleTimeString()}
                </div>
              )}
              {selectedChannel.scheduled_start_time && selectedChannel.is_active && !selectedChannel.live_started_at && (
                <div className="mt-3 text-[8px] font-mono text-purple-400 flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Scheduled: {new Date(selectedChannel.scheduled_start_time).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChannelSelector;
