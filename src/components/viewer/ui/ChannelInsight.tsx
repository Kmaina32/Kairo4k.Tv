
import React from 'react';

interface ChannelInsightProps {
  insight: string;
}

const ChannelInsight = ({ insight }: ChannelInsightProps) => {
  if (!insight) return null;
  
  return (
    <div className="mt-10 p-8 glass border-indigo-500/10 rounded-[35px] text-left animate-in fade-in zoom-in-95 duration-1000 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
        <svg className="w-12 h-12 text-indigo-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
      </div>
      
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex space-x-1">
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
        </div>
        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-400">Gemini_Core_Analysis</span>
      </div>
      
      <p className="text-[13px] text-slate-300 leading-relaxed font-medium italic drop-shadow-md">
        {insight}
      </p>
      
      <div className="mt-8 flex items-center justify-between opacity-30">
        <div className="h-px bg-white/10 flex-1" />
        <span className="mx-4 text-[8px] font-black uppercase tracking-widest text-slate-500 italic">Phase_04_Active</span>
        <div className="h-px bg-white/10 flex-1" />
      </div>
    </div>
  );
};

export default ChannelInsight;
