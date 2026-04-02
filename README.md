# LearnTube — AI-Powered Video Learning

LearnTube turns long YouTube videos into structured, actionable knowledge. No more scrubbing through hours of footage—get key insights, transcripts, and a resident AI assistant that has watched the video for you.

![LearnTube Preview](public/learntube_logo.svg)

## 🚀 Features

- **Instant Insights**: Surface high-signal takeaways from long videos in seconds.
- **AI-Powered Chat**: Interrogate the video content with a persistent chat interface.
- **Verbatim Transcripts**: Searchable, time-stamped transcripts for deep reference.
- **Knowledge Extraction**: Automatically identifies tasks, learnings, and core topics.
- **Browser History**: Persistent local storage of all your past analyses.

## 🛠️ Technical Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **AI Model**: [Google Gemini 1.5](https://aistudio.google.com/)
- **UI Architecture**: shadcn/ui + Tailwind CSS 4
- **State Management**: Zustand
- **Persistence**: Browser localStorage (v1)

## 🚦 Getting Started

### 1. Prerequisites
- Node.js 18+
- A Google AI Studio API key

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_key_here
```

### 3. Installation & Development
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the result.

## 📦 Deployment

This project is optimized for deployment on the [Vercel Platform](https://vercel.com/new).

### Steps:
1. Push your code to GitHub.
2. Link the repository to Vercel.
3. Add `GEMINI_API_KEY` to your Vercel Project Settings > Environment Variables.
4. Deploy!

## 📄 License
Created for educational and research purposes.
