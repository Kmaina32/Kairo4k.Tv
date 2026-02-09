import React from 'react';

interface CreateChannelModalProps {
  onClose: () => void;
  onCreate: (e: React.FormEvent) => void;
}

const CreateChannelModal = ({ onClose, onCreate }: CreateChannelModalProps) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0f172a] border border-white/10 rounded-[40px] p-10 shadow-2xl">
        <h2 className="text-xl font-black uppercase tracking-widest text-white mb-8">New Frequency</h2>
        <form onSubmit={onCreate} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Channel Name</label>
            <input name="name" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-purple-500/50" placeholder="KAIRO_LIVE_01" required />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description (Optional)</label>
            <input name="description" className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-purple-500/50" placeholder="24/7 Movie Marathon" />
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 bg-white/5 rounded-2xl font-black uppercase text-[10px] text-slate-500 hover:text-white transition-all">Abort</button>
            <button type="submit" className="flex-1 py-4 bg-purple-600 rounded-2xl font-black uppercase text-[10px] text-white hover:bg-purple-500 transition-all">Initialize</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChannelModal;
