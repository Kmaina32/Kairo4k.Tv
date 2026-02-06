
import { PlaylistSource, Channel } from './types';

export const NASA_CHANNELS: Channel[] = [
  {
    id: 'nasa-tv-uhd',
    name: 'NASA TV Public',
    group: 'Science & Education',
    logo: 'https://www.nasa.gov/wp-content/themes/nasa/assets/images/nasa-logo.svg',
    url: 'http://nasatv-lh.akamaihd.net/i/NASA_101@319270/index_1000_av-p.m3u8',
    source: 'K 4k'
  }
];

export const DEFAULT_PLAYLISTS: PlaylistSource[] = [
  { name: 'Roku', url: 'https://www.apsattv.com/rok.m3u', type: 'Premium' },
  { name: 'Redbox', url: 'https://www.apsattv.com/redbox.m3u', type: 'Premium' },
  { name: 'Samsung USA', url: 'https://www.apsattv.com/ssungusa.m3u', type: 'Samsung' },
  { name: 'Vizio', url: 'https://www.apsattv.com/vizio.m3u', type: 'Vizio' },
  { name: 'Distro', url: 'https://www.apsattv.com/distro.m3u', type: 'Distro' },
  { name: 'Local Now', url: 'https://www.apsattv.com/localnow.m3u', type: 'Local' },
  { name: 'Sports', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u', type: 'Sports' },
  { name: 'Tablo', url: 'https://www.apsattv.com/tablo.m3u', type: 'Tablo' },
  { name: 'Xiaomi', url: 'https://www.apsattv.com/xiaomi.m3u', type: 'Xiaomi' },
  { name: 'Fire TV', url: 'https://www.apsattv.com/firetv.m3u', type: 'FireTV' },
  { name: 'Xumo', url: 'https://www.apsattv.com/xumo.m3u', type: 'Xumo' },
  { name: 'Global News', url: 'https://iptv-org.github.io/iptv/categories/news.m3u', type: 'News' },
  { name: 'Movies', url: 'https://iptv-org.github.io/iptv/categories/movies.m3u', type: 'Entertainment' },
  { name: 'Music', url: 'https://iptv-org.github.io/iptv/categories/music.m3u', type: 'Entertainment' }
];

export const PROXY_OPTIONS = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://thingproxy.freeboard.io/fetch/',
  'https://proxy.cors.sh/' // Professional grade backup
];

export const CACHE_TTL = 1000 * 60 * 30; // 30 minutes cache for high-concurrency safety
