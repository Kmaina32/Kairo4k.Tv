import React from 'react';

interface ChannelHeaderProps {
    channel: any;
    scheduleLength: number;
    mediaCount: number;
    adCount: number;
    isEditingName: boolean;
    pendingName: string;
    showPreview: boolean;
    formatDuration: (seconds: number) => string;
    totalDuration: number;
    onStartEditName: () => void;
    onNameChange: (value: string) => void;
    onSaveName: () => void;
    onCancelEditName: () => void;
    onTogglePreview: () => void;
}

const ChannelHeader = ({
    channel,
    scheduleLength,
    mediaCount,
    adCount,
    isEditingName,
    pendingName,
    showPreview,
    formatDuration,
    totalDuration,
    onStartEditName,
    onNameChange,
    onSaveName,
    onCancelEditName,
    onTogglePreview
}: ChannelHeaderProps) => {
    return (
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
                {!isEditingName ? (
                    <div className="flex items-center gap-3">
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">{channel.name}</h3>
                        <button
                            onClick={onStartEditName}
                            className="px-2 py-1 text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                        >
                            Edit
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                        <input
                            value={pendingName}
                            onChange={(e) => onNameChange(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white focus:outline-none focus:border-purple-500 font-mono w-full sm:w-64"
                            placeholder="Channel name"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={onSaveName}
                                className="px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-purple-600 text-white hover:bg-purple-500 transition-all"
                            >
                                Save
                            </button>
                            <button
                                onClick={onCancelEditName}
                                className="px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white/5 text-slate-400 hover:text-white transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-4 mt-2">
                    <span className="text-[10px] font-mono text-purple-400 uppercase">{scheduleLength} Segments</span>
                    <span className="text-[10px] font-mono text-slate-600">•</span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">{mediaCount} Media</span>
                    <span className="text-[10px] font-mono text-slate-600">•</span>
                    <span className="text-[10px] font-mono text-orange-400 uppercase">{adCount} Ads</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {scheduleLength > 0 && (
                    <button
                        onClick={onTogglePreview}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${showPreview ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                        {showPreview ? 'Hide Timeline' : 'Timeline'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ChannelHeader;
