import React from 'react';

interface TimelineItem {
    id: string;
    duration: number | null;
    media_library?: { title: string | null };
    ads_library?: { title: string | null };
    ad_id?: string | null;
}

interface TimelineProps {
    timeline: Array<TimelineItem & { startTime: number; endTime: number }>;
    totalDuration: number;
    formatDuration: (seconds: number) => string;
    getItemDuration: (item: TimelineItem) => number;
}

const Timeline = ({ timeline, totalDuration, formatDuration, getItemDuration }: TimelineProps) => {
    if (timeline.length === 0 || totalDuration <= 0) return null;

    return (
        <div className="bg-black/40 border border-white/5 rounded-2xl p-6">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-4">
                Broadcast Timeline ({formatDuration(totalDuration)} total)
            </h4>
            <div className="flex h-8 rounded-xl overflow-hidden border border-white/5">
                {timeline.map((item) => {
                    const dur = getItemDuration(item);
                    const widthPercent = (dur / totalDuration) * 100;
                    return (
                        <div
                            key={item.id}
                            className={`relative group cursor-pointer transition-all hover:brightness-125 ${item.ad_id ? 'bg-orange-600/60' : 'bg-purple-600/60'}`}
                            style={{ width: `${Math.max(widthPercent, 1)}%` }}
                        >
                            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                                <span className="text-[7px] font-black text-white/60 truncate px-1">
                                    {timeline.indexOf(item) + 1}
                                </span>
                            </div>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 border border-white/10 rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                <p className="text-[9px] font-black text-white">
                                    {item.media_library?.title || item.ads_library?.title}
                                </p>
                                <p className="text-[8px] text-slate-400">{formatDuration(dur)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between mt-2">
                <span className="text-[8px] font-mono text-slate-600">0:00</span>
                <span className="text-[8px] font-mono text-slate-600">{formatDuration(totalDuration)}</span>
            </div>
        </div>
    );
};

export default Timeline;
