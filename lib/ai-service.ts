import OpenAI from 'openai';

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
 * Analyze a transcript using NVIDIA AI analysis service
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
  const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY is not set');
  }

  const nvidia = new OpenAI({
    apiKey: NVIDIA_API_KEY,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });

  const prompt = `You are a world-class educational content analyzer. Your goal is to provide a deep, comprehensive analysis of the following video transcript.
    
Analyze the following transcript${videoTitle ? ` from a video titled "${videoTitle}"` : ''} and provide a HIGHLY DETAILED response:

1. A comprehensive summary (4-6 detailed sentences)
2. 7-10 deep learning points (provide significant context for each)
3. 8-12 main topics or subject-matter tags
4. A robust list of concrete tasks or action items suggested by the video
5. Detailed explanations for key terms or concepts introduced

Format your response exactly as JSON with the following structure:
{
  "summary": "...",
  "keyPoints": ["detailed point 1", "detailed point 2"],
  "topics": ["topic1", "topic2"],
  "tasks": ["task1", "task2"],
  "learnings": [{"term": "...", "explanation": "detailed explanation..."}]
}

TRANSCRIPT:
${transcript}`;

  try {
    const completion = await nvidia.chat.completions.create({
      model: "nvidia/llama-3.1-8b-instruct",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
      top_p: 1,
      max_tokens: 3000,
    });

    const content = completion.choices[0].message.content || '';

    // Extract JSON if it's wrapped in markdown
    let jsonContent = content.match(/\{[\s\S]*\}/)?.[0] || '';

    if (!jsonContent) {
      console.error('NVIDIA response content:', content);
      throw new Error('Could not parse NVIDIA response as JSON - No matching object found');
    }

    // Sanitize common LLM JSON errors (trailing commas, etc)
    jsonContent = jsonContent
      .replace(/,\s*([\]\}])/g, '$1') // Remove trailing commas
      .trim();

    try {
      const analysis = JSON.parse(jsonContent);
      return {
        summary: analysis.summary || '',
        keyPoints: Array.isArray(analysis.keyPoints) ? analysis.keyPoints : [],
        topics: Array.isArray(analysis.topics) ? analysis.topics : [],
        tasks: Array.isArray(analysis.tasks) ? analysis.tasks : [],
        learnings: Array.isArray(analysis.learnings) ? analysis.learnings : [],
      };
    } catch (parseError) {
      console.error('JSON Parse Error Detail:', parseError);
      console.error('Failed JSON content:', jsonContent);
      throw new Error(`AI generated invalid JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('NVIDIA Analysis error:', error);
    throw error;
  }
}
