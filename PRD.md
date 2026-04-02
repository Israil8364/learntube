# YT Insights — Product Requirements Document

**Version:** 1.0 | **Status:** Draft | **Date:** April 2026  
**Tech Stack:** Next.js · Google Gemini · TypeScript  
**Design:** Minimal — Notion / Linear inspired

---

## 1. Product Overview

**YT Insights** is a lightweight web application that turns long YouTube videos into structured, actionable knowledge. A user pastes a video URL, and the app uses Google Gemini to extract key takeaways, tasks, learnings, topics, and a full transcript. A persistent chat interface lets users interrogate the video content with natural language — effectively a conversation partner that has already watched the entire video on their behalf.

### Core Value Proposition

- **No more scrubbing** — surface insights from a 2-hour video in under 60 seconds.
- **Retain and recall** — a searchable history of every video ever analyzed.
- **Go deeper** — ask follow-up questions without re-watching.
- **Stay focused** — a distraction-free, minimal UI that respects the user's attention.

---

## 2. Goals & Success Metrics

### Business Goals

- Deliver a working MVP within a single sprint.
- Establish a reusable AI pipeline (transcription → structured extraction → chat) extensible to other media types.
- Achieve NPS ≥ 50 within 90 days of launch.

### Success Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| Analysis latency | Time from URL submit to dashboard render | < 30 s |
| Extraction quality | User thumbs-up rate on takeaways | ≥ 80% |
| Chat accuracy | Answers citing correct video content | ≥ 85% |
| Return rate | Users who analyze ≥ 2 videos in 7 days | ≥ 40% |
| Error rate | Failed analyses / total attempts | < 5% |

---

## 3. User Personas

### 3.1 The Lifelong Learner — Ananya

**Profile:** 29-year-old product manager who subscribes to 30+ educational channels. She wants to watch everything but barely has time.

**Pain Points:**
- Videos are long and she can't tell if they're worth her time upfront.
- She forgets key points without notes, but note-taking is slow.
- She rewatches segments to find specific info, losing 10–20 min per video.

### 3.2 The Researcher — Rahul

**Profile:** 35-year-old content strategist who uses YouTube as a primary research tool — interviews, conference talks, deep-dives — then writes synthesis reports.

**Pain Points:**
- Finding specific quotes or claims in a 90-minute video is tedious.
- He needs a searchable history.
- Manual note-taking disrupts his flow.

---

## 4. Functional Requirements

### 4.1 Screen 1 — Landing Page

The landing page is the entry point. Its sole purpose is to accept a YouTube URL and trigger analysis. It must load instantly and contain no distractions.

#### 4.1.1 URL Input Field (LND-01)

| Property | Spec |
|----------|------|
| Component | Single-line text input |
| Placeholder | "Paste a YouTube URL..." |
| Validation | Must match `youtube.com/watch?v=...` or `youtu.be/...` patterns |
| Error state | Inline error below the field: "Please enter a valid YouTube URL." Red underline, no toast |
| Auto-focus | Input is focused on page load so power users can paste immediately |
| Paste support | Accepts Ctrl/Cmd+V and mobile long-press paste |

#### 4.1.2 Analyze Button (LND-02)

| Property | Spec |
|----------|------|
| Label | "Analyze" |
| Trigger | Click or Enter key while input is focused |
| Loading state | Button shows "Analyzing..." with a minimal spinner; input disabled |
| On success | Navigate to Screen 2 (Analysis Dashboard) |
| On error | Button resets; error message shown inline above the input |

#### 4.1.3 Recent Analyses Preview (v1.1)

If the user has prior analyses, show the last 3 as clickable cards below the input — video thumbnail, title, and date analyzed.

### 4.2 Screen 2 — Analysis Dashboard

The dashboard uses a three-column layout. All three panels are present on page load. The left panel can be collapsed to give more space to the center and right.

#### 4.2.1 Left Panel — Video History (DASH-LEFT-01)

| Property | Spec |
|----------|------|
| Width | 240 px, collapsible to 48 px icon rail |
| Content | Chronological list of previously analyzed videos |
| List item | Thumbnail (48×27 px) + title (truncated to 2 lines) + relative date |
| Active state | Left border highlight + subtle background tint on current video |
| Delete | Hover shows a trash icon; confirmation tooltip before deletion |
| Search | Search bar at top of panel to filter by title keyword |
| Empty state | "No analyses yet." with an arrow pointing right |

