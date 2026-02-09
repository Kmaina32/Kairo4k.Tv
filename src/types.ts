
export interface Channel {
  id: string;
  name: string;
  group: string;
  logo: string;
  url: string;
  source: string;
}

export interface PlaylistSource {
  name: string;
  url: string;
  type: string;
}

export interface UserProfile {
  id: string; // UUID format
  username: string;
  email?: string;
  rank: 'Operator' | 'Admin' | 'Guest';
  joinedAt: number;
  lastSync: number;
}

export interface ProxyStatus {
  url: string;
  status: 'healthy' | 'degraded' | 'offline';
  latency: number;
}

export interface CloudStats {
  globalUsers: number;
  activeSignals: number;
  serverLoad: number;
  dbStatus: 'connected' | 'reconnecting' | 'error';
  postgresLatency: number;
}

export type AppView = 'live' | 'favorites' | 'account' | 'admin' | 'movies' | 'playlists' | 'watchlist' | 'subscriptions' | 'history' | 'media-favorites';
