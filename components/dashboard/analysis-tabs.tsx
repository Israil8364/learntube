'use client';

import { Video } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { FileText, Lightbulb, Copy, Check, CheckSquare, GraduationCap, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';

interface AnalysisTabsProps {
  video: Video;
  onUpdateTasks?: (tasks: string[]) => void;
}

// ─── Transcript helpers ────────────────────────────────────────────────────

interface TranscriptParagraph {
  startOffset: number;   // seconds
  text: string;
}

/** Group caption segments into ~15-second readable chunks (matches reference image layout) */
function groupSegmentsIntoParagraphs(segments: NonNullable<Video['segments']>): TranscriptParagraph[] {
  if (!segments || segments.length === 0) return [];

  const CHUNK_DURATION = 15; // seconds per chunk — matches the image style
  const paragraphs: TranscriptParagraph[] = [];
  let groupStart = segments[0].offset;
  let groupTexts: string[] = [];

  segments.forEach((seg, i) => {
    const elapsed = seg.offset - groupStart;
    const isLast = i === segments.length - 1;

    if (elapsed >= CHUNK_DURATION && groupTexts.length > 0) {
      paragraphs.push({ startOffset: groupStart, text: groupTexts.join(' ') });
      groupStart = seg.offset;
      groupTexts = [seg.text];
    } else {
      groupTexts.push(seg.text);
    }

    if (isLast && groupTexts.length > 0) {
      paragraphs.push({ startOffset: groupStart, text: groupTexts.join(' ') });
    }
  });

  return paragraphs;
}

// Always MM:SS format with leading zeros  e.g. 00:00, 00:16, 01:04
function formatTimestamp(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Chunks the transcript into uniform word blocks for cleaner reading */
function chunkTranscript(text: string): string[] {
  if (!text) return [];
  
  // Clean up any timestamp markers that might be in the raw text
  const cleanText = text.replace(/\[?\d{1,2}:\d{2}(?::\d{2})?\]?/g, '').trim();
  const words = cleanText.split(/\s+/).filter(Boolean);
  
  const WORDS_PER_BOX = 50;
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += WORDS_PER_BOX) {
    chunks.push(words.slice(i, i + WORDS_PER_BOX).join(' '));
  }
  
  return chunks;
}

/** If we don't have segments, split a raw transcript string by timestamp markers like [00:00] or 00:00 */
function parseTranscriptString(transcript: string | null): TranscriptParagraph[] {
  if (!transcript) return [];
  
  // Look for patterns like [00:00] or 00:00:00 or 00:00
  const timestampRegex = /(\d{1,2}:\d{2}(?::\d{2})?)/g;
  const parts = transcript.split(timestampRegex);
  const paragraphs: TranscriptParagraph[] = [];
  
  for (let i = 1; i < parts.length; i += 2) {
    const timestampStr = parts[i];
    const rawText = parts[i + 1] || '';
    // Clean up brackets, colon or dashes at start of text
    const text = rawText.trim().replace(/^\]\s*|^\:\s*|^\-\s*/, '').trim();
    
    const timeParts = timestampStr.split(':').map(Number);
    let seconds = 0;
    if (timeParts.length === 3) {
      seconds = (timeParts[0] || 0) * 3600 + (timeParts[1] || 0) * 60 + (timeParts[2] || 0);
    } else if (timeParts.length === 2) {
      seconds = (timeParts[0] || 0) * 60 + (timeParts[1] || 0);
    }
    
    paragraphs.push({ startOffset: seconds, text });
  }
  
  return paragraphs;
}



// ─── Component ──────────────────────────────────────────────────────────────