#### 4.2.2 Middle Panel — Insights

The primary content area. Organized into tabs to navigate between insight types:

| Tab | Content | Format |
|-----|---------|--------|
| Key Takeaways | 3–7 high-signal insights | Numbered list, bold lead sentence per item |
| Tasks / Action Items | Concrete to-dos the video suggests | Checkable list (display only in v1) |
| Learnings | Concepts, frameworks, mental models introduced | Term in bold, explanation below |
| Topics | Subject-matter tags | Pill tags in a wrapping grid |
| Transcript | Full verbatim transcript | Scrollable, timestamp markers every ~60 s |

**Panel Header:** Video title (h1), channel name, duration chip, analyzed-date chip, and a thumbnail linking to the original video (opens in new tab).

#### 4.2.3 Right Panel — Chat Interface (DASH-RIGHT-01)

| Property | Spec |
|----------|------|
| Width | 320 px fixed, collapsible |
| Context scope | Scoped to the current video only; switching videos resets the thread |
| Message input | Multi-line textarea at bottom; Enter to submit, Shift+Enter for newline |
| Streaming | Responses streamed token-by-token for perceived speed |
| Citations | Responses reference timestamps where relevant (e.g., "At 12:34, the speaker mentions...") |
| Starter prompts | 3 pre-filled suggestions shown before first message |
| History | Session-only in v1; not stored server-side |

**Suggested Starter Prompts:**
- "Summarize the main argument"
- "What are the action items?"
- "What concepts should I research further?"

---

## 5. AI Pipeline — Google Gemini

### 5.1 Transcription

Gemini 1.5 Pro (or Flash for cost optimization) natively accepts YouTube URLs as input. The app passes the URL directly to Gemini's multimodal API — no audio download or re-upload needed.

### 5.2 Structured Extraction

A single system prompt instructs Gemini to return a JSON object with this schema:

```json
{
  "title": "",
  "channel": "",
  "duration_seconds": 0,
  "takeaways": [],
  "tasks": [],
  "learnings": [],
  "topics": [],
  "transcript": [{ "timestamp": "", "text": "" }]
}
```

### 5.3 Chat Prompt Engineering

For each chat message, the full transcript (chunked if needed) is prepended as a system context block. The prompt instructs Gemini to: answer only from the video's content, cite timestamps, and say "The video doesn't cover this" rather than hallucinate.

### 5.4 Latency Targets

- **Extraction (submit → dashboard):** < 30 s for videos up to 60 minutes
- **Chat first token:** < 2 s
- **Chat full response:** < 10 s for typical questions

---

## 6. Non-Functional Requirements

### 6.1 Performance

- LCP on landing page: < 1.2 s on a 4G connection
- Dashboard skeleton render: < 500 ms; content streams in progressively
- No layout shifts during streaming — reserve space before content arrives

### 6.2 Reliability

- Graceful error handling: invalid URLs, private/age-restricted videos, API failures
- Up to 2 automatic retries on Gemini timeout before surfacing an error
- Analyses stored in localStorage so page refresh doesn't lose history

### 6.3 Security

- Gemini API key is server-side only — never exposed to the client
- All AI calls made through Next.js Route Handlers (`app/api/*`)
- No user authentication in v1
- Rate limiting: 10 analyses per IP per hour

### 6.4 Accessibility

- WCAG 2.1 AA: all interactive elements keyboard-navigable, contrast ≥ 4.5:1
- Screen-reader labels on all icon-only buttons
- Chat textarea has visible focus ring and aria-label

---

## 7. Design System

### 7.1 Principles

- **Radical simplicity.** Minimal by default.
- **One thing at a time.** Each screen has one primary action. No competing CTAs.
- **Content first.** UI chrome recedes; extracted content is the hero.
- **Instant feedback.** Every user action produces a visible response within 100 ms.

### 7.2 Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#FFFFFF` | Page background |
| `--color-surface` | `#F9FAFB` | Panel backgrounds |
| `--color-border` | `#E5E7EB` | Dividers, input borders |
| `--color-text-primary` | `#111111` | Body copy, headings |
| `--color-text-secondary` | `#6B7280` | Labels, metadata, placeholders |
| `--color-accent` | `#2563EB` | CTA button, active states, links |
| `--font-sans` | Inter, system-ui | All UI text |
| `--font-mono` | JetBrains Mono | Transcript, code |
| `--radius-sm` | 6 px | Inputs, chips |
| `--radius-md` | 10 px | Cards, panels |

