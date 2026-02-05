
import { PlaylistSource, Channel } from './types';

export const NASA_CHANNELS: Channel[] = [
  {
    id: 'nasa-tv-uhd',
    name: 'NASA TV Public',
    group: 'Science & Education',
    logo: 'https://www.nasa.gov/wp-content/themes/nasa/assets/images/nasa-logo.svg',
    url: 'http://nasatv-lh.akamaihd.net/i/NASA_101@319270/index_1000_av-p.m3u8',
    source: 'Kairo Exclusives'
  }
];

export const DEFAULT_PLAYLISTS: PlaylistSource[] = [
  {
    name: 'Kairo Exclusives',
    url: '', // Local injection
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
    name: 'Distro',
    url: 'https://www.apsattv.com/distro.m3u',
    type: 'Distro'
  },
  {
    name: 'Samsung USA',
    url: 'https://www.apsattv.com/ssungusa.m3u',
    type: 'Samsung'
  },
  {
    name: 'Sports',
    url: 'https://iptv-org.github.io/iptv/categories/sports.m3u',
    type: 'Sports'
  }
];

export const PROXY_OPTIONS = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://thingproxy.freeboard.io/fetch/'
];
