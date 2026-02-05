
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
  {
    name: 'Distro',
    url: 'https://www.apsattv.com/distro.m3u',
    type: 'Distro'
  },
  {
    name: 'Sports',
    url: 'https://iptv-org.github.io/iptv/categories/sports.m3u',
    type: 'Sports'
  },
  {
    name: 'K 4k',
    url: '', // Local injection via NASA_CHANNELS
    type: 'Featured'
  },
  {
    name: 'Roku',
    url: 'https://www.apsattv.com/rok.m3u',
    type: 'Roku'
  },
  {
    name: 'Redbox',
    url: 'https://www.apsattv.com/redbox.m3u',
    type: 'Redbox'
  },
  {
    name: 'Global News',
    url: 'https://iptv-org.github.io/iptv/categories/news.m3u',
    type: 'News'
  },
  {
    name: 'Movies',
    url: 'https://iptv-org.github.io/iptv/categories/movies.m3u',
    type: 'Entertainment'
  },
  {
    name: 'Documentary',
    url: 'https://iptv-org.github.io/iptv/categories/documentary.m3u',
    type: 'Education'
  },
  {
    name: 'Music',
    url: 'https://iptv-org.github.io/iptv/categories/music.m3u',
    type: 'Entertainment'
  },
  {
    name: 'Free-TV Project',
    url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8',
    type: 'Global'
  },
  {
    name: 'France (Tuto)',
    url: 'https://raw.githubusercontent.com/tuto1902/TutoIPTV/master/France.m3u',
    type: 'Regional'
  },
  {
    name: 'Italy (Tuto)',
    url: 'https://raw.githubusercontent.com/tuto1902/TutoIPTV/master/Italy.m3u',
    type: 'Regional'
  },
  {
    name: 'Spain (Tuto)',
    url: 'https://raw.githubusercontent.com/tuto1902/TutoIPTV/master/Spain.m3u',
    type: 'Regional'
  },
  {
    name: 'Samsung USA',
    url: 'https://www.apsattv.com/ssungusa.m3u',
    type: 'Samsung'
  }
];

export const PROXY_OPTIONS = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://thingproxy.freeboard.io/fetch/'
];
