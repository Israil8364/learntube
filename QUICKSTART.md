# YT Insights - Quick Start

## Get Running in 2 Minutes

### 1. Add API Key
Create `.env.local`:
```env
GEMINI_API_KEY=your_key_from_aistudio.google.com
```

### 2. Install & Run
```bash
pnpm install
pnpm dev
```

Visit `http://localhost:3000`

## How It Works

1. **Paste a transcript** on the landing page
2. **Click Analyze** - Gemini generates summary, key points, and topics
3. **View the dashboard** - See analysis with AI chat
4. **Ask questions** in the chat panel about the content

## Key Files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Landing page |
| `app/analysis/[videoId]/page.tsx` | Analysis dashboard |
| `app/api/analyze/route.ts` | Analysis API |
| `app/api/chat/route.ts` | Chat API |
| `lib/gemini.ts` | Gemini integration |
| `lib/storage.ts` | localStorage helpers |

## Important Notes

- **Videos are stored in browser localStorage** (clears on cache clear)
- **YouTube transcript auto-fetch not implemented** - users must paste transcripts manually
- **API Key required** - set in environment variables before running

## Deploying to Vercel

```bash
git push
# Connect repo to Vercel, add GEMINI_API_KEY, deploy!
```

See `SETUP.md` for detailed information.
