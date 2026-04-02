import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript-plus';
import { fetch as undiciFetch, ProxyAgent } from 'undici';
import fs from 'fs';
import path from 'path';

// Proxy cache
let proxyCache: string[] = [];
let proxyTokenLastFetched = 0;

async function getProxies() {
  const apiKey = process.env.WEBSHARE_API_KEY;
  let allProxies: string[] = [];

  // 1. Try local file "Webshare 10 proxies.txt" if it exists as a static fallback
  try {
    const localFilePath = path.join(process.cwd(), 'Webshare 10 proxies.txt');
    if (fs.existsSync(localFilePath)) {
      const content = fs.readFileSync(localFilePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim().includes(':'));
      const localProxies = lines.map(line => {
        const [ip, port, user, pass] = line.trim().split(':');
        return `http://${user}:${pass}@${ip}:${port}`;
      });
      allProxies = [...allProxies, ...localProxies];
    }
  } catch (err) {
    console.error('Error reading local proxies:', err);
  }

  // 2. Fetch from API (Cached)
  if (apiKey) {
    if (proxyCache.length === 0 || Date.now() - proxyTokenLastFetched > 5 * 60 * 1000) {
      try {
        const res = await fetch('https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page=1&page_size=25', {
          headers: { Authorization: `Token ${apiKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          const apiProxies = data.results.map(
            (p: any) => `http://${p.username}:${p.password}@${p.proxy_address}:${p.port}`
          );
          proxyCache = apiProxies;
          proxyTokenLastFetched = Date.now();
        }
      } catch (err) {
        console.error('Error fetching proxies from API:', err);
      }
    }
    allProxies = [...allProxies, ...proxyCache];
  }

  // deduplicate
  return [...new Set(allProxies)];
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

  // Common User Agents for rotation
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
  ];

  const proxies = await getProxies();
  const shuffledProxies = [...proxies].sort(() => 0.5 - Math.random());

  // Try ALL available proxies if needed
  const attempts: (string | null)[] = [null, ...shuffledProxies];
  let lastError: any = null;
  let success = false;
  let finalResult: any = null;
  let proxyUsed = false;

  for (let i = 0; i < attempts.length; i++) {
    const proxyUrl = attempts[i];
    const strategyLabel = proxyUrl ? `proxy attempt ${i}` : 'direct (no proxy)';
    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

    const customFetch = async (params: {
      url: string;
      method?: string;
      headers?: any;
      body?: any;
    }): Promise<any> => {
      const headers = {
        ...params.headers,
        'User-Agent': userAgent,
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
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
          // @ts-ignore
          next: { revalidate: 0 }
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
      success = true;
      proxyUsed = !!proxyUrl;
      finalResult = {
        videoId,
        title: result.videoDetails.title,
        transcript: fullTranscript,
        segments: result.segments.map((s) => ({ ...s, text: decodeEntities(s.text) })),
        thumbnailUrl,
        url: `https://youtube.com/watch?v=${videoId}`,
        proxyUsed: proxyUsed,
      };
      break;
    } catch (error: any) {
      console.error(`[transcript] ${strategyLabel} failed:`, error.message || error);
      lastError = error;
      
      // If we get a valid error like "No transcripts are available", we can stop early
      // as it means the IP is NOT flagged, but the video is problematic.
      if (error?.message?.includes('No transcripts are available')) {
        console.warn(`[transcript] Video ${videoId} confirmed to have no transcripts via ${strategyLabel}. Stopping...`);
        lastError = new Error(`The video ${videoId} does not have any captions or transcripts available. Try a different video or paste a transcript manually.`);
        break;
      }

      // If we got a 429 "Too Many Requests", we should definitely continue to the next attempt
      if (error?.message?.includes('429') || error?.message?.includes('Too many requests')) {
        console.warn(`[transcript] Strategy ${strategyLabel} rate limited. Moving to next...`);
      }
    }
  }

  if (success && finalResult) {
    return NextResponse.json(finalResult);
  }

  // If we reach here, all attempts failed.
  const isRateLimited = lastError?.message?.includes('429') || lastError?.message?.includes('Too many requests');
  const errorMessage = isRateLimited 
    ? "YouTube is temporarily rate-limiting requests. We've tried multiple routing paths but still couldn't bypass it. Please try again in a few minutes or with a different video transcript."
    : (lastError instanceof Error ? lastError.message : 'Failed to fetch transcript after all attempts');

  return NextResponse.json(
    { error: errorMessage },
    { status: isRateLimited ? 429 : 500 }
  );
}
