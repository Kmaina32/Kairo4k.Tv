
import { PROXY_OPTIONS } from '../constants';

/**
 * Verifies if a stream URL is responsive.
 * Uses the proxy chain to bypass CORS and check for a successful response.
 */
export const verifyStreamSignal = async (url: string): Promise<boolean> => {
  if (!url || url.startsWith('data:')) return true;

  // We use a shorter timeout for scanning to keep the background process efficient
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  // Attempt verification using the primary proxy for speed
  const proxy = PROXY_OPTIONS[0];
  try {
    const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, { 
      method: 'GET', 
      signal: controller.signal,
      headers: { 'Range': 'bytes=0-1' } // Only request first byte to minimize bandwidth
    });
    
    if (response.ok) {
      clearTimeout(timeoutId);
      return true;
    }
  } catch (e) {
    // If first proxy fails, we don't block the scanner; we just report it as unavailable for now
  }

  clearTimeout(timeoutId);
  return false;
};
