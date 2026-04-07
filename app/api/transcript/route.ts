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

  // Common User Agents for rotation - consolidate to ONE agent for the entire request across all proxy attempts for consistency.
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
  ];
  const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

  const proxies = await getProxies();
  const shuffledProxies = [...proxies].sort(() => 0.5 - Math.random());

  // Try ALL available proxies if needed
  const attempts: (string | null)[] = [null, ...shuffledProxies];
  let lastError: any = null;
  let success = false;
  let finalResult: any = null;
  let proxyUsed = false;

  console.log(`[transcript] Fetching video ${videoId} with User-Agent selection: ${userAgent.substring(0, 50)}...`);

  for (let i = 0; i < attempts.length; i++) {
    const proxyUrl = attempts[i];
    const strategyLabel = proxyUrl ? `proxy attempt ${i} (${proxyUrl.split('@')[1] || proxyUrl})` : 'direct (no proxy)';

    const customFetch = async (params: {
      url: string;
      method?: string;
      headers?: any;
      body?: any;
    }): Promise<any> => {
      const headers = {
        ...params.headers,
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
      };

      if (proxyUrl) {
        const dispatcher = new ProxyAgent(proxyUrl);
        // @ts-ignore
        return undiciFetch(params.url, {
          method: params.method as any,
          headers,
          body: params.body,
          dispatcher,
          connect: { timeout: 15000 }
        } as any);
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
      console.log(`[transcript] Trying ${strategyLabel} for video ${videoId}...`);
      
      let transcriptData;
      // Configure fetch options based on whether we use a proxy or not
      const fetchOptions: any = {
        videoDetails: true,
      };

      if (proxyUrl) {
        // For proxy attempts, we MUST use our custom undici-based fetch
        fetchOptions.videoFetch = customFetch;
        fetchOptions.transcriptFetch = customFetch;
        fetchOptions.playerFetch = customFetch;
      } else {
        // For DIRECT attempts, use library defaults as they are often more reliable/clean
        // We do NOT override the fetchers here.
      }

      try {
        transcriptData = await YoutubeTranscript.fetchTranscript(videoId, fetchOptions);
      } catch (innerError: any) {
        // Attempt 2: If default fails, check for list of available languages
        console.warn(`[transcript] Default fetch failed for ${videoId} via ${strategyLabel}: ${innerError?.message || 'Unknown error'}`);
        
        if (innerError?.message?.includes('No transcripts') || 
            innerError?.message?.includes('Transcript is disabled') ||
            innerError?.message?.includes('404') ||
            innerError?.message?.includes('removed')) {
          
          console.log(`[transcript] Attempting listLanguages fallback for ${videoId} via ${strategyLabel}...`);
          try {
            const languages = await YoutubeTranscript.listLanguages(videoId, proxyUrl ? {
              videoFetch: customFetch,
              transcriptFetch: customFetch,
              playerFetch: customFetch,
            } : {});

            if (languages && languages.length > 0) {
              const sortedLanguages = [...languages].sort((a: any, b: any) => {
                const aCode = (a.languageCode || a.lang || a.code || '').toLowerCase();
                const bCode = (b.languageCode || b.lang || b.code || '').toLowerCase();
                
                if (aCode.startsWith('en') && !bCode.startsWith('en')) return -1;
                if (!aCode.startsWith('en') && bCode.startsWith('en')) return 1;
                if (!a.isAutoGenerated && b.isAutoGenerated) return -1;
                if (a.isAutoGenerated && !b.isAutoGenerated) return 1;
                return 0;
              });

              let retrySuccess = false;
              for (const track of sortedLanguages) {
                try {
                  const langCode = track.languageCode || (track as any).lang || (track as any).code;
                  const langLabel = (track as any).languageName || (track as any).language || langCode;
                  
                  console.log(`[transcript] Attempting retry with language track: ${langCode} (${langLabel})...`);
                  transcriptData = await YoutubeTranscript.fetchTranscript(videoId, {
                    ...fetchOptions,
                    lang: langCode,
                  });
                  
                  if (transcriptData && transcriptData.segments) {
                    retrySuccess = true;
                    break;
                  }
                } catch (retryError: any) {
                  console.warn(`[transcript] Retry with track ${track.languageCode} failed: ${retryError.message}`);
                }
              }
              
              if (!retrySuccess) throw innerError;
            } else {
              throw innerError;
            }
          } catch (listError: any) {
            throw innerError;
          }
        } else {
          throw innerError;
        }
      }

      if (!transcriptData || !transcriptData.segments) {
        throw new Error('Failed to retrieve valid transcript data or segments are empty');
      }

      const fullTranscript = transcriptData.segments.map((s) => decodeEntities(s.text)).join(' ');

      let thumbnailUrl = '';
      if (transcriptData.videoDetails.thumbnails && transcriptData.videoDetails.thumbnails.length > 0) {
        thumbnailUrl = transcriptData.videoDetails.thumbnails[transcriptData.videoDetails.thumbnails.length - 1].url;
      }

      console.log(`[transcript] SUCCESS via ${strategyLabel} for video: ${transcriptData.videoDetails.title}`);
      success = true;
      proxyUsed = !!proxyUrl;
      finalResult = {
        videoId,
        title: transcriptData.videoDetails.title,
        transcript: fullTranscript,
        segments: transcriptData.segments.map((s) => ({ ...s, text: decodeEntities(s.text) })),
        thumbnailUrl,
        url: `https://youtube.com/watch?v=${videoId}`,
        proxyUsed: proxyUsed,
      };
      break;
    } catch (error: any) {
      console.error(`[transcript] ${strategyLabel} failed finally with error:`, error.message || error);
      lastError = error;
      
      // If we confirm there are REALLY no transcripts after explicitly checking all options on this attempt
      if (error?.message?.includes('No transcripts are available') && i === attempts.length - 1) {
         console.warn(`[transcript] Video ${videoId} confirmed to have no transcripts after all attempts.`);
         lastError = new Error(`The video ${videoId} does not have any captions or transcripts available. Try a different video or paste a transcript manually.`);
      }

      // If we got a 429 "Too Many Requests", we should definitely continue to the next attempt
      if (error?.message?.includes('429') || error?.message?.includes('Too many requests')) {
        console.warn(`[transcript] Strategy ${strategyLabel} was rate limited. Continuing to next attempt...`);
      }
    }
  }

  if (success && finalResult) {
    return NextResponse.json(finalResult);
  }

  // If we reach here, all attempts failed.
  const isRateLimited = lastError?.message?.includes('429') || lastError?.message?.includes('Too many requests');
  const isTranscriptsUnavailable = lastError?.message?.includes('does not have any captions');
  
  let errorMessage = lastError?.message || 'Failed to fetch transcript after all attempts';
  
  if (isRateLimited) {
    errorMessage = "YouTube is temporarily rate-limiting requests. We've tried multiple routing paths but still couldn't bypass it. Please try again in a few minutes or with a different video transcript.";
  } else if (isTranscriptsUnavailable) {
    errorMessage = `The video ${videoId} does not have any captions or transcripts available. Try a different video or paste a transcript manually.`;
  }

  return NextResponse.json(
    { error: errorMessage },
    { status: isRateLimited ? 429 : (isTranscriptsUnavailable ? 404 : 500) }
  );
}
