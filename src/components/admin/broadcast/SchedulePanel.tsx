import React from 'react';

interface ScheduleItem {
  id: string;
  media_id: string | null;
  ad_id: string | null;
  order_index: number;
  duration: number;
  media_library?: { title: string; duration: number; cover_url: string; stream_url: string; category: string };
  ads_library?: { title: string; duration: number; ad_url: string };
}

interface SchedulePanelProps {
  schedule: ScheduleItem[];
  liveIndex: number | null;
  showPreview: boolean;
  onTogglePreview: () => void;
  onRemove: (id: string) => void;
  onMove: (index: number, dir: 'up' | 'down') => void;
  formatDuration: (seconds: number) => string;
  getItemDuration: (item: ScheduleItem) => number;
  totalDuration: number;
  mobileHidden: boolean;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  dragOverIndex: number | null;
  dragIndex: number | null;
}

const SchedulePanel = ({
  schedule,
  liveIndex,
  showPreview,
  onTogglePreview,
  onRemove,
  onMove,
  formatDuration,
  getItemDuration,
  totalDuration,
  mobileHidden,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dragOverIndex,
  dragIndex
}: SchedulePanelProps) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xs font-black text-white uppercase tracking-widest">Broadcast Timeline</h3>
          <p className="text-[10px] text-slate-500 mt-1">Total: {formatDuration(totalDuration)}</p>
        </div>
        <button
          onClick={onTogglePreview}
          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${showPreview ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
        >
          {showPreview ? 'Hide Timeline' : 'Timeline'}
        </button>
      </div>

      {showPreview && schedule.length > 0 && (
        <div className="bg-black/40 border border-white/5 rounded-2xl p-6 mb-6">
          <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-4">Broadcast Timeline</h4>
          <div className="flex h-8 rounded-xl overflow-hidden border border-white/5">
            {schedule.map((item, idx) => {
              const dur = getItemDuration(item);
              const widthPercent = totalDuration > 0 ? (dur / totalDuration) * 100 : 0;
              return (
                <div
                  key={item.id}
                  className={`relative group cursor-pointer transition-all hover:brightness-125 ${item.ad_id ? 'bg-orange-600/60' : 'bg-purple-600/60'}`}
                  style={{ width: `${Math.max(widthPercent, 1)}%` }}
                >
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                    <span className="text-[7px] font-black text-white/60 truncate px-1">{idx + 1}</span>
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 border border-white/10 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    <p className="text-[9px] font-black text-white">{item.media_library?.title || item.ads_library?.title}</p>
                    <p className="text-[8px] text-slate-400">{formatDuration(dur)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 gap-3 max-h-[52vh] md:max-h-[520px] overflow-y-auto no-scrollbar pr-2 ${mobileHidden ? 'hidden md:grid' : ''}`}>
        {schedule.length === 0 ? (
          <div className="py-16 text-center opacity-30">
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Empty Schedule</p>
          </div>
        ) : (
          schedule.map((item, idx) => {
            const dur = getItemDuration(item);
            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDrop={() => onDrop(idx)}
                onDragEnd={onDragEnd}
                className={`group flex items-center gap-4 p-3 rounded-2xl border transition-all ${liveIndex === idx ? 'bg-purple-600/20 border-purple-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/10'} ${dragOverIndex === idx ? 'ring-2 ring-purple-500/40' : ''} ${dragIndex === idx ? 'opacity-60' : ''}`}
              >
                <div className="text-[10px] font-black text-slate-600 w-4 italic">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {item.media_library?.title || item.ads_library?.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${item.ad_id ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {item.ad_id ? 'AD' : 'MEDIA'}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">{formatDuration(dur)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); onMove(idx, 'up'); }}
                    disabled={idx === 0}
                    className="p-1 text-slate-500 hover:text-white disabled:opacity-20"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" /></svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onMove(idx, 'down'); }}
                    disabled={idx === schedule.length - 1}
                    className="p-1 text-slate-500 hover:text-white disabled:opacity-20"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
                <button
                  onClick={() => onRemove(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SchedulePanel;
