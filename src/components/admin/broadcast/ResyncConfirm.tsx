import React from 'react';

interface ResyncConfirmProps {
    onClose: () => void;
    onConfirm: () => void;
}

const ResyncConfirm = ({ onClose, onConfirm }: ResyncConfirmProps) => {
    return (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[32px] p-6 shadow-2xl">
                <h3 className="text-sm font-black uppercase tracking-widest text-white mb-3">Force Resync Start</h3>
                <p className="text-[10px] text-slate-400 font-mono mb-6">
                    This resets the live start time for all viewers and will desync anyone currently watching.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-white/5 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] text-slate-400"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] text-white"
                    >
                        Force Resync
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ResyncConfirm;
