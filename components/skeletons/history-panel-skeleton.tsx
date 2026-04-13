'use client';

import Skeleton from 'react-loading-skeleton';

export function HistoryPanelSkeleton() {
  return (
    <div className="flex flex-col gap-1 p-2">
      {Array(6).fill(null).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
          {/* Thumbnail */}
          <Skeleton width={48} height={48} borderRadius={6} />
          <div className="flex-1 min-w-0">
            {/* Title lines */}
            <Skeleton width="75%" height={13} borderRadius={3} />
            <Skeleton width="45%" height={11} style={{ marginTop: 6 }} borderRadius={3} />
          </div>
        </div>
      ))}
    </div>
  );
}
