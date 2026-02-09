import React, { useState, useRef, useEffect } from 'react';
import { AppView, UserProfile } from '../../types';
import BrandLogo from './BrandLogo';

interface HeaderProps {
    onMenuClick: () => void;
    searchTerm: string;
    setSearchTerm: (s: string) => void;
    onViewChange: (view: AppView) => void;
    activeView: AppView;
    user: UserProfile | null;
}

const Header = ({
    onMenuClick,
    searchTerm,
    setSearchTerm,
    onViewChange,
    activeView,
    user
}: HeaderProps) => {
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsUserDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="h-20 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-6 z-[40]">
            <div className="flex items-center gap-8">
                <button
                    onClick={onMenuClick}
                    className="p-2 hover:bg-white/5 rounded-xl transition-all lg:hidden"
                >
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <div className="cursor-pointer" onClick={() => onViewChange('live')}>
                    <BrandLogo size="md" />
                </div>

                <nav className="hidden lg:flex items-center gap-1 ml-4">
                    {[
                        { id: 'live', label: 'Live' },
                        { id: 'movies', label: 'Theater' },
                        { id: 'favorites', label: 'Priority' }
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onViewChange(item.id as AppView)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === item.id
                                    ? 'text-indigo-500 bg-indigo-500/5'
                                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="flex-1 max-w-xl mx-12 hidden md:block">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-slate-500 group-focus-within:text-orange-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search signals..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-xs font-mono text-white placeholder-white/20 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                {user?.rank === 'Admin' && (
                    <button
                        onClick={() => onViewChange('admin')}
                        className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl border border-orange-500/20 text-orange-500 text-[9px] font-black uppercase tracking-widest transition-all hover:bg-orange-500/10 ${activeView === 'admin' ? 'bg-orange-500/10 border-orange-500/50' : ''
                            }`}
                    >
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                        Admin
                    </button>
                )}

                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                        className="flex items-center gap-3 p-1.5 pr-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
                    >
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-black text-white shadow-lg">
                            {user?.username?.[0] || 'U'}
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-[10px] font-black uppercase tracking-wider text-white leading-none mb-0.5">
                                {user?.username || 'Guest'}
                            </p>
                            <p className="text-[8px] font-mono text-slate-500 uppercase leading-none">
                                {user?.rank || 'Operator'}
                            </p>
                        </div>
                    </button>

                    {isUserDropdownOpen && (
                        <div className="absolute top-full right-0 mt-3 w-56 bg-[#020617] border border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl z-50">
                            <button
                                onClick={() => {
                                    onViewChange('account');
                                    setIsUserDropdownOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                Profile Terminal
                            </button>
                            <button
                                onClick={() => {
                                    onViewChange('watchlist');
                                    setIsUserDropdownOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                                Watchlist
                            </button>
                            <div className="h-px bg-white/5 my-2" />
                            <button
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-red-400 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
