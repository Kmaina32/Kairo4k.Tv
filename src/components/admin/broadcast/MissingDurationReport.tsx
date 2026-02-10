import React from 'react';

interface MissingItem {
    id: string;
    title: string;
    url: string;
    type: 'AD' | 'MEDIA';
}

interface MissingDurationReportProps {
    items: MissingItem[];
    onClose: () => void;
    onRetry: (item: MissingItem) => void;
    isProcessing: boolean;
}

const MissingDurationReport = ({ items, onClose, onRetry, isProcessing }: MissingDurationReportProps) => {
    return (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[32px] p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Missing Duration Report</h3>
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 bg-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                    >
                        Close
                    </button>
                </div>
                <div className="max-h-[420px] overflow-y-auto no-scrollbar space-y-2">
                    {items.map(item => (
                        <div key={item.id} className="bg-black/40 border border-white/5 rounded-xl p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase text-white truncate">{item.title}</p>
                                    <p className="text-[8px] text-slate-500 font-mono truncate">{item.url || 'Missing URL'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded ${item.type === 'AD' ? 'bg-orange-600/20 text-orange-400' : 'bg-purple-600/20 text-purple-400'}`}>
                                        {item.type}
                                    </span>
                                    <button
                                        onClick={() => onRetry(item)}
                                        disabled={!item.url || isProcessing}
                                        className="px-2 py-1 text-[8px] font-black uppercase tracking-widest rounded bg-white/5 border border-white/10 text-slate-300 hover:text-white disabled:opacity-40"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <div className="py-10 text-center text-[9px] text-slate-500">All items have durations.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MissingDurationReport;