### 7.3 Component Notes

- **Buttons:** No shadows. 1 px border. Hover shifts bg by 5% lightness.
- **Tabs:** Underline indicator only — no pill or box style.
- **Inputs:** 1 px border. 4 px focus ring in accent at 30% opacity.
- **Chat bubbles:** User messages right-aligned with accent tint; AI messages left-aligned with surface bg.
- **Loading states:** CSS skeleton shimmer only — no spinners except on the Analyze button.

---

## 8. Information Architecture

| Route | Description |
|-------|-------------|
| `/` | Landing page — URL input + Analyze button |
| `/analysis/[id]` | Dashboard for a specific analyzed video |
| `/api/analyze` | POST — accepts YouTube URL, returns structured JSON |
| `/api/chat` | POST — accepts videoId + message history, streams response |

---

## 9. Data Model (v1 — localStorage)

All data stored in the browser. No server-side database required in v1.

### Analysis Record Shape

```typescript
{
  id: string;           // UUID
  url: string;
  title: string;
  channel: string;
  duration_seconds: number;
  analyzed_at: string;  // ISO 8601
  takeaways: string[];
  tasks: string[];
  learnings: { term: string; explanation: string }[];
  topics: string[];
  transcript: { timestamp: string; text: string }[];
}
```

Each record stored under `yt_insights_<id>`. An index key `yt_insights_index` holds an ordered array of IDs for the history panel.

---

## 10. Technical Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 14 (App Router) | SSR + API routes in one repo |
| Language | TypeScript | Type-safe API contracts |
| AI Model | Google Gemini 1.5 Pro/Flash | Native YouTube URL support; 1M token context |
| Styling | Tailwind CSS | Rapid iteration; consistent design tokens |
| State | Zustand | Lightweight global state for history + chat |
| Storage (v1) | localStorage | Zero infrastructure; fast to ship |
| Deployment | Vercel | Zero-config Next.js hosting |

---

## 11. Milestones & Phasing

### Phase 1 — MVP (Sprint 1–2)

- Landing page with URL input and Analyze button
- Gemini integration: extraction of all insight types + transcript
- Dashboard with middle panel (tabs) and right panel (chat)
- localStorage persistence and left panel history

### Phase 2 — Polish (Sprint 3)

- Collapsible left and right panels
- Starter chat prompts + timestamp citations in chat responses
- Search/filter in history panel
- Copy-to-clipboard on any insight block
- Mobile-responsive single-column layout

### Phase 3 — Growth (Sprint 4+)

- User auth (NextAuth) + server-side storage (Supabase)
- Shareable public analysis links
- Export to Notion / Markdown
- Batch analysis: paste a playlist URL
- Semantic search across all analyses

---

## 12. Open Questions

- **Gemini Flash vs. Pro?** Flash is faster and cheaper; Pro has higher extraction quality. Recommend an A/B test at launch.
- **Chat history persistence?** Session-only acceptable for MVP or should we persist to localStorage?
- **Long videos?** How do we handle videos exceeding Gemini's context window (~2 hours at 1M tokens)? Chunking strategy needed.
- **Rate limiting UX?** What error message and recovery flow do we show when the 10/hour limit is hit?
- **Monetization model?** Subscription, credit-based, or freemium — needs a decision before Phase 3.

---

## 13. Out of Scope (v1)

- User accounts and server-side persistence
- Non-YouTube sources (Vimeo, Loom, uploaded MP4)
- Native mobile apps (iOS / Android)
- Collaborative sharing or multiplayer chat
- Custom AI personas or user-configurable prompts
- Browser extension or bookmarklet

---

## Key Architectural Insights

1. **Gemini's native YouTube URL ingestion** means no audio downloading pipeline — this dramatically simplifies the architecture and gets you to MVP faster.
2. **The three-panel layout** (history / insights / chat) mirrors how power tools like Linear organize persistent navigation + primary content + contextual actions.
3. **localStorage-first in v1** lets you skip auth entirely and ship in one sprint — Supabase migration in Phase 3 is a well-trodden path.

---

**For questions or clarifications, refer to the product leadership team.**
