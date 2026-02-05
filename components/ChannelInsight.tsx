import React from 'react';

/**
 * Component for displaying AI-generated channel insights.
 */
interface ChannelInsightProps {
  insight: string;
}

const ChannelInsight = ({ insight }: ChannelInsightProps) => {
  if (!insight) return null;
  
  return (
    <div className="mt-8 p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl text-left animate-in fade-in duration-1000">
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Gemini AI Frequency Analysis</span>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed italic">{insight}</p>
    </div>
  );
};

export default ChannelInsight;