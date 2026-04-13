'use client';

import { Card } from '@/components/ui/card';
import { Video } from '@/lib/types';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { PlayCircle } from 'lucide-react';
import { HistoryCardSkeleton } from '@/components/skeletons/history-card-skeleton';

interface PastAnalysesProps {
  videos: Video[];
  isLoading?: boolean;
}

export function PastAnalyses({ videos, isLoading }: PastAnalysesProps) {
  // Show skeleton section during initial load — never a blank hole
  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto mt-16 px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between mb-10 gap-4">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Past Analyses</h2>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          {Array(3).fill(null).map((_, i) => <HistoryCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  const recentVideos = videos.slice(0, 3);

  return (
    <div className="w-full max-w-6xl mx-auto mt-16 px-6 sm:px-8 lg:px-12">
      <div className="flex items-center justify-between mb-10 gap-4">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Past Analyses</h2>
        {videos.length > 0 && (
          <Link
            href="/dashboard"
            className="text-primary hover:text-white bg-primary/10 hover:bg-primary px-5 py-2 md:px-7 md:py-3 rounded-full text-xs md:text-sm font-bold transition-all border border-primary/20 shadow-sm shrink-0"
          >
            View All
          </Link>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-8">
        {recentVideos.map((video) => (
          <Link key={video.id} href={`/analysis/${video.id}`} className="w-full sm:w-[calc(50%-16px)] md:w-[calc(33.33%-22px)] max-w-[340px]">
            <Card className="overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-3 hover:shadow-2xl hover:shadow-primary/20 bg-card/10 border-white/10 hover:border-primary/40 backdrop-blur-sm">
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
                <h3 className="font-bold text-lg leading-snug group-hover:text-primary transition-colors">
                  {video.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-3 font-semibold tracking-wide opacity-70">
                  {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true }).toUpperCase()}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