export function AnalysisTabs({ video, onUpdateTasks }: AnalysisTabsProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [completingTask, setCompletingTask] = useState<string | null>(null);


  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCompleteTask = (task: string) => {
    if (!onUpdateTasks || completingTask) return;
    setCompletingTask(task);
    toast.success('Task marked as complete');
    setTimeout(() => {
      const updatedTasks = (video.tasks || []).filter((t) => t !== task);
      onUpdateTasks(updatedTasks);
      setCompletingTask(null);
    }, 600);
  };

  // Grouped chunks for reading-focused layout (50 words each)
  const transcriptChunks = useMemo(() => {
    return chunkTranscript(video.transcript || '');
  }, [video.transcript]);


  // Word count + reading time
  const wordCount = useMemo(() => {
    const text = video.transcript || '';
    return text.split(/\s+/).filter(Boolean).length;
  }, [video.transcript]);

  const readingMinutes = Math.ceil(wordCount / 200);

  const youtubeUrl = (offset: number) => {
    const videoIdMatch = video.url?.match(/(?:v=|youtu\.be\/)([^&?#]+)/);
    const videoId = videoIdMatch?.[1] ?? '';
    return `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(offset)}s`;
  };

  return (
    <Tabs defaultValue="summary" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="summary">
          <FileText className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Summary</span>
        </TabsTrigger>
        <TabsTrigger value="keypoints">
          <Lightbulb className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Takeaways</span>
        </TabsTrigger>
        <TabsTrigger value="tasks">
          <CheckSquare className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Tasks</span>
        </TabsTrigger>
        <TabsTrigger value="learnings">
          <GraduationCap className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Learnings</span>
        </TabsTrigger>
        <TabsTrigger value="transcript">
          <Clock className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Transcript</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="summary" className="space-y-4">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-4">Summary</h3>
              <p className="text-base leading-relaxed whitespace-pre-wrap">{video.summary}</p>
            </div>
            {video.summary && (
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(video.summary || '', 'Summary')} className="transition-all duration-200">
                {copiedType === 'Summary' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="keypoints" className="space-y-4">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="font-semibold text-lg">Key Takeaways</h3>
            {video.keyPoints && video.keyPoints.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(video.keyPoints?.join('\n') || '', 'Takeaways')} className="transition-all duration-200">
                {copiedType === 'Takeaways' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            )}
          </div>
          {video.keyPoints && video.keyPoints.length > 0 ? (
            <ul className="space-y-3">
              {video.keyPoints.map((point, index) => (
                <li key={index} className="flex gap-3">
                  <span className="text-primary font-semibold flex-shrink-0">•</span>
                  <span className="text-base">{point}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No takeaways available</p>
          )}
          
          <div className="mt-8">
            <h3 className="font-semibold text-lg mb-4">Topics</h3>
            {video.topics && video.topics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {video.topics.map((topic, index) => (
                  <div key={index} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    {topic}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No topics available</p>
            )}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="tasks" className="space-y-4">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="font-semibold text-lg">Tasks & Action Items</h3>
            {video.tasks && video.tasks.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(video.tasks?.join('\n') || '', 'Tasks')} className="transition-all duration-200">
                {copiedType === 'Tasks' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            )}
          </div>
          {video.tasks && video.tasks.length > 0 ? (
            <ul className="space-y-4">
              {video.tasks.map((task, index) => (
                <li key={index} className="flex items-start gap-3 group/task">
                  <button
                    onClick={() => handleCompleteTask(task)}
                    className={`mt-1 w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
                      completingTask === task
                        ? 'bg-green-500 border-green-500'
                        : 'border-primary group-hover/task:border-green-500 group-hover/task:bg-green-50'
                    }`}
                  >
                    {completingTask === task ? (
                      <Check className="w-3.5 h-3.5 text-white animate-in zoom-in duration-300" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-sm bg-transparent group-hover/task:bg-green-100 transition-colors" />
                    )}
                  </button>
                  <span className={`text-base transition-all duration-500 ${
                    completingTask === task ? 'text-muted-foreground line-through opacity-50 translate-x-2' : ''
                  }`}>
                    {task}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="font-semibold">All caught up!</p>
                <p className="text-sm text-muted-foreground">No pending tasks for this video.</p>
              </div>
            </div>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="learnings" className="space-y-4">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="font-semibold text-lg">Concepts & Learnings</h3>
            {video.learnings && video.learnings.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(video.learnings?.map(l => `${l.term}: ${l.explanation}`).join('\n\n') || '', 'Learnings')} className="transition-all duration-200">
                {copiedType === 'Learnings' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            )}
          </div>
          {video.learnings && video.learnings.length > 0 ? (
            <div className="space-y-6">
              {video.learnings.map((item, index) => (
                <div key={index} className="border-l-2 border-primary/20 pl-4 py-1">
                  <h4 className="font-bold text-base mb-1">{item.term}</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.explanation}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No specific learnings identified</p>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="transcript" className="space-y-4">
        <Card className="p-6">

          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="font-semibold text-lg">Full Transcript</h3>
              {wordCount > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {wordCount.toLocaleString()} words · ~{readingMinutes} min read
                </p>
              )}
            </div>
            {video.transcript && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(video.transcript || '', 'Transcript')}
                className="flex items-center gap-2 self-start sm:self-auto"
              >
                {copiedType === 'Transcript'
                  ? <><Check className="w-4 h-4 text-green-500" /> Copied</>
                  : <><Copy className="w-4 h-4" /> Copy all</>}
              </Button>
            )}
          </div>



          {/* ── Word-limited transcript boxes ── */}
          {transcriptChunks.length > 0 ? (
            <div className="flex flex-col gap-3">
              {transcriptChunks.map((chunk, index) => (
                <div 
                  key={index} 
                  className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {chunk}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p>No transcript available</p>
            </div>
          )}

        </Card>
      </TabsContent>
    </Tabs>
  );
}
