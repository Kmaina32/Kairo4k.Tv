import React from 'react';
import { CLOUDFLARE_BASE_URL } from '../../../constants';

interface ScheduleItem {
  id: string;
  order_index: number;
  duration: number | null;
  media_library?: { title: string; duration: number | null; cover_url: string | null; stream_url: string; category: string | null };
  ads_library?: { title: string; duration: number | null; ad_url: string };
  ad_id?: string | null;
  media_id?: string | null;
}

interface SchedulePanelProps {
  schedule: ScheduleItem[];
  formatDuration: (seconds: number) => string;
  getItemDuration: (item: ScheduleItem) => number;
  onRemove: (id: string) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  isReordering: boolean;
  dragIndex: number | null;
  dragOverIndex: number | null;
}

const SchedulePanel = ({
  schedule,
  formatDuration,
  getItemDuration,
  onRemove,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isReordering,
  dragIndex,
  dragOverIndex
}: SchedulePanelProps) => {
  if (schedule.length === 0) {
    return (
      <div className="py-16 text-center">
        <svg className="w-12 h-12 text-slate-800 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Empty Schedule</p>
        <p className="text-[9px] text-slate-700 mt-2">Add media and ads from the picker below</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 max-h-[52vh] md:max-h-[520px] overflow-y-auto no-scrollbar pr-2">
      {schedule.map((item, idx) => {
        const dur = getItemDuration(item);

        return (
          <div
            key={item.id}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragOver={(e) => onDragOver(e, idx)}
            onDrop={() => onDrop(idx)}
            onDragEnd={onDragEnd}
            className={`bg-black/40 border rounded-2xl p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4 group transition-all cursor-grab active:cursor-grabbing ${dragOverIndex === idx ? 'border-purple-500 bg-purple-500/10' :
              dragIndex === idx ? 'opacity-50 border-white/5' :
                item.ad_id ? 'border-orange-500/10' : 'border-white/5'
              }`}
          >
            <div className="flex flex-col gap-0.5 opacity-30 group-hover:opacity-60 transition-opacity">
              <div className="w-1 h-1 bg-white rounded-full" /><div className="w-1 h-1 bg-white rounded-full" />
              <div className="w-1 h-1 bg-white rounded-full" /><div className="w-1 h-1 bg-white rounded-full" />
              <div className="w-1 h-1 bg-white rounded-full" /><div className="w-1 h-1 bg-white rounded-full" />
            </div>

            <span className="text-[10px] font-black text-slate-700 w-6 text-center">{idx + 1}</span>

            <div className="w-10 h-10 rounded-lg bg-white/5 overflow-hidden shrink-0">
              {item.media_library?.cover_url ? (
                <img
                  src={item.media_library.cover_url.startsWith('http') ? item.media_library.cover_url : CLOUDFLARE_BASE_URL + item.media_library.cover_url}
                  className="w-full h-full object-cover"
                  alt=""
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${item.ad_id ? 'bg-orange-500/10' : 'bg-purple-500/10'}`}>
                  {item.ad_id ? (
                    <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M11 5.882V19.297A1.71 1.71 0 018.676 20.825L4.241 17.5H1.75C0.784 17.5 0 16.716 0 15.75V9.25C0 8.284 0.784 7.5 1.75 7.5H4.241L8.676 4.175A1.71 1.71 0 0111 5.882Z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-[11px] font-black uppercase text-white truncate">{item.media_library?.title || item.ads_library?.title || 'Unknown'}</h4>
                {item.ad_id && (
                  <span className="px-1.5 py-0.5 bg-orange-600/20 text-orange-500 text-[7px] font-black rounded border border-orange-500/20 shrink-0">
                    AD
                  </span>
                )}
                {item.media_library?.category && (
                  <span className="px-1.5 py-0.5 bg-purple-600/20 text-purple-400 text-[7px] font-black rounded border border-purple-500/20 shrink-0">
                    {item.media_library.category}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1">
                {dur > 0 ? (
                  <span className="text-[9px] font-mono text-slate-500">{formatDuration(dur)}</span>
                ) : (
                  <span className="text-[8px] text-orange-400 font-black uppercase">Duration missing</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onMove(idx, 'up'); }}
                disabled={idx === 0 || isReordering}
                className="p-1 text-slate-500 hover:text-white disabled:opacity-20"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMove(idx, 'down'); }}
                disabled={idx === schedule.length - 1 || isReordering}
                className="p-1 text-slate-500 hover:text-white disabled:opacity-20"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => onRemove(item.id)}
              className="p-2 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default SchedulePanel;
