
import { Channel } from '../types';

export const parseM3U = (content: string, source: string): Channel[] => {
  if (!content) return [];
  
  // Clean up: remove BOM, handle mixed line endings
  const cleanedContent = content.replace(/^\ufeff/, ''); 
  const lines = cleanedContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  const channels: Channel[] = [];
  let currentMeta: Partial<Channel> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.toUpperCase().startsWith('#EXTINF:')) {
      // Robust regex for metadata that handles missing spaces or unusual quoting
      const logoMatch = line.match(/tvg-logo="([^"]*?)"/i);
      const groupMatch = line.match(/group-title="([^"]*?)"/i);
      
      // Extract Name: looking for text after the last comma
      const commaIndex = line.lastIndexOf(',');
      let name = '';
      if (commaIndex !== -1) {
        name = line.substring(commaIndex + 1).trim();
      }

      // If name is still empty, look for tvg-name
      if (!name) {
        const tvgNameMatch = line.match(/tvg-name="([^"]*?)"/i);
        name = tvgNameMatch ? tvgNameMatch[1] : '';
      }

      currentMeta = {
        name: name || '',
        logo: logoMatch ? logoMatch[1] : '',
        group: groupMatch ? groupMatch[1] : 'Live Content',
      };
    } else if (line.toUpperCase().startsWith('#EXTGRP:')) {
      if (currentMeta) {
        currentMeta.group = line.substring(8).trim();
      }
    } else if (line.toLowerCase().startsWith('http') || line.toLowerCase().includes('.m3u8')) {
      // Found a URL, create the channel entry
      const finalName = currentMeta.name || `${source} Ch ${channels.length + 1}`;
      const finalGroup = currentMeta.group || 'Broadcast';
      const finalLogo = currentMeta.logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(finalName)}`;

      channels.push({
        id: `${source}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        name: finalName,
        group: finalGroup,
        logo: finalLogo,
        url: line,
        source: source
      });
      
      // Reset for next block
      currentMeta = {};
    }
  }

  return channels;
};
