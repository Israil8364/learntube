'use client';

import { Video } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { FileText, Lightbulb, Tag, Copy, CheckSquare, GraduationCap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AnalysisTabsProps {
  video: Video;
}

export function AnalysisTabs({ video }: AnalysisTabsProps) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(video.summary || '', 'Summary')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="keypoints" className="space-y-4">
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Key Takeaways</h3>
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
                  <div
                    key={index}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                  >
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
          <h3 className="font-semibold text-lg mb-4">Tasks & Action Items</h3>
          {video.tasks && video.tasks.length > 0 ? (
            <ul className="space-y-4">
              {video.tasks.map((task, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-1 w-4 h-4 rounded border border-primary flex-shrink-0" />
                  <span className="text-base">{task}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No specific tasks identified</p>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="learnings" className="space-y-4">
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Concepts & Learnings</h3>
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
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="font-semibold text-lg">Full Transcript</h3>
            {video.transcript && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(video.transcript || '', 'Transcript')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            )}
          </div>
          {video.segments && video.segments.length > 0 ? (
            <div className="space-y-4">
              {video.segments.map((segment, index) => {
                const minutes = Math.floor(segment.offset / 60);
                const seconds = Math.floor(segment.offset % 60);
                const timestamp = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                return (
                  <div key={index} className="flex gap-4 group">
                    <span className="text-xs font-mono text-muted-foreground pt-1 w-10 flex-shrink-0">
                      {timestamp}
                    </span>
                    <p className="text-sm leading-relaxed text-foreground/90 group-hover:text-foreground transition-colors">
                      {segment.text}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : video.transcript ? (
            <p className="text-base leading-relaxed whitespace-pre-wrap">{video.transcript}</p>
          ) : (
            <p className="text-muted-foreground">No transcript available</p>
          )}
        </Card>
      </TabsContent>
    </Tabs>
  );
}
