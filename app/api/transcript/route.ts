import { NextRequest, NextResponse } from 'next/server';

// ─── Helpers ────────────────────────────────────────────────────────────────

const decodeEntities = (str: string): string =>
  str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/** Fetch title + thumbnail via YouTube oEmbed — free, no auth required */
async function fetchVideoMeta(
  videoId: string
): Promise<{ title: string; thumbnailUrl: string }> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { headers: { 'User-Agent': 'LearnTube/1.0' } }
    );
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title ?? 'Video Analysis',
        thumbnailUrl:
          data.thumbnail_url ??
          `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      };
    }
  } catch {
    // silently fall through to defaults
  }
  return {
    title: 'Video Analysis',
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
  };
}

// ─── Route ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  // ── 1. Validate input ──────────────────────────────────────────────────────
  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return NextResponse.json(
      { error: 'Invalid YouTube URL. Please provide a valid YouTube video link.' },
      { status: 400 }
    );
  }

  // ── 2. Check API key ───────────────────────────────────────────────────────
  const apiKey = process.env.YOUTUBE_TRANSCRIPT_API_KEY;
  if (!apiKey) {
    console.error('[transcript] YOUTUBE_TRANSCRIPT_API_KEY is not set');
    return NextResponse.json(
      { error: 'API configuration error. Transcript service is not configured.' },
      { status: 500 }
    );
  }

  // ── 3. Call youtube-transcript.io ─────────────────────────────────────────
  console.log(`[transcript] Fetching transcript for video: ${videoId}`);

  let rawResponse: Response;
  try {
    rawResponse = await fetch('https://www.youtube-transcript.io/api/transcripts', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: [videoId] }),
    });
  } catch (networkErr: any) {
    console.error('[transcript] Network error calling transcript API:', networkErr);
    return NextResponse.json(
      { error: 'Failed to reach the transcript service. Please try again.' },
      { status: 502 }
    );
  }

  // ── 4. Handle non-OK responses ─────────────────────────────────────────────
  if (!rawResponse.ok) {
    const errorBody = await rawResponse.text().catch(() => '');
    console.error(
      `[transcript] API returned ${rawResponse.status}:`,
      errorBody
    );

    if (rawResponse.status === 401 || rawResponse.status === 403) {
      return NextResponse.json(
        { error: 'Transcript API authentication failed. Check your API key.' },
        { status: 500 }
      );
    }

    if (rawResponse.status === 429) {
      return NextResponse.json(
        {
          error:
            'Transcript API rate limit reached. Please try again in a few minutes.',
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: `Transcript service error (${rawResponse.status}). Please try again.` },
      { status: 502 }
    );
  }

  // ── 5. Parse response ──────────────────────────────────────────────────────
  let data: any;
  try {
    data = await rawResponse.json();
  } catch {
    return NextResponse.json(
      { error: 'Received an invalid response from the transcript service.' },
      { status: 502 }
    );
  }

  console.log('[transcript] Raw API response structure:', JSON.stringify(data).slice(0, 300));

  // ── 6. Extract transcript segments ────────────────────────────────────────
  // youtube-transcript.io can return data in multiple shapes:
  //   Shape A — flat segments array:  [{text, start, dur}, ...]
  //   Shape B — video wrapper array:  [{id, transcripts: [{segments:[...]}]}]
  //   Shape C — keyed by videoId:     { "VIDEO_ID": [{text,...}] }

  let rawSegments: any[] = [];

  const isSegment = (item: any): boolean =>
    item && typeof item === 'object' && typeof item.text === 'string';

  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];

    // Priority 1: Shape B (Video wrapper with full tracks)
    if (first.transcripts || first.segments || first.transcript) {
      console.log('[transcript] Detected Wrapper Shape: extracting tracks');
      const transcripts = first.transcripts || [];
      const bestTrack = transcripts.find((t: any) => (t.language_code || t.languageCode || '').startsWith('en')) || transcripts[0];
      rawSegments = bestTrack?.segments || bestTrack?.transcript || bestTrack?.captions || first.segments || first.transcript || [];
      
      // If we still found nothing but the first object looks like a single segment itself, fall back
      if (rawSegments.length === 0 && isSegment(first)) {
        rawSegments = data;
      }
    } 
    // Priority 2: Shape A (Flat array of segments)
    else if (isSegment(first)) {
      console.log('[transcript] Detected Shape A: flat segments array');
      rawSegments = data;
    }
  } 
  else if (data && typeof data === 'object') {
     console.log('[transcript] Object response keys:', Object.keys(data));
     // Shape C: Keyed by videoId or has a data property
     const possibleContent = data[videoId] || data.segments || data.transcript || data.data || Object.values(data)[0];
     if (Array.isArray(possibleContent)) {
       rawSegments = isSegment(possibleContent[0]) ? possibleContent : (possibleContent[0]?.segments || []);
     }
  }

  console.log(`[transcript] Extracted ${rawSegments.length} raw segments`);

  if (!rawSegments || rawSegments.length === 0) {
    return NextResponse.json(
      {
        error:
          'This video does not have any captions or transcripts available. Try a different video or paste the transcript manually.',
      },
      { status: 404 }
    );
  }

  // ── 7. Map to our internal segment format ─────────────────────────────────
  // API fields: { text, start, dur } → our format: { text, offset, duration }
  const segments = rawSegments.map((s: any) => ({
    text: decodeEntities(String(s.text ?? '')),
    offset: Number(s.start ?? s.offset ?? s.startTime ?? 0),
    duration: Number(s.dur ?? s.duration ?? s.durationTime ?? 0),
    lang: s.lang ?? undefined,
  }));

  const fullTranscript = segments.map((s) => s.text).join(' ');

  if (!fullTranscript.trim()) {
    return NextResponse.json(
      { error: 'Transcript is empty. The video may not have readable captions.' },
      { status: 404 }
    );
  }

  // ── 8. Fetch video metadata (title + thumbnail) ────────────────────────────
  // youtube-transcript.io doesn't return title/thumbnail, so we use oEmbed.
  const { title, thumbnailUrl } = await fetchVideoMeta(videoId);

  // ── 9. Return mapped response ──────────────────────────────────────────────
  console.log(`[transcript] SUCCESS — "${title}" (${segments.length} segments)`);

  return NextResponse.json({
    videoId,
    title,
    transcript: fullTranscript,
    segments,
    thumbnailUrl,
    url: `https://www.youtube.com/watch?v=${videoId}`,
  });
}
