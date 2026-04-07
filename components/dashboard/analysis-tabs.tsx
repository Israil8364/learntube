'use client';

import { Video } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { FileText, Lightbulb, Tag, Copy, Check, CheckSquare, GraduationCap, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';

interface AnalysisTabsProps {
  video: Video;
  onUpdateTasks?: (tasks: string[]) => void;
}

export function AnalysisTabs({ video, onUpdateTasks }: AnalysisTabsProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [completingTask, setCompletingTask] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(label);
    toast.success(`${label} copied to clipboard`);
    
    setTimeout(() => {
      setCopiedType(null);
    }, 2000);
  };

  const handleCompleteTask = (task: string) => {
    if (!onUpdateTasks || completingTask) return;
    
    setCompletingTask(task);
    toast.success('Task marked as complete');
    
    setTimeout(() => {
      const updatedTasks = (video.tasks || []).filter((t) => t !== task);
      onUpdateTasks(updatedTasks);
      setCompletingTask(null);
    }, 600); // 0.6s delay for animation
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
                className="transition-all duration-200"
              >
                {copiedType === 'Summary' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(video.keyPoints?.join('\n') || '', 'Takeaways')}
                className="transition-all duration-200"
              >
                {copiedType === 'Takeaways' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
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
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="font-semibold text-lg">Tasks & Action Items</h3>
            {video.tasks && video.tasks.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(video.tasks?.join('\n') || '', 'Tasks')}
                className="transition-all duration-200"
              >
                {copiedType === 'Tasks' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(video.learnings?.map(l => `${l.term}: ${l.explanation}`).join('\n\n') || '', 'Learnings')}
                className="transition-all duration-200"
              >
                {copiedType === 'Learnings' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
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
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="font-semibold text-lg">Full Transcript</h3>
            {video.transcript && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(video.transcript || '', 'Transcript')}
                className="transition-all duration-200"
              >
                {copiedType === 'Transcript' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
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
