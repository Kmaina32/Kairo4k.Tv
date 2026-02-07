
import React from 'react';
import { UserProfile, CloudStats } from '../types';

interface AccountPageProps {
    user?: UserProfile;
    stats: CloudStats | null;
    onViewChange: (view: 'live' | 'favorites' | 'account' | 'admin') => void;
}

const AccountPage = ({ user, stats, onViewChange }: AccountPageProps) => {
    return (
        <div className="flex-1 overflow-y-auto bg-black text-white p-6 no-scrollbar">
            {/* PROFILE HEADER */}
            <div className="flex items-center space-x-5 mb-10 p-6 glass rounded-[32px] border-orange-500/20">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 p-0.5">
                    <div className="w-full h-full bg-black rounded-[14px] flex items-center justify-center text-3xl font-black text-orange-500">
                        {user?.username?.[0] || 'K'}
                    </div>
                </div>
                <div>
                    <h2 className="text-2xl font-black tracking-tight uppercase tracking-[0.1em]">
                        Operator <span className="text-orange-500">{user?.username || 'Kairo'}</span>
                    </h2>
                    <span className="text-[10px] font-mono text-orange-500/60 uppercase tracking-widest">Nexus_ID: #8802-QX</span>
                </div>
            </div>

            {/* ADMIN ACCESS (ONLY FOR ADMIN RANK) */}
            {user?.rank === 'Admin' && (
                <button
                    onClick={() => onViewChange('admin')}
                    className="w-full mb-8 p-6 glass rounded-[35px] border-orange-500/40 flex items-center justify-between group hover:bg-orange-600/10 transition-all shadow-[0_20px_40px_rgba(249,115,22,0.15)]"
                >
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                        </div>
                        <div className="text-left">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em]">Command Deck</h3>
                            <p className="text-[8px] font-mono text-orange-500/50 uppercase tracking-widest mt-0.5">Authorized Level 4 Access</p>
                        </div>
                    </div>
                    <svg className="w-4 h-4 text-orange-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
                </button>
            )}

            {/* SYSTEM STATS GRID */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="glass p-5 rounded-[28px] border-white/5">
                    <span className="text-[9px] font-black uppercase text-slate-500 block mb-2">Global Signals</span>
                    <div className="text-xl font-mono text-white">{stats?.activeSignals || '1.2k'}</div>
                    <div className="h-1 w-full bg-white/5 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-orange-500 w-[65%]" />
                    </div>
                </div>
                <div className="glass p-5 rounded-[28px] border-white/5">
                    <span className="text-[9px] font-black uppercase text-slate-500 block mb-2">Postgres Latency</span>
                    <div className="text-xl font-mono text-white">{stats?.postgresLatency || '42'}ms</div>
                    <div className="h-1 w-full bg-white/5 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-orange-500 w-[20%]" />
                    </div>
                </div>
            </div>

            {/* SUBSCRIPTION PANEL */}
            <div className="relative overflow-hidden glass p-8 rounded-[35px] border-orange-500/30 mb-8">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <svg className="w-16 h-16 text-orange-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" /></svg>
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white mb-2">Premium Status</h3>
                <p className="text-xs text-slate-400 mb-6 max-w-[200px]">Unlock 4K Ultra-Low Latency nodes and ad-free nexus access.</p>
                <button className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_10px_30px_rgba(249,115,22,0.3)]">
                    Upgrade Access
                </button>
            </div>

            {/* MENU LIST */}
            <div className="space-y-4 pb-32">
                <div className="px-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/40 mb-3">Security & Access</h4>
                    <div className="space-y-2">
                        {['Signal Encryption', 'Node History', 'Proxy Protocol', 'Logout'].map((item) => (
                            <button key={item} className={`w-full py-5 px-6 glass rounded-2xl border-white/5 flex items-center justify-between text-[11px] font-black uppercase tracking-widest ${item === 'Logout' ? 'text-red-400' : 'text-slate-300'} hover:text-white transition-colors`}>
                                {item}
                                <svg className="w-4 h-4 text-orange-500/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="px-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/40 mb-3">Hardware Status</h4>
                    <div className="glass p-6 rounded-3xl border-white/5 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Decoder Load</span>
                            <span className="text-[10px] text-orange-500 font-mono">14%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Signal Buffer</span>
                            <span className="text-[10px] text-orange-500 font-mono">STABLE</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountPage;
