import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeTranscript } from '@/lib/ai-service';

const analyzeSchema = z.object({
  transcript: z.string().min(1, 'Transcript is required'),
  url: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  thumbnail: z.string().nullable().optional(),
  segments: z.array(z.any()).nullable().optional(),
});

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = analyzeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { transcript, title, thumbnail, segments } = result.data;
    const videoTitle = title || 'Video';

    // Analyze using AI Service
    const analysis = await analyzeTranscript(transcript, videoTitle);

    return NextResponse.json({
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
  } catch (error) {
    console.error('Analyze API error:', error);

    if (error instanceof Error) {
      if (error.message.includes('OPENROUTER_API_KEY')) {
        return NextResponse.json(
          { error: 'API configuration error. Please check environment variables.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
