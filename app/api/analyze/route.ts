import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeTranscript } from '@/lib/ai-service';
import { checkRateLimit, incrementUsage } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { generateVideoId } from '@/lib/storage';

const analyzeSchema = z.object({
  transcript: z.string().min(1, 'Transcript is required'),
  url: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  thumbnail: z.string().nullable().optional(),
  segments: z.array(z.any()).nullable().optional(),
});

export const runtime = 'nodejs'; // Using nodejs for more flexibility with cookies and crypto
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // 1. Check Rate Limit
    const rateLimit = await checkRateLimit();
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Usage limit reached (${rateLimit.currentCount}/${rateLimit.limit}). Please sign up to increase your limit.`,
          code: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const result = analyzeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { transcript, title, thumbnail, segments, url } = result.data;
    const videoTitle = title || 'Video Analysis';

    // 2. Validate Transcript Length (approx 20k-25k tokens max)
    const MAX_TRANSCRIPT_LENGTH = 200000;
    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      return NextResponse.json(
        {
          error: 'This video is too long to analyze accurately. Please try a video under 90 minutes.',
          code: 'VIDEO_TOO_LONG'
        },
        { status: 413 }
      );
    }

    // 3. Analyze using AI Service
    const analysis = await analyzeTranscript(transcript, videoTitle);

    // 3. Prepare data for Supabase (Mapping to snake_case)
    const supabase = await createClient();
    const videoId = generateVideoId();

    const analysisData = {
      id: videoId,
      user_id: rateLimit.type === 'auth' ? rateLimit.userId : null,
      device_id: rateLimit.type === 'anon' ? rateLimit.deviceId : null,
      url: url || 'transcript-only',
      title: videoTitle,
      thumbnail: thumbnail || null,
      transcript: transcript,
      segments: segments || [],
      summary: analysis.summary,
      key_points: analysis.keyPoints,
      topics: analysis.topics,
      tasks: analysis.tasks,
      learnings: analysis.learnings,
      created_at: new Date().toISOString()
    };

    const { error: dbError } = await supabase
      .from('analyses')
      .insert(analysisData);

    if (dbError) {
      console.error('Supabase save error:', dbError);
      // We still return the analysis even if DB save fails, but log it
    }

    // 4. Increment usage count
    await incrementUsage({
      userId: rateLimit.type === 'auth' ? rateLimit.userId : undefined,
      deviceId: rateLimit.type === 'anon' ? rateLimit.deviceId : undefined
    });

    // 5. Build response and set cookie if new anonymous user
    const response = NextResponse.json({
      id: videoId,
      title: videoTitle,
      thumbnail: thumbnail || null,
      transcript: transcript,
      segments: segments || null,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      topics: analysis.topics,
      tasks: analysis.tasks,
      learnings: analysis.learnings,
    });

    if (rateLimit.type === 'anon' && rateLimit.deviceId) {
      response.cookies.set('device_id', rateLimit.deviceId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365 // 1 year
      });
    }

    return response;
  } catch (error) {
    console.error('Analyze API error:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
