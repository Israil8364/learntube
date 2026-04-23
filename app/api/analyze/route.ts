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

export const runtime = 'edge';

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

    // 6. Use a ReadableStream to keep the connection alive with pulses
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send a space every 5 seconds to keep the connection alive
        const interval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(' '));
          } catch (e) {
            // Stream might be closed
          }
        }, 5000);

        try {
          // 3. Analyze using AI Service
          const analysis = await analyzeTranscript(transcript, videoTitle);

          // 3. Prepare data for Supabase
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

          await supabase.from('analyses').insert(analysisData);

          // 4. Increment usage count
          await incrementUsage({
            userId: rateLimit.type === 'auth' ? rateLimit.userId : undefined,
            deviceId: rateLimit.type === 'anon' ? rateLimit.deviceId : undefined
          });

          // Final response data
          const responseData = JSON.stringify({
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

          controller.enqueue(encoder.encode(responseData));
        } catch (err: any) {
          console.error('Stream processing error:', err);
          const errorMsg = JSON.stringify({ error: err.message || 'Internal server error' });
          controller.enqueue(encoder.encode(errorMsg));
        } finally {
          clearInterval(interval);
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Analyze API error:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
