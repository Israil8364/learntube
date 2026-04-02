import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript-plus';
import { fetch as undiciFetch, ProxyAgent } from 'undici';

// Proxy cache
let proxyCache: string[] = [];
let proxyTokenLastFetched = 0;

async function getProxies() {
  const apiKey = process.env.WEBSHARE_API_KEY;
  if (!apiKey) return [];

  // Cache for 5 minutes
  if (proxyCache.length > 0 && Date.now() - proxyTokenLastFetched < 5 * 60 * 1000) {
    return proxyCache;
  }

  try {
    const res = await fetch('https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page=1&page_size=25', {
      headers: { Authorization: `Token ${apiKey}` },
    });
    if (res.ok) {
      const data = await res.json();
      proxyCache = data.results.map(
        (p: any) => `http://${p.username}:${p.password}@${p.proxy_address}:${p.port}`
      );
      proxyTokenLastFetched = Date.now();
      return proxyCache;
    }
  } catch (err) {
    console.error('Error fetching proxies:', err);
  }
  return [];
}

const decodeEntities = (str: string) => {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  const videoIdMatch =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/) ||
    url.match(/^([a-zA-Z0-9_-]{11})$/);
  const videoId = videoIdMatch?.[1];

  if (!videoId) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  // Strategy: try DIRECT first (no proxy), then fall back to proxies.
  // Most home/server IPs work fine with YouTube. Free proxies are often flagged.
  const proxies = await getProxies();
  const shuffledProxies = [...proxies].sort(() => 0.5 - Math.random());

  // Build attempt list: null = direct, strings = proxy URLs
  const attempts: (string | null)[] = [null, ...shuffledProxies.slice(0, 3)];
  let lastError: unknown = null;

  for (let i = 0; i < attempts.length; i++) {
    const proxyUrl = attempts[i];
    const strategyLabel = proxyUrl ? `proxy attempt ${i}` : 'direct (no proxy)';

    const customFetch = async (params: {
      url: string;
      method?: string;
      headers?: any;
      body?: any;
    }): Promise<any> => {
      const headers = {
        ...params.headers,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      };

      if (proxyUrl) {
        const dispatcher = new ProxyAgent(proxyUrl);
        // @ts-ignore
        return undiciFetch(params.url, {
          method: params.method as any,
          headers,
          body: params.body,
          dispatcher,
        });
      } else {
        return fetch(params.url, {
          method: params.method,
          headers,
          body: params.body,
        });
      }
    };

    try {
      console.log(`[transcript] Trying ${strategyLabel} for video ${videoId}`);
      const result = await YoutubeTranscript.fetchTranscript(videoId, {
        videoDetails: true,
        videoFetch: customFetch,
        transcriptFetch: customFetch,
        playerFetch: customFetch,
      });

      const fullTranscript = result.segments.map((s) => decodeEntities(s.text)).join(' ');

      let thumbnailUrl = '';
      if (result.videoDetails.thumbnails.length > 0) {
        thumbnailUrl = result.videoDetails.thumbnails[result.videoDetails.thumbnails.length - 1].url;
      }

      console.log(`[transcript] Success via ${strategyLabel}`);
      return NextResponse.json({
        videoId,
        title: result.videoDetails.title,
        transcript: fullTranscript,
        segments: result.segments.map((s) => ({ ...s, text: decodeEntities(s.text) })),
        thumbnailUrl,
        url: `https://youtube.com/watch?v=${videoId}`,
        proxyUsed: !!proxyUrl,
      });
    } catch (error) {
      console.error(`[transcript] ${strategyLabel} failed:`, error);
      lastError = error;
    }
  }

  return NextResponse.json(
    { error: lastError instanceof Error ? lastError.message : 'Failed to fetch transcript after all attempts' },
    { status: 500 }
  );
}
