'use client';

import Skeleton from 'react-loading-skeleton';
import { Card } from '@/components/ui/card';

export function HistoryCardSkeleton() {
  return (
    <div className="w-full sm:w-[calc(50%-16px)] md:w-[calc(33.33%-22px)] max-w-[340px]">
      <Card className="overflow-hidden bg-card/10 border-white/10 backdrop-blur-sm">
        <div className="p-4">
          {/* Thumbnail */}
          <div className="relative aspect-video overflow-hidden rounded-xl">
            <Skeleton height="100%" style={{ position: 'absolute', inset: 0 }} borderRadius={12} />
          </div>
        </div>
        <div className="p-6 pt-2">
          {/* Title */}
          <Skeleton width="85%" height={18} borderRadius={4} />
          <Skeleton width="55%" height={14} style={{ marginTop: 8 }} borderRadius={4} />
          {/* Date chip */}
          <Skeleton width="40%" height={11} style={{ marginTop: 12 }} borderRadius={4} />
        </div>
      </Card>
    </div>
  );
}
