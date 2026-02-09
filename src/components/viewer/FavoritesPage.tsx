import React, { useState, useMemo } from 'react';
import { Channel } from '../../types';

interface FavoritesPageProps {
    favorites: Channel[];
    onSelectChannel: (channel: Channel) => void;
    onRemoveFavorite: (channel: Channel) => void;
    selectedChannel: Channel | null;
}

const FavoritesPage = ({ favorites, onSelectChannel, onRemoveFavorite, selectedChannel }: FavoritesPageProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterGroup, setFilterGroup] = useState<string>('All');

    // Extract unique groups from favorites
    const groups = useMemo(() => {
        const uniqueGroups = new Set(favorites.map(ch => ch.group || 'Other'));
        return ['All', ...Array.from(uniqueGroups)];
    }, [favorites]);

    // Filter favorites based on search and group
    const filteredFavorites = useMemo(() => {
        return favorites.filter(ch => {
            const matchesSearch = ch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (ch.group?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
            const matchesGroup = filterGroup === 'All' || ch.group === filterGroup;
            return matchesSearch && matchesGroup;
        });
    }, [favorites, searchTerm, filterGroup]);

    return (
        <div className="flex-1 flex flex-col pt-20 px-4 overflow-y-auto no-scrollbar pb-32 bg-gradient-to-b from-[#020617] to-black">
            {/* HEADER */}
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-2">
                    Favorites
                </h1>
                <p className="text-xs text-slate-500 uppercase tracking-widest">
                    {favorites.length} Saved Channels
                </p>
            </div>

            {/* SEARCH BAR */}
            <div className="mb-6 relative">
                <div className="relative">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search favorites..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-all"
                        >
                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* FILTER GROUPS */}
            {groups.length > 1 && (
                <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {groups.map(group => (
                        <button
                            key={group}
                            onClick={() => setFilterGroup(group)}
                            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterGroup === group
                                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/40'
                                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            {group}
                        </button>
                    ))}
                </div>
            )}

            {/* FAVORITES GRID */}
            {filteredFavorites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredFavorites.map(channel => (
                        <div key={channel.id} className="relative group">
                            <button
                                onClick={() => onSelectChannel(channel)}
                                className={`w-full h-40 md:h-48 relative bg-[#020617] border-2 rounded-3xl transition-all overflow-hidden text-left ${selectedChannel?.id === channel.id
                                        ? 'border-orange-500 ring-4 ring-orange-500/10'
                                        : 'border-white/5 hover:border-white/20'
                                    }`}
                            >
                                <div
                                    className="absolute inset-0 opacity-70 transition-all duration-700 group-hover:scale-110"
                                    style={{
                                        backgroundImage: `url(${channel.logo})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        backgroundColor: '#000',
                                        filter: 'contrast(1.1) brightness(0.5)'
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-black/40 to-transparent z-10" />
                                <div className="relative z-20 h-full flex flex-col justify-end p-4">
                                    <div className="flex-1" />
                                    <div>
                                        <span className="text-[7px] font-black uppercase text-orange-400 tracking-[0.1em] mb-0.5 block opacity-60">
                                            {channel.source}
                                        </span>
                                        <h4 className="text-[11px] md:text-xs font-black uppercase text-white truncate tracking-wider drop-shadow-md">
                                            {channel.name}
                                        </h4>
                                        {channel.group && (
                                            <span className="text-[8px] text-slate-500 uppercase tracking-widest">
                                                {channel.group}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>

                            {/* REMOVE BUTTON */}
                            <button
                                onClick={() => onRemoveFavorite(channel)}
                                className="absolute top-3 right-3 z-30 p-2 md:p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-xl hover:scale-110 active:scale-95"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-20">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                        <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-widest text-slate-500 mb-2">
                        {searchTerm ? 'No Results Found' : 'No Favorites Yet'}
                    </h3>
                    <p className="text-xs text-slate-600 uppercase tracking-wider text-center max-w-xs">
                        {searchTerm
                            ? 'Try adjusting your search or filter'
                            : 'Tap the heart icon on any channel to save it here'
                        }
                    </p>
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="mt-6 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                            Clear Search
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default FavoritesPage;
