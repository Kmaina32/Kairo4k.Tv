import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';

serve(async (req) => {
  const url = new URL(req.url).searchParams.get('url');
  if (!url) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return new Response(`Failed to fetch: ${response.statusText}`, { status: response.status });
    }

    const text = await response.text();
    const headers = new Headers({
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });

    return new Response(text, { headers });
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
});
