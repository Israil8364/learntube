/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Analyze a transcript using AI analysis service (OpenRouter)
 */
export async function analyzeTranscript(
  transcript: string,
  videoTitle?: string
): Promise<{
  summary: string;
  keyPoints: string[];
  topics: string[];
  tasks: string[];
  learnings: { term: string; explanation: string }[];
}> {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const prompt = `You are an expert at analyzing video transcripts and extracting key information.

Analyze the following transcript${videoTitle ? ` from a video titled "${videoTitle}"` : ''} and provide:

1. A concise summary (2-3 sentences)
2. 5-7 key learning points (high-signal insights)
3. 5-7 main topics covered (subject-matter tags)
4. Concrete tasks or action items suggested by the video
5. Key terms or concepts introduced with their explanations

Format your response exactly as JSON with the following structure:
{
  "summary": "...",
  "keyPoints": ["point1", "point2"],
  "topics": ["topic1", "topic2"],
  "tasks": ["task1", "task2"],
  "learnings": [{"term": "...", "explanation": "..."}]
}

TRANSCRIPT:
${transcript}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://learntube-v3.vercel.app",
        "X-Title": "LearnTube V3",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "arcee-ai/trinity-mini:free",
        "messages": [
          {
            "role": "user",
            "content": prompt
          }
        ],
        "response_format": { "type": "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenRouter API error: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    const content = result.choices[0].message.content;

    // Extract JSON if it's wrapped in markdown
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse OpenRouter response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return {
      summary: analysis.summary || '',
      keyPoints: Array.isArray(analysis.keyPoints) ? analysis.keyPoints : [],
      topics: Array.isArray(analysis.topics) ? analysis.topics : [],
      tasks: Array.isArray(analysis.tasks) ? analysis.tasks : [],
      learnings: Array.isArray(analysis.learnings) ? analysis.learnings : [],
    };
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}
