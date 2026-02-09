import React from 'react';

interface BroadcastHeaderProps {
  onCreate: () => void;
  onGoLive: () => void;
  canGoLive: boolean;
}

const BroadcastHeader = ({ onCreate, onGoLive, canGoLive }: BroadcastHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
      <div>
        <h2 className="text-2xl font-black uppercase tracking-widest text-white">Broadcast Deck</h2>
        <p className="text-[10px] text-purple-500 font-black mt-1 uppercase tracking-widest">Virtual VOD-to-Live Systems</p>
      </div>
      <div className="flex gap-3 w-full md:w-auto">
        <button
          onClick={onCreate}
          className="flex-1 md:flex-none px-6 py-3 bg-purple-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-purple-500 transition-all shadow-xl shadow-purple-900/20"
        >
          Initialize Channel
        </button>
        <button
          onClick={onGoLive}
          disabled={!canGoLive}
          className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-30"
        >
          Go Live Now
        </button>
      </div>
    </div>
  );
};

export default BroadcastHeader;
