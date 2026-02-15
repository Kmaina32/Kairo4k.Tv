
import React from 'react';
import { UserProfile, CloudStats, AppView } from '../../../types';
import { supabase } from '../../../services/supabaseClient';

interface AccountPageProps {
    user?: UserProfile;
    stats: CloudStats | null;
    onViewChange: (view: AppView) => void;
}

const AccountPage = ({ user, stats, onViewChange }: AccountPageProps) => {
    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error logging out:', error.message);
    };

    return (
        <div className="flex-1 overflow-y-auto bg-black text-white p-6 no-scrollbar">
            {/* PROFILE HEADER - REDESIGNED */}
            <div className="flex flex-col items-center text-center mb-10 p-10 glass rounded-[40px] border-orange-500/10">
                <div className="w-32 h-32 rounded-[40px] bg-gradient-to-br from-orange-500 to-amber-600 p-1 mb-6 shadow-2xl shadow-orange-500/20">
                    <div className="w-full h-full bg-black rounded-[36px] flex items-center justify-center text-5xl font-black text-orange-500">
                        {user?.username?.[0] || 'K'}
                    </div>
                </div>

                <h2 className="text-3xl font-black tracking-tight uppercase tracking-[0.05em] mb-2">
                    {user?.username || 'Kairo Member'}
                </h2>
                <p className="text-sm font-mono text-slate-400 mb-6 lowercase">{user?.email || 'member@kairo.com'}</p>

                <div className="flex items-center gap-3">
                    <span className="px-4 py-1.5 bg-orange-600/10 border border-orange-500/30 rounded-full text-[10px] font-black uppercase tracking-widest text-orange-500">
                        Rank: {user?.rank || 'Member'}
                    </span>
                    <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono uppercase tracking-widest text-slate-500">
                        ID: #8802-QX
                    </span>
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
                            <h3 className="text-xs font-black uppercase tracking-[0.3em]">Admin Settings</h3>
                            <p className="text-[8px] font-mono text-orange-500/50 uppercase tracking-widest mt-0.5">Control Panel Access</p>
                        </div>
                    </div>
                    <svg className="w-4 h-4 text-orange-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
                </button>
            )}

            {/* SYSTEM STATS GRID */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="glass p-6 rounded-[32px] border-white/5">
                    <span className="text-[9px] font-black uppercase text-slate-500 block mb-2">Active Users</span>
                    <div className="text-xl font-mono text-white tracking-tighter">{stats?.activeSignals || '1,422'}</div>
                    <div className="h-1 w-full bg-white/5 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-orange-500 w-[65%]" />
                    </div>
                </div>
                <div className="glass p-6 rounded-[32px] border-white/5">
                    <span className="text-[9px] font-black uppercase text-slate-500 block mb-2">Connection</span>
                    <div className="text-xl font-mono text-white tracking-tighter">{stats?.postgresLatency || '28'}ms</div>
                    <div className="h-1 w-full bg-white/5 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[20%]" />
                    </div>
                </div>
            </div>

            {/* ACTION MENU */}
            <div className="space-y-4 pb-32">
                <div className="px-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/40 mb-4">Account Settings</h4>
                    <div className="space-y-3">
                        <button className="w-full py-6 px-8 glass rounded-[24px] border-white/5 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.15em] text-slate-300 hover:text-white transition-all group hover:border-orange-500/20">
                            <span>Status</span>
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] text-orange-500 font-mono">ONLINE</span>
                                <svg className="w-4 h-4 text-orange-500/30 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
                            </div>
                        </button>

                        <button
                            onClick={handleLogout}
                            className="w-full py-6 px-8 bg-red-500/5 border border-red-500/20 rounded-[24px] flex items-center justify-between text-[11px] font-black uppercase tracking-[0.15em] text-red-400 hover:bg-red-500 hover:text-white transition-all group"
                        >
                            <span>Logout</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountPage;
