
import { PlaylistSource } from './types';

export const DEFAULT_PLAYLISTS: PlaylistSource[] = [
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
    name: 'Xiaomi',
    url: 'https://www.apsattv.com/xiaomi.m3u',
    type: 'Xiaomi'
  },
  {
    name: 'Tablo',
    url: 'https://www.apsattv.com/tablo.m3u',
    type: 'Tablo'
  },
  {
    name: 'LocalNow',
    url: 'https://www.apsattv.com/localnow.m3u',
    type: 'LocalNow'
  },
  {
    name: 'Xumo',
    url: 'https://www.apsattv.com/xumo.m3u',
    type: 'Xumo'
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
