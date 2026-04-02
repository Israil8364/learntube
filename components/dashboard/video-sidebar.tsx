'use client';

import { Video } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { PlayCircle, Trash2, Plus, Video as VideoIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface VideoSidebarProps {
  videos: Video[];
  currentVideoId: string;
  onDeleteVideo?: (videoId: string) => void;
}

export function VideoSidebar({ videos, currentVideoId, onDeleteVideo }: VideoSidebarProps) {
  return (
    <div className="flex flex-col h-full bg-muted/30 border-r border-border">
      <div className="p-4 border-b border-border space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <VideoIcon className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm leading-none">Analyzed Videos</h3>
          </div>
          <p className="text-xs text-muted-foreground ml-6 font-medium">{videos.length} videos</p>
        </div>
        <Link href="/">
          <Button className="w-full bg-black hover:bg-black/90 text-white rounded-full h-9 text-xs font-bold gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="w-4 h-4" />
            Analyze New Video
          </Button>
        </Link>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {videos.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <p>No analyzed videos yet</p>
            </div>
          ) : (
            videos.map((video) => (
              <div
                key={video.id}
                className={`group flex flex-col gap-2 p-3 rounded-lg border transition-all ${currentVideoId === video.id
                    ? 'bg-primary/5 border-primary/20 shadow-sm'
                    : 'hover:bg-accent/50 border-transparent'
                  }`}
              >
                <div className="flex gap-2 min-w-0 items-start">
                  <Link href={`/analysis/${video.id}`} className="flex gap-2 min-w-0 flex-1">
                    <div className="relative flex-shrink-0 w-12 h-12 rounded bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover rounded scale-110"
                        />
                      ) : (
                        <PlayCircle className="w-5 h-5 text-primary/40" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium line-clamp-2 leading-tight">{video.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                  {onDeleteVideo && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the analysis for "{video.title}". 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onDeleteVideo(video.id)}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
