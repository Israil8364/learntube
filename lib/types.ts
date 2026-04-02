// TypeScript types for YT Insights

export interface Video {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  transcript?: string;
  segments?: TranscriptSegment[];
  summary?: string;
  keyPoints?: string[];
  topics?: string[];
  tasks?: string[];
  learnings?: Learning[];
  aiConversation?: ChatMessage[];
  createdAt: string;
}

export interface Learning {
  term: string;
  explanation: string;
}


export interface TranscriptSegment {
  text: string;
  duration: number;
  offset: number;
  lang?: string;
}


export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AnalysisResponse {
  summary: string;
  keyPoints: string[];
  topics: string[];
  transcript: string;
}

export interface AnalyzeRequest {
  url?: string;
  transcript?: string;
}
