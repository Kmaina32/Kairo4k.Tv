import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { r2Service } from '../../services/r2Service';
import BrandedDialog from '../frontend/BrandedDialog';

interface DownloadTask {
    id: string;
    url: string;
    type: 'youtube' | 'torrent';
    status: 'pending' | 'downloading' | 'uploading' | 'completed' | 'failed';
    progress: number;
    quality?: string;
    filename?: string;
    error?: string;
    created_at: string;
}

const RemoteDownloader = () => {
    const [remoteUrl, setRemoteUrl] = useState('');
    const [downloadType, setDownloadType] = useState<'youtube' | 'torrent'>('youtube');
    const [quality, setQuality] = useState<'360p' | '720p' | '1080p' | 'best'>('720p');
    const [tasks, setTasks] = useState<DownloadTask[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [dialog, setDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmLabel?: string;
        cancelLabel?: string;
        type: 'info' | 'danger';
        onConfirm: () => void;
        hideCancel?: boolean;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: () => { }
    });

    const showDialog = (
        title: string,
        message: string,
        onConfirm?: () => void,
        type: 'info' | 'danger' = 'info',
        hideCancel = false,
        confirmLabel = 'Confirm',
        cancelLabel = 'Cancel'
    ) => {
        setDialog({
            isOpen: true,
            title,
            message,
            onConfirm: onConfirm || (() => setDialog(d => ({ ...d, isOpen: false }))),
            type,
            hideCancel,
            confirmLabel,
            cancelLabel
        });
    };

    useEffect(() => {
        fetchTasks();
        const subscription = supabase
            .channel('download_tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'download_tasks' }, () => {
                fetchTasks();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchTasks = async () => {
        const { data } = await supabase
            .from('download_tasks')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setTasks(data);
    };

    const handleStartDownload = async () => {
        if (!remoteUrl) return;

        setIsSubmitting(true);
        try {
            // 1. Create task in DB
            const { data, error } = await supabase
                .from('download_tasks')
                .insert([{
                    url: remoteUrl,
                    type: downloadType,
                    status: 'pending',
                    progress: 0,
                    quality: quality
                }])
                .select()
                .single();

            if (error) throw error;

            setRemoteUrl('');

            // 2. Trigger the downloader (Supabase Function or local worker)
            // We attempt to utilize the edge function if available, but fail silently if not deployed
            // as the local back-end worker will pick up the 'pending' task regardless.
            /* 
            const { error: triggerError } = await supabase.functions.invoke('process-remote-download', {
                body: { taskId: data.id }
            });

            if (triggerError) {
                // This is expected if the Edge Function isn't deployed. The local worker will handle it.
                console.warn('Edge Function trigger failed (using local worker fallback):', triggerError);
            }
            */

        } catch (err: any) {
            // Only show error dialog if the INITIAL INSERT failed.
            // If insert succeeded but trigger failed, we don't error because the local worker acts as fallback.
            showDialog('Error', err.message || 'Failed to start download', undefined, 'danger', true);
        } finally {
            setIsSubmitting(false);
            fetchTasks();
        }
    };

    const handleRetryTask = async (id: string) => {
        const { error } = await supabase
            .from('download_tasks')
            .update({ status: 'pending', progress: 0, error: null })
            .eq('id', id);
        if (!error) fetchTasks();
    };

    const handleDeleteTask = (id: string) => {
        showDialog(
            'Confirm Deletion',
            'Are you sure you want to remove this transmission task from the queue? This action cannot be undone.',
            async () => {
                const { error } = await supabase
                    .from('download_tasks')
                    .delete()
                    .eq('id', id);

                if (!error) {
                    fetchTasks();
                    setDialog(d => ({ ...d, isOpen: false }));
                } else {
                    showDialog('Error', 'Failed to delete task', undefined, 'danger', true);
                }
            },
            'danger',
            false,
            'Delete Task'
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'text-emerald-400 bg-emerald-500/10';
            case 'downloading': return 'text-blue-400 bg-blue-500/10';
            case 'uploading': return 'text-purple-400 bg-purple-500/10';
            case 'failed': return 'text-red-400 bg-red-500/10';
            default: return 'text-slate-400 bg-white/5';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* INPUT PANEL */}
            <div className="bg-white/5 rounded-[32px] border border-white/5 p-8 backdrop-blur-xl">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-500 ">Remote Source & Intensity</label>
                            <div className="flex gap-2">
                                {(['360p', '720p', '1080p', 'best'] as const).map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => setQuality(q)}
                                        className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${quality === q ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setDownloadType('youtube')}
                                className={`flex-1 py-4 rounded-2xl border transition-all flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest ${downloadType === 'youtube' ? 'bg-red-600 border-red-500 shadow-lg shadow-red-900/20' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}`}
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                                YouTube
                            </button>
                            <button
                                onClick={() => setDownloadType('torrent')}
                                className={`flex-1 py-4 rounded-2xl border transition-all flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest ${downloadType === 'torrent' ? 'bg-sky-600 border-sky-500 shadow-lg shadow-sky-900/20' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white'}`}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Torrent
                            </button>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                value={remoteUrl}
                                onChange={(e) => setRemoteUrl(e.target.value)}
                                placeholder={downloadType === 'youtube' ? "Paste YouTube Video URL..." : "Paste Magnet Link or Torrent URL..."}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 transition-all font-mono"
                            />
                            <button
                                onClick={handleStartDownload}
                                disabled={!remoteUrl || isSubmitting}
                                className="absolute right-2 top-2 bottom-2 px-8 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-900/20"
                            >
                                {isSubmitting ? 'Initializing...' : 'Decrypt & Download'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* TASK QUEUE */}
            <div className="bg-white/5 rounded-[32px] border border-white/5 p-8 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Download Queue</h3>
                    <div className="flex gap-2">
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                            {tasks.filter(t => t.status !== 'completed' && t.status !== 'failed').length} Active
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    {tasks.map(task => (
                        <div key={task.id} className="bg-black/20 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all group">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${task.type === 'youtube' ? 'bg-red-500/10 text-red-400' : 'bg-sky-500/10 text-sky-400'}`}>
                                        {task.type === 'youtube' ? (
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-[11px] font-bold text-white truncate max-w-full">{task.filename || task.url}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`inline-block px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest ${getStatusColor(task.status)}`}>
                                                {task.status}
                                            </span>
                                            <span className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">Quality: {task.quality || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {task.status === 'failed' && (
                                        <button
                                            onClick={() => handleRetryTask(task.id)}
                                            className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all"
                                            title="Retry"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteTask(task.id)}
                                        className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-all"
                                        title="Delete"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>

                            {task.status !== 'completed' && task.status !== 'failed' && (
                                <div className="space-y-2">
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ${task.status === 'uploading' ? 'bg-purple-500' : 'bg-orange-600'}`}
                                            style={{ width: `${task.progress}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-500">
                                        <span>{task.status === 'uploading' ? 'Finalizing with R2...' : 'Extracting from source...'}</span>
                                        <span>{task.progress}%</span>
                                    </div>
                                </div>
                            )}

                            {task.error && (
                                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-[10px] text-red-400 font-mono break-words uppercase tracking-tighter overflow-hidden max-h-20 leading-relaxed">
                                        {task.error}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}

                    {tasks.length === 0 && (
                        <div className="py-20 text-center opacity-20">
                            <svg className="w-12 h-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor border-2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Transmission Records</p>
                        </div>
                    )}
                </div>
            </div>

            <BrandedDialog
                isOpen={dialog.isOpen}
                title={dialog.title}
                message={dialog.message}
                confirmLabel={dialog.confirmLabel}
                cancelLabel={dialog.cancelLabel}
                onConfirm={dialog.onConfirm}
                onCancel={() => setDialog(d => ({ ...d, isOpen: false }))}
                type={dialog.type}
                hideCancel={dialog.hideCancel}
            />
        </div>
    );
};

export default RemoteDownloader;
