import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

// Using direct fetch for streaming compatibility in Edge runtime

export const runtime = 'edge';
export const maxDuration = 60;

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).min(1, 'Messages are required'),
  transcript: z.string().optional(),
  segments: z.array(z.any()).optional(),
  videoTitle: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validationResult = chatSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(validationResult.error.errors[0].message, { status: 400 });
    }

    const { messages, transcript, segments, videoTitle } = validationResult.data;

    if (!transcript && !segments) {
      return new Response('Either transcript or segments are required', { status: 400 });
    }

    console.log('Chat API: Received request. Messages:', messages.length);
    
    if (!process.env.NVIDIA_API_KEY) {
      console.error('Chat API: Missing NVIDIA_API_KEY');
      return new Response('API configuration error', { status: 500 });
    }

    let transcriptContext = transcript || '';
    if (segments && Array.isArray(segments) && segments.length > 0) {
      transcriptContext = segments
        .slice(0, 500) // Limit to first 500 segments to keep it fast
        .map((s: any) => {
          const min = Math.floor(s.offset / 60);
          const sec = Math.floor(s.offset % 60);
          return `${min}:${sec.toString().padStart(2, '0')} - ${s.text}`;
        })
        .join('\n');
    }

    // Limit context length for speed (approx 30k chars is plenty for most videos)
    console.log('Chat API: Transcript context length:', transcriptContext.length);

    const systemPrompt = `You are the person speaking in this video${videoTitle ? ` titled "${videoTitle}"` : ''}. 
    
Adopt their exact tone, style, and persona based on the transcript provided below. Speak in the first person ("I", "me", "my") as if you are the creator in this video.

FORMATTING RULES:
1. Use clean, professional formatting with plenty of white space.
2. Use bullet points for key takeaways or lists.
3. Use **Bold Titles** for main points within bullets.
4. Include timestamps in parentheses like (2:15) where relevant, typically right after a bold title.
5. Use double line breaks between any significant points to keep the layout clean.

CRITICAL: Answer based ONLY on the provided transcript. If something isn't covered, stay in character but explain that it wasn't mentioned in this video.

TRANSCRIPT:
${transcriptContext}`;

    // NVIDIA/Mistral requires strict alternating user/assistant roles
    const sanitizedMessages: { role: 'user' | 'assistant'; content: string }[] = [];
    let lastRole: string | null = null;

    for (const msg of messages) {
      // Mistral usually doesn't like 'system' messages in the middle of history
      if (msg.role === 'system') continue; 
      
      const currentRole = msg.role as 'user' | 'assistant';
      
      if (currentRole === lastRole) {
        // If consecutive roles are the same, merge the content
        sanitizedMessages[sanitizedMessages.length - 1].content += "\n\n" + msg.content;
      } else {
        sanitizedMessages.push({ role: currentRole, content: msg.content });
        lastRole = currentRole;
      }
    }

    // Ensure we start and end with a 'user' message for best model performance
    while (sanitizedMessages.length > 0 && sanitizedMessages[0].role !== 'user') {
      sanitizedMessages.shift();
    }
    
    if (sanitizedMessages.length === 0) {
      return new Response('No valid user messages found', { status: 400 });
    }

    console.log(`Chat API: Initiating stream with NVIDIA (Mistral) - Sanitized count: ${sanitizedMessages.length}`);

    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "mistralai/mistral-7b-instruct-v0.2",
        "stream": true,
        "messages": [
          { "role": "system", "content": systemPrompt },
          ...sanitizedMessages
        ],
        "temperature": 0.5,
        "top_p": 1,
        "max_tokens": 2048,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chat API: NVIDIA stream fetch failed:', errorText);
      return new Response(`NVIDIA API Error: ${errorText}`, { status: response.status });
    }

    // Direct stream return
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat API critical error:', error);
    return new Response(`Internal Error: ${error.message}`, { status: 500 });
  }
}
