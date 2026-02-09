import React from 'react';

interface BrandedDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'info';
    hideCancel?: boolean;
}

const BrandedDialog = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    type = 'info',
    hideCancel = false
}: BrandedDialogProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className={`w-full max-w-md bg-[#020617] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300`}>
                <div className="mb-6">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white mb-2">{title}</h3>
                    <p className="text-slate-400 text-xs font-medium leading-relaxed uppercase tracking-tight">{message}</p>
                </div>

                <div className="flex gap-4">
                    {!hideCancel && (
                        <button
                            onClick={onCancel}
                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                        >
                            {cancelLabel}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl ${type === 'danger'
                            ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20 text-white'
                            : 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20 text-white'
                            }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BrandedDialog;
