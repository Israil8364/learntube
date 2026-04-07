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
  // youtube-transcript.io returns an array of video objects.
  // Each video has a `transcripts` array with language tracks.
  // Each track has a `segments`/`transcript` array with { text, start, dur }.

  const videoObj = Array.isArray(data) ? data[0] : data?.[videoId] ?? data;

  if (!videoObj) {
    return NextResponse.json(
      {
        error:
          'No transcript data returned. The video may not have captions available.',
      },
      { status: 404 }
    );
  }

  // The API may return the tracks under `transcripts` or directly as segments
  let rawSegments: any[] = [];

  if (Array.isArray(videoObj.transcripts) && videoObj.transcripts.length > 0) {
    // Prefer English, then any available track
    const sorted = [...videoObj.transcripts].sort((a: any, b: any) => {
      const aCode = (a.language_code || a.languageCode || '').toLowerCase();
      const bCode = (b.language_code || b.languageCode || '').toLowerCase();
      if (aCode.startsWith('en') && !bCode.startsWith('en')) return -1;
      if (!aCode.startsWith('en') && bCode.startsWith('en')) return 1;
      return 0;
    });

    const bestTrack = sorted[0];
    rawSegments =
      bestTrack?.segments ??
      bestTrack?.transcript ??
      bestTrack?.captions ??
      [];
  } else if (Array.isArray(videoObj.segments)) {
    rawSegments = videoObj.segments;
  } else if (Array.isArray(videoObj.transcript)) {
    rawSegments = videoObj.transcript;
  } else if (Array.isArray(videoObj.captions)) {
    rawSegments = videoObj.captions;
  }

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
