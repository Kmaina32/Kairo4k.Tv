
import React, { useState, useEffect } from 'react';
import { CLOUDFLARE_BASE_URL } from '../../../constants';
import { supabase } from '../../../services/supabaseClient';
import MediaModal from '../content/AddMediaModal';
import BrandedDialog from '../../frontend/BrandedDialog';

interface EpisodeManagerModalProps {
    series: any;
    onClose: () => void;
}

const EpisodeManagerModal = ({ series, onClose }: EpisodeManagerModalProps) => {
    const [episodes, setEpisodes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mediaModalState, setMediaModalState] = useState<{ open: boolean, initialData?: any, parentId?: string }>({ open: false });

    const [dialog, setDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'info' | 'danger';
        onConfirm: () => void;
        hideCancel?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: () => { },
    });

    const showDialog = (title: string, message: string, onConfirm?: () => void, type: 'info' | 'danger' = 'info', hideCancel = false) => {
        setDialog({
            isOpen: true,
            title,
            message,
            onConfirm: onConfirm || (() => setDialog(d => ({ ...d, isOpen: false }))),
            type,
            hideCancel
        });
    };

    useEffect(() => {
        fetchEpisodes();
    }, [series.id]);

    const fetchEpisodes = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('media_library')
            .select('*')
            .eq('parent_id', series.id)
            .order('season_number', { ascending: true })
            .order('episode_number', { ascending: true });

        if (data) setEpisodes(data);
        setLoading(false);
    };

    const handleDeleteEpisode = async (id: string, title: string) => {
        showDialog(
            'Confirm Deletion',
            `Delete episode "${title}"?`,
            async () => {
                try {
                    const { error } = await supabase.from('media_library').delete().eq('id', id);
                    if (error) throw error;
                    fetchEpisodes();
                    setDialog(d => ({ ...d, isOpen: false }));
                } catch (err) {
                    console.error(err);
                    showDialog('Error', 'Failed to delete episode', undefined, 'danger', true);
                }
            },
            'danger'
        );
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="w-full max-w-4xl bg-[#0f172a] border border-white/10 rounded-[40px] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-widest text-white leading-tight">
                            Manage Episodes
                        </h2>
                        <p className="text-[10px] uppercase tracking-widest text-orange-500 font-black mt-1">
                            {series.title}
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setMediaModalState({ open: true, parentId: series.id })}
                            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-xl shadow-orange-900/20 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                            Add Episode
                        </button>
                        <button
                            onClick={onClose}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all border border-white/5"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-20">
                            <div className="w-12 h-12 border-4 border-white/20 border-t-orange-500 rounded-full animate-spin mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Loading...</p>
                        </div>
                    ) : episodes.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {episodes.map((ep) => (
                                <div
                                    key={ep.id}
                                    className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-6 group hover:border-orange-500/30 transition-all hover:bg-white/[0.07]"
                                >
                                    <div className="w-16 h-12 bg-black/40 rounded-xl flex items-center justify-center text-[11px] font-black text-orange-500 border border-white/5 shrink-0">
                                        S{ep.season_number}E{ep.episode_number}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-black uppercase tracking-widest text-white truncate">{ep.title}</h4>
                                        <p className="text-[10px] font-mono text-slate-500 truncate mt-1 uppercase tracking-wider">{ep.stream_url}</p>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button
                                            onClick={() => setMediaModalState({ open: true, initialData: ep })}
                                            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteEpisode(ep.id, ep.title)}
                                            className="p-3 bg-red-500/10 hover:bg-red-500 rounded-xl text-red-500 hover:text-white transition-all border border-red-500/20"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[32px]">
                            <svg className="w-12 h-12 text-white/5 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 002 2z" /></svg>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">No episodes found</p>
                        </div>
                    )}
                </div>

                {/* Footer Status */}
                <div className="p-6 bg-black/40 border-t border-white/5 flex justify-between items-center px-8">
                    <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">Storage: R2_PRIMARY</span>
                    <span className="text-[9px] font-mono text-orange-500/60 uppercase tracking-widest">{episodes.length} Episodes Found</span>
                </div>

                {/* Nested Media Modal */}
                {mediaModalState.open && (
                    <MediaModal
                        onClose={() => setMediaModalState({ open: false })}
                        onSuccess={() => {
                            fetchEpisodes();
                        }}
                        initialData={mediaModalState.initialData}
                        parentId={mediaModalState.parentId}
                    />
                )}
            </div>

            <BrandedDialog
                isOpen={dialog.isOpen}
                title={dialog.title}
                message={dialog.message}
                type={dialog.type}
                hideCancel={dialog.hideCancel}
                onConfirm={dialog.onConfirm}
                onCancel={() => setDialog(d => ({ ...d, isOpen: false }))}
            />
        </div>
    );
};

export default EpisodeManagerModal;
