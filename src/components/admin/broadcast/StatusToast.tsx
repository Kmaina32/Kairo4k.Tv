import React from 'react';

interface StatusToastProps {
  kind: 'error' | 'success';
  message: string;
}

const StatusToast = ({ kind, message }: StatusToastProps) => {
  const styles = kind === 'error'
    ? 'bg-red-500/90 border-red-400/20'
    : 'bg-emerald-500/90 border-emerald-400/20';

  return (
    <div className={`fixed top-4 right-4 z-50 ${styles} border text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest backdrop-blur-xl`}>
      {message}
    </div>
  );
};

export default StatusToast;
