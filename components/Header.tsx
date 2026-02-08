import { UserProfile, AppView } from '../types';

type HeaderProps = {
  onMenuClick: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onViewChange?: (view: AppView) => void;
  activeView?: AppView;
  user?: UserProfile;
};

const Header = ({ onMenuClick, searchTerm, setSearchTerm, onViewChange, activeView, user }: HeaderProps) => {
  return (
    <header className="flex-shrink-0 h-20 flex items-center justify-between px-6 bg-transparent z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-3 bg-white/5 border border-white/10 rounded-2xl text-white hover:bg-orange-600 transition-all shadow-xl group"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
          <button
            onClick={() => onViewChange?.('live')}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeView === 'live' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            Live
          </button>
          <button
            onClick={() => onViewChange?.('movies')}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeView === 'movies' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            Movies
          </button>
          <button
            onClick={() => onViewChange?.('favorites')}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeView === 'favorites' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            Favorites
          </button>
        </div>

        <div className="relative group">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-mono"
          />
        </div>

        {user && (
          <button
            onClick={() => onViewChange?.('account')}
            className={`flex items-center gap-3 p-1.5 pr-4 rounded-2xl transition-all border ${activeView === 'account' ? 'bg-orange-600/10 border-orange-500/40' : 'bg-white/5 border-transparent hover:border-white/10'}`}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-[12px] font-black text-white shadow-xl">
              {user.username ? user.username[0] : '?'}
            </div>
            <div className="flex flex-col items-start translate-y-0.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-white leading-none">{user.username || 'Unknown'}</span>
              <span className="text-[7px] font-mono uppercase tracking-widest text-orange-500/60 leading-tight">{user.rank}</span>
            </div>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;