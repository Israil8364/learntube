import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'HTTP-Referer': 'https://learntube-v3.vercel.app', // Your app URL
    'X-Title': 'LearnTube V3', // Your app name
  },
});

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
    
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('Chat API: Missing OPENROUTER_API_KEY');
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

    const systemPrompt = `You are a professional Video Learning Assistant. Use the provided transcript context to answer questions about the video${videoTitle ? ` titled "${videoTitle}"` : ''}.
    
CRITICAL: You must answer based ONLY on the provided transcript. If the information is not in the transcript, state that you don't have that information. Keep answers clear and helpful.

TRANSCRIPT:
${transcriptContext}`;

    console.log('Chat API: Initiating direct fetch to OpenRouter');

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://learntube-v3.vercel.app",
        "X-Title": "LearnTube V3",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "qwen/qwen3-next-80b-a3b-instruct:free",
        "stream": true,
        "messages": [
          { "role": "system", "content": systemPrompt },
          ...messages
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chat API: OpenRouter direct fetch failed:', errorText);
      return new Response(`OpenRouter Error: ${errorText}`, { status: response.status });
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
