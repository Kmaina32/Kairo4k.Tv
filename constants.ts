
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

// User provided local content formatted as a data URI for zero-config integration
const DISCOVERY_LOCAL_M3U = "data:text/plain;charset=utf-8," + encodeURIComponent(`#EXTM3U
#EXTINF:-1,DISCOVERY DTX HD
http://163.172.33.168:22500/deniz/27012019/17443
#EXTINF:-1,DiSCOVERY SCIENSE HD
http://163.172.33.168:22500/deniz/27012019/2708
#EXTINF:-1,DISCOVERY IDX ULTRA HD
http://163.172.33.168:22500/deniz/27012019/24983
#EXTINF:-1,DiSCOVERY CHANNEL
http://163.172.33.168:22500/deniz/27012019/2709
#EXTINF:-1,DISCOVERY SHOWCASE HD
http://163.172.33.168:22500/deniz/27012019/2699
#EXTINF:-1,DAVINCI_LEARNING
http://163.172.33.168:22500/deniz/27012019/2700
#EXTINF:-1,CHASSE&PECHE HD
http://163.172.33.168:22500/deniz/27012019/3903
#EXTINF:-1,BLOOMBERG TV
http://163.172.33.168:22500/deniz/27012019/9549
#EXTINF:-1,TRT HABER ULTRA HD
http://163.172.33.168:22500/deniz/27012019/10470
#EXTINF:-1,HABERTURK ULTRA HD
http://163.172.33.168:22500/deniz/27012019/6686
#EXTINF:-1,TVNET ULTRA HD
http://163.172.33.168:22500/deniz/27012019/3873
#EXTINF:-1,CNN TURK ULTRA HD
http://163.172.33.168:22500/deniz/27012019/3343
#EXTINF:-1,A HABER ULTRA HD
http://163.172.33.168:22500/deniz/27012019/3347
#EXTINF:-1,ULKE TV ULTRA HD
http://163.172.33.168:22500/deniz/27012019/3352
#EXTINF:-1,HABER 61 TV
http://163.172.33.168:22500/deniz/27012019/9885
#EXTINF:-1,TGRT HABER ULTRA HD
http://163.172.33.168:22500/deniz/27012019/3350
#EXTINF:-1,NTV ULTRA HD
http://163.172.33.168:22500/deniz/27012019/3341
#EXTINF:-1,TELE 1 HD
http://163.172.33.168:22500/deniz/27012019/20440
#EXTINF:-1,TV 24 HD
http://163.172.33.168:22500/deniz/27012019/3872
#EXTINF:-1,DENIZ HABER TV
http://163.172.33.168:22500/deniz/27012019/9871
#EXTINF:-1,360 TV HD
http://163.172.33.168:22500/deniz/27012019/3874
#EXTINF:-1,TRT COCUK HD
http://163.172.33.168:22500/deniz/27012019/6907
#EXTINF:-1,NiCKELODEON
http://163.172.33.168:22500/deniz/27012019/3429
#EXTINF:-1,PLANET COCUK
http://163.172.33.168:22500/deniz/27012019/3983
#EXTINF:-1,CARTOON NETWORK
http://163.172.33.168:22500/deniz/27012019/6909
#EXTINF:-1,MINIKA GO
http://163.172.33.168:22500/deniz/27012019/6908
#EXTINF:-1,MiNiKA COCUK HD
http://163.172.33.168:22500/deniz/27012019/3426`);

export const DEFAULT_PLAYLISTS: PlaylistSource[] = [
  { name: 'Free Live Sports', url: 'https://www.apsattv.com/freelivesports.m3u', type: 'Sports' },
  { name: 'Africa', url: 'https://iptv-org.github.io/iptv/regions/afr.m3u', type: 'Region' },
  { name: 'Ultra HD Discovery', url: DISCOVERY_LOCAL_M3U, type: 'UltraHD' },
  { name: 'Roku', url: 'https://www.apsattv.com/rok.m3u', type: 'Premium' },
  { name: 'Redbox', url: 'https://www.apsattv.com/redbox.m3u', type: 'Premium' },
  { name: 'Vidaa', url: 'https://www.apsattv.com/vidaa.m3u', type: 'Vidaa' },
  { name: 'Tubi', url: 'https://raw.githubusercontent.com/BuddyChewChew/app-m3u-generator/refs/heads/main/playlists/tubi_all.m3u', type: 'Tubi' },
  { name: 'Soul TV', url: 'https://www.apsattv.com/soultv.m3u', type: 'SoulTV' },
  { name: 'Samsung Brazil', url: 'https://www.apsattv.com/ssungbra.m3u', type: 'Samsung' },
  { name: 'Rede ITTV', url: 'https://www.apsattv.com/redeitv.m3u', type: 'RedeITTV' },
  { name: 'Samsung USA', url: 'https://www.apsattv.com/ssungusa.m3u', type: 'Samsung' },
  { name: 'Vizio', url: 'https://www.apsattv.com/vizio.m3u', type: 'Vizio' },
  { name: 'TCL Plus', url: 'https://www.apsattv.com/tclplus.m3u', type: 'TCL' },
  { name: 'Zeasn', url: 'https://www.apsattv.com/zeasn.m3u', type: 'Zeasn' },
  { name: 'Distro', url: 'https://www.apsattv.com/distro.m3u', type: 'Distro' },
  { name: 'Local Now', url: 'https://www.apsattv.com/localnow.m3u', type: 'Local' },
  { name: 'Tablo', url: 'https://www.apsattv.com/tablo.m3u', type: 'Tablo' },
  { name: 'Xiaomi', url: 'https://www.apsattv.com/xiaomi.m3u', type: 'Xiaomi' },
  { name: 'Fire TV', url: 'https://www.apsattv.com/firetv.m3u', type: 'FireTV' },
  { name: 'Xumo', url: 'https://www.apsattv.com/xumo.m3u', type: 'Xumo' },
  { name: 'Sports', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u', type: 'Sports' },
  { name: 'Global News', url: 'https://iptv-org.github.io/iptv/categories/news.m3u', type: 'News' },
  { name: 'Movies', url: 'https://iptv-org.github.io/iptv/categories/movies.m3u', type: 'Entertainment' },
  { name: 'Music', url: 'https://iptv-org.github.io/iptv/categories/music.m3u', type: 'Entertainment' }
];

export const PROXY_OPTIONS = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
  'https://thingproxy.freeboard.io/fetch/',
  'https://proxy.cors.sh/' 
];

export const CACHE_TTL = 1000 * 60 * 30;
