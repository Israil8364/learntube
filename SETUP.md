# YT Insights - Setup & Deployment Guide

## Overview

YT Insights is a modern web application that helps users learn efficiently from YouTube videos by extracting transcripts, summaries, and actionable insights using AI.

## Prerequisites

- Node.js 18+ and pnpm
- Google Gemini API key (free tier available at [Google AI Studio](https://aistudio.google.com))

## Installation & Local Development

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_google_gemini_api_key_here
```

Get your API key from [Google AI Studio](https://aistudio.google.com/apikey).

### 3. Run Development Server
```bash
pnpm dev
```

The app will be available at `http://localhost:3000`.

## Project Structure

```
app/
├── page.tsx                 # Landing page with hero and input tabs
├── layout.tsx              # Root layout with metadata
├── analysis/[videoId]/     # Dynamic analysis dashboard
│   └── page.tsx
└── api/
    ├── analyze/route.ts    # Video analysis endpoint
    └── chat/route.ts       # AI chat endpoint

components/
├── landing/
│   ├── hero.tsx           # Hero section with title and description
│   ├── input-tabs.tsx     # YouTube URL / Transcript paste tabs
│   ├── feature-cards.tsx  # Feature highlights
│   └── past-analyses.tsx  # Recent videos list
├── dashboard/
│   ├── video-sidebar.tsx  # Video history and selection
│   ├── analysis-tabs.tsx  # Summary, Key Points, Topics, Transcript
│   └── ai-chat.tsx        # AI assistant chat interface
└── ui/
    └── [shadcn components]

lib/
├── storage.ts             # localStorage utilities for persisting videos
├── types.ts               # TypeScript types and interfaces
├── gemini.ts              # Gemini API integration
└── utils.ts               # Utility functions (cn for classNames)
```

## Key Features

### 1. Landing Page
- Hero section with value proposition
- Two input methods: YouTube URL or paste transcript
- Feature cards highlighting key capabilities
- Past analyses grid showing recent videos with timestamps

### 2. Analysis Dashboard
- **Left Panel**: Video sidebar showing analysis history
- **Center Panel**: Tabs for Summary, Key Points, Topics, and Transcript
- **Right Panel**: AI Assistant for asking questions about the content

### 3. AI Capabilities
- **Transcript Analysis**: Generates summaries and extracts key learning points
- **Topic Extraction**: Identifies main topics covered in the video
- **Chat Interface**: Ask follow-up questions about the video content

## Data Persistence

The app uses browser `localStorage` to persist video analyses. Each video includes:
- URL and thumbnail
- Generated transcript
- Summary and key points
- Topics extracted
- Chat conversation history
- Creation timestamp

**Note**: Data is stored locally in the browser and will be cleared if the user clears their browser cache.

## API Endpoints

### POST /api/analyze
Analyzes a video transcript using the Gemini API.

**Request:**
```json
{
  "url": "https://youtube.com/watch?v=...",
  "transcript": "Optional transcript text..."
}
```

**Response:**
```json
{
  "title": "Video Title",
  "thumbnail": "https://img.youtube.com/vi/...",
  "transcript": "Full transcript text",
  "summary": "2-3 sentence summary",
  "keyPoints": ["point1", "point2", ...],
  "topics": ["topic1", "topic2", ...]
}
```

### POST /api/chat
Chat with AI about a video's content.

**Request:**
```json
{
  "videoId": "unique_video_id",
  "transcript": "Video transcript",
  "messages": [
    { "role": "user", "content": "What was the main topic?" },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response:**
```json
{
  "response": "AI's answer about the video content"
}
```

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add `GEMINI_API_KEY` as an environment variable in Vercel project settings
4. Deploy!

**Environment Variables to Set:**
- `GEMINI_API_KEY`: Your Google Gemini API key

### Deploy to Other Platforms

The app is built with Next.js 16 and can be deployed to any platform that supports Node.js:

```bash
pnpm build
pnpm start
```

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **UI Components**: shadcn/ui built on Radix UI
- **Styling**: Tailwind CSS 4
- **Forms**: React Hook Form + Zod
- **AI**: Google Gemini API
- **Notifications**: Sonner
- **Icons**: Lucide React
- **Type Safety**: TypeScript

## Troubleshooting

### "GEMINI_API_KEY is not set"
- Ensure your `.env.local` file contains the API key
- Restart the development server after adding the variable
- Check that the API key is valid at [Google AI Studio](https://aistudio.google.com)

### "YouTube transcript fetching is not available"
- The app currently requires users to manually paste transcripts for YouTube URLs
- Users can get transcripts from YouTube's built-in captions or third-party services

### Videos not persisting
- Check if browser's localStorage is enabled
- Clear browser cache if experiencing issues
- Check browser DevTools Console tab for errors

## Future Enhancements

- Auto-fetch YouTube transcripts (requires YouTube API authentication)
- Support for multiple languages
- Export summaries as PDF/Markdown
- Share analysis with others via unique links
- Advanced search and filtering of past analyses
- Integration with note-taking apps (Notion, Obsidian)
- Video playback with highlights sync
- Collaborative analysis and notes

## License

This project is created with v0 by Vercel.

## Support

For issues, questions, or feature requests, please refer to the PRD.md file for detailed product specifications.
