'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Video } from '@/lib/types';
import { getStoredVideos, getVideo, saveVideo, deleteVideo } from '@/lib/storage';
import { VideoSidebar } from '@/components/dashboard/video-sidebar';
import { AnalysisTabs } from '@/components/dashboard/analysis-tabs';
import { AIChat } from '@/components/dashboard/ai-chat';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Menu, MessageSquare, Calendar, Youtube, Play, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';

export default function AnalysisDashboard() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.videoId as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        
        // Load the list for the sidebar
        const listRes = await fetch('/api/analyses');
        if (listRes.ok) {
          const allVideos = await listRes.json();
          setVideos(allVideos);
        }

        // Load the specific video
        const videoRes = await fetch(`/api/analyses/${videoId}`);
        if (videoRes.ok) {
          const currentVideo = await videoRes.json();
          setVideo(currentVideo);
        } else {
          // Fallback to local
          const localVideo = getVideo(videoId);
          if (localVideo) {
            setVideo(localVideo);
          } else {
            toast.error('Video not found');
            router.push('/');
          }
        }
      } catch (error) {
        console.error('Error loading analysis:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [videoId, router]);

  const handleDeleteVideo = async (id: string) => {
    // Optimistic UI update
    setVideos(prev => prev.filter(v => v.id !== id));
    deleteVideo(id);

    try {
      const res = await fetch(`/api/analyses/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete from server');
      }
      toast.success('Analysis deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to fully delete from server, but removed locally');
    }

    if (id === videoId) {
      router.push('/');
    } else {
      toast.success('Video removed from list');
    }
  };

  const handleDownloadTranscript = () => {
    if (!video?.transcript) return;

    const element = document.createElement('a');
    const file = new Blob([video.transcript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${video.title}_transcript.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Transcript downloaded');
  };

  const handleUpdateChat = async (messages: any[]) => {
    if (video) {
      const updatedVideo = { ...video, aiConversation: messages };
      setVideo(updatedVideo);
      
      // Persist to DB
      try {
        await fetch(`/api/analyses/${videoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aiConversation: messages }),
        });
      } catch (e) {
        console.error('Failed to save chat to DB');
      }
      
      // Still save to local as backup
      saveVideo(updatedVideo);
    }
  };

  const handleUpdateTasks = async (tasks: string[]) => {
    if (video) {
      const updatedVideo = { ...video, tasks };
      setVideo(updatedVideo);
      
      // Persist to DB
      try {
        await fetch(`/api/analyses/${videoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks }),
        });
      } catch (e) {
        console.error('Failed to save tasks to DB');
      }
      
      saveVideo(updatedVideo);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Video not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex h-full w-72 flex-shrink-0 border-r border-border bg-muted/20 overflow-hidden">
        <VideoSidebar
          videos={videos}
          currentVideoId={videoId}
          onDeleteVideo={handleDeleteVideo}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Sticky Global Header */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50 px-4">
          <div className="h-full max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-80 h-full overflow-hidden">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Navigation Menu</SheetTitle>
                    <SheetDescription>
                      Access your listed and analyzed videos.
                    </SheetDescription>
                  </SheetHeader>
                  <VideoSidebar
                    videos={videos}
                    currentVideoId={videoId}
                    onDeleteVideo={handleDeleteVideo}
                  />
                </SheetContent>
              </Sheet>

              <Link href="/" className="flex items-center group">
                <Button variant="ghost" size="sm" className="hidden sm:flex gap-3 px-1 hover:bg-transparent">
                  <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-xl font-league font-extrabold tracking-tight text-foreground">
                    LearnTube
                  </span>
                </Button>
                <Button variant="ghost" size="icon" className="sm:hidden">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTranscript}
                disabled={!video.transcript}
                className="hidden md:flex rounded-full px-4"
              >
                <Download className="w-4 h-4 mr-2" />
                Transcript
              </Button>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="xl:hidden rounded-full bg-primary/5 border-primary/20">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="p-0 w-full sm:max-w-md">
                  <SheetHeader className="sr-only">
                    <SheetTitle>AI Chat Assistant</SheetTitle>
                    <SheetDescription>
                      Ask questions about the current video transcript.
                    </SheetDescription>
                  </SheetHeader>
                  <AIChat video={video} onUpdateChat={handleUpdateChat} />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        {/* Scrollable Content with Side Margins */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-8">
            
            {/* Analysis Header Card - More Compact */}
            <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden p-4 md:p-5">
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 min-w-0 space-y-2">

                  
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground leading-tight line-clamp-2">
                    {video.title}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{format(new Date(video.createdAt), 'MMM d, yyyy')}</span>
                    </div>

                    <a 
                      href={`https://youtube.com/watch?v=${video.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-primary font-bold hover:underline group"
                    >
                      <Youtube className="w-4 h-4" />
                      <span>Open on YouTube</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </a>
                  </div>
                </div>

                <div className="w-full md:w-56 shrink-0">
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-border shadow-md group">
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Play className="w-10 h-10 text-white fill-current" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Content Tabs Section */}
            <section className="bg-card rounded-2xl border border-border shadow-sm p-2 md:p-4">
              <AnalysisTabs video={video} onUpdateTasks={handleUpdateTasks} />
            </section>
          </div>
        </main>
      </div>

      {/* Desktop Persistent Chat */}
      <aside className="hidden xl:flex h-full w-[400px] flex-shrink-0 border-l border-border bg-card">
        <AIChat video={video} onUpdateChat={handleUpdateChat} />
      </aside>
    </div>
  );
}
