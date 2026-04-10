import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // If no user, we could potentially check for device_id cookie
    // but usually dashboard is for logged-in users.
    // However, if the user isn't logged in, we can try fetching by device_id.
    
    let query = supabase.from('analyses').select('*');

    if (user) {
      query = query.eq('user_id', user.id);
    } else {
      // Try to get device_id from cookies
      const cookieStore = await cookies();
      const deviceId = cookieStore.get('device_id')?.value;
      
      if (!deviceId) {
        return NextResponse.json([]);
      }
      
      query = query.eq('device_id', deviceId).is('user_id', null);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching analyses:', error);
      return NextResponse.json({ error: 'Failed to fetch analyses' }, { status: 500 });
    }

    // Map back to camelCase for the frontend
    const mappedData = data.map((item: any) => ({
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
    }));

    return NextResponse.json(mappedData);
  } catch (error) {
    console.error('Analyses API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
