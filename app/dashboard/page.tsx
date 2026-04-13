'use client';

import { useState, useEffect } from 'react';
import { getStoredVideos } from '@/lib/storage';
import { Video } from '@/lib/types';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { PlayCircle, Search, ArrowLeft, LayoutGrid, List } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-background pb-20 pt-10">
      <div className="container max-w-7xl mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-3 text-sm font-semibold text-muted-foreground transition-all group mb-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/5"
            >
              <img src="/learntube_logo.png" alt="LearnTube" className="w-6 h-6 object-contain transition-transform" />
              Back to Home
            </Link>
            <h1 className="text-4xl font-extrabold tracking-tight text-black lg:text-5xl">
              Video Dashboard
            </h1>
            <p className="text-black text-lg opacity-70">
              Manage and revisit your transcript insights from {videos.length} videos.
            </p>
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black opacity-50" />
            <Input
              placeholder="Search your library..."
              className="pl-10 h-12 bg-black/5 border-black/10 rounded-xl focus:ring-primary/20 transition-all text-lg text-black placeholder:text-black/40"
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
                <Card className="relative overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-3 hover:shadow-2xl hover:shadow-primary/20 bg-card/10 border-white/10 hover:border-primary/40 backdrop-blur-sm h-full">

                  <div className="p-4">
                    <div className="relative aspect-video overflow-hidden rounded-xl bg-muted/20 shadow-md">
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover transition-transform duration-500 scale-[1.35] group-hover:scale-[1.5] origin-center"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                          <PlayCircle className="w-12 h-12 text-primary/40" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="font-bold text-lg leading-snug text-black line-clamp-2">
                      {video.title}
                    </h3>
                    <p className="text-xs text-black mt-3 font-semibold tracking-wide opacity-60 uppercase">
                      {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
                    </p>
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
