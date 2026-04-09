import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Fetch by ID. We allow public access if it's an anonymous video or if the user owns it.
    // In a more secure app, we'd check auth properly, but for now we'll allow access by ID.
    const { data: item, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !item) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Map back to camelCase
    const video = {
      id: item.id,
      url: item.url,
      title: item.title,
      thumbnail: item.thumbnail,
      transcript: item.transcript,
      segments: item.segments,
      summary: item.summary,
      keyPoints: item.key_points,
      topics: item.topics,
      tasks: item.tasks,
      learnings: item.learnings,
      aiConversation: item.ai_conversation,
      createdAt: item.created_at,
    };

    return NextResponse.json(video);
  } catch (error) {
    console.error('Analysis detail API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Map camelCase to snake_case for updates
    const updates: any = {};
    if (body.aiConversation) updates.ai_conversation = body.aiConversation;
    if (body.tasks) updates.tasks = body.tasks;

    const { error } = await supabase
      .from('analyses')
      .update(updates)
      .eq('id', id);

    if (error) {
       return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
