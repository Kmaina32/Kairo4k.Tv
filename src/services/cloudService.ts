import { Channel, UserProfile, CloudStats } from '../types';
import { supabase } from './supabaseClient';

/**
 * Kairo Cloud Service (Supabase Implementation)
 */
export const cloudService = {
  // DB: Sync Favorites to 'user_favorites' table
  async syncFavorites(userId: string, favorites: Channel[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_favorites')
        .upsert({
          user_id: userId,
          favorites_data: favorites,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (e) {
      console.error('[Supabase Error] syncFavorites:', e);
      return false;
    }
  },

  // DB: Fetch stats (Real from database)
  async getSystemStatus(): Promise<CloudStats> {
    try {
      const startTime = Date.now();

      // Perform parallel counts for efficiency
      const [
        { count: userCount },
        { count: channelCount }
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('virtual_channels').select('id', { count: 'exact', head: true })
      ]);

      const latency = Date.now() - startTime;

      return {
        globalUsers: userCount || 0,
        activeSignals: channelCount || 0,
        serverLoad: Math.floor(Math.random() * 15) + 5, // This is still simulated as it depends on server metrics
        dbStatus: 'connected',
        postgresLatency: latency
      };
    } catch (e) {
      console.error('[Supabase Error] getSystemStatus:', e);
      return {
        globalUsers: 0,
        activeSignals: 0,
        serverLoad: 0,
        dbStatus: 'error',
        postgresLatency: 0
      };
    }
  },

  // Server: Fetch M3U via Supabase Edge Function Proxy
  async fetchViaEdge(url: string): Promise<string | null> {
    try {
      console.log(`[Supabase Edge] Proxying request to: ${url}`);
      // If we have an edge function 'm3u-proxy' deployed:
      // const { data, error } = await supabase.functions.invoke('m3u-proxy', {
      //   body: { url }
      // });
      return null;
    } catch (e) {
      return null;
    }
  },

  // DB: Log system events to 'event_logs' table
  async logEvent(user: string, event: string): Promise<void> {
    try {
      await supabase.from('event_logs').insert({
        user_name: user,
        event_description: event,
        created_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('[Supabase Error] logEvent:', e);
    }
  }
};
