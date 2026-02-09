import React from 'react';
import { AppView } from '../../types';

interface MobileNavProps {
    isTheater: boolean;
    activeView: AppView;
    onViewChange: (view: AppView) => void;
    onSidebarOpen: () => void;
}

const MobileNav = ({
    isTheater,
    activeView,
    onViewChange,
    onSidebarOpen
}: MobileNavProps) => {
    const navItems = [
        { id: 'live', label: 'Live', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
        { id: 'movies', label: 'Theater', icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></> },
        { id: 'menu', label: 'Menu', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />, isMenu: true },
        { id: 'favorites', label: 'Saved', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /> },
        { id: 'account', label: 'Profile', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
    ];

    if (isTheater) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden">
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl border-t border-white/5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]" />

            <div className="relative flex items-center justify-around h-20 px-4">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            if (item.isMenu) {
                                onSidebarOpen();
                            } else {
                                onViewChange(item.id as AppView);
                            }
                        }}
                        className={`flex flex-col items-center justify-center gap-1.5 min-w-[3.5rem] transition-all duration-300 ${activeView === item.id
                            ? 'text-orange-500 scale-110'
                            : 'text-slate-500 hover:text-white'
                            }`}
                    >
                        <div className={`p-2 rounded-xl transition-all ${activeView === item.id ? 'bg-orange-500/10' : ''
                            }`}>
                            <svg
                                className={`w-6 h-6 transition-all ${activeView === item.id ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                {item.icon}
                            </svg>
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-widest transition-opacity ${activeView === item.id ? 'opacity-100' : 'opacity-40'
                            }`}>
                            {item.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* iPhone Notch Spacer */}
            <div className="h-[env(safe-area-inset-bottom)] bg-black/80 backdrop-blur-2xl" />
        </nav>
    );
};

export default MobileNav;
