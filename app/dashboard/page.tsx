'use client';

import { useState, useEffect } from 'react';
import { getStoredVideos, deleteVideo } from '@/lib/storage';
import { Video } from '@/lib/types';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { PlayCircle, Search, ArrowLeft, LayoutGrid, List, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DashboardPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const response = await fetch('/api/analyses');
        if (response.ok) {
          const data = await response.json();
          setVideos(data);
        } else {
          // Fallback to local storage if API fails or for offline support
          const storedVideos = getStoredVideos();
          setVideos(storedVideos.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ));
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
        const storedVideos = getStoredVideos();
        setVideos(storedVideos);
      } finally {
        setIsLoading(false);
      }
    }
    fetchVideos();
  }, []);

  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this analysis?')) return;
    
    // Optimistic UI update
    setVideos(videos.filter(v => v.id !== id));
    deleteVideo(id); // Ensure local storage reflects this immediately
    
    try {
      await fetch(`/api/analyses/${id}`, { method: 'DELETE' });
    } catch (error) {
       console.error('Failed to delete from server:', error);
    }
    
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-10">
      <div className="container max-w-7xl mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-3 text-sm font-semibold text-muted-foreground hover:text-white transition-all group mb-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/5 hover:border-primary/40"
            >
              <img src="/learntube_logo.png" alt="LearnTube" className="w-6 h-6 object-contain group-hover:scale-110 transition-transform" />
              Back to Home
            </Link>
            <h1 className="text-4xl font-extrabold tracking-tight text-white lg:text-5xl">
              Video Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage and revisit your transcript insights from {videos.length} videos.
            </p>
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search your library..."
              className="pl-10 h-12 bg-white/5 border-white/10 rounded-xl focus:ring-primary/20 transition-all text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content Area */}
        {filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVideos.map((video) => (
              <Link key={video.id} href={`/analysis/${video.id}`} className="block group">
                <Card className="relative h-full overflow-hidden bg-white/5 border-white/5 hover:bg-white/[0.08] hover:border-primary/20 transition-all duration-300 transform group-hover:-translate-y-1">
                  
                  {/* Delete Button */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button 
                      onClick={(e) => handleDelete(e, video.id)} 
                      className="p-2 bg-black/60 hover:bg-red-500 rounded-full text-white backdrop-blur-md transition-colors"
                      title="Delete Video"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="relative aspect-video bg-muted/20 overflow-hidden">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-125 scale-[1.12]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                        <PlayCircle className="w-12 h-12 text-primary/40 group-hover:text-primary/60 transition-colors" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button variant="secondary" className="rounded-full font-semibold">
                        View Analysis
                      </Button>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <h3 className="font-bold text-lg leading-snug line-clamp-2 text-white group-hover:text-primary transition-colors">
                      {video.title}
                    </h3>
                    <div className="flex items-center justify-between text-sm text-zinc-400">
                      <span>{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/5 border-2 border-dashed border-white/5 rounded-3xl">
            <div className="max-w-md mx-auto space-y-4">
              <Search className="w-12 h-12 text-muted-foreground mx-auto opacity-20" />
              <h3 className="text-xl font-bold text-white">No videos found</h3>
              <p className="text-muted-foreground">
                We couldn't find any analyses matching "{searchQuery}". Try a different keyword or start a new analysis.
              </p>
              <Button asChild className="mt-4 rounded-xl px-8 h-12">
                <Link href="/">Analyze New Video</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
