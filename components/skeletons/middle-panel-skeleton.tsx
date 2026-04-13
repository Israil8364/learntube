'use client';

import Skeleton from 'react-loading-skeleton';

/** Mirrors the Analysis Header Card + Tabs layout from the dashboard */
export function MiddlePanelSkeleton() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">

      {/* ── Header Card ─────────────────────────────────────────── */}
      <section className="bg-card rounded-xl border border-border shadow-sm overflow-hidden p-4 md:p-5">
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-1 min-w-0 space-y-3 w-full">
            {/* Video title */}
            <Skeleton width="70%" height={28} borderRadius={6} />
            <div className="flex items-center gap-4 pt-1">
              {/* Date chip */}
              <Skeleton width={100} height={16} borderRadius={4} />
              {/* YouTube link chip */}
              <Skeleton width={120} height={16} borderRadius={4} />
            </div>
          </div>
          {/* Thumbnail */}
          <div className="w-full md:w-56 shrink-0">
            <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
              <Skeleton height="100%" style={{ position: 'absolute', inset: 0 }} borderRadius={8} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Tabs + Content ───────────────────────────────────────── */}
      <section className="bg-card rounded-2xl border border-border shadow-sm p-4 md:p-6">
        {/* Tab bar */}
        <div className="flex gap-3 border-b border-border pb-3 mb-6">
          {[80, 90, 62, 90, 80].map((w, i) => (
            <Skeleton key={i} width={w} height={14} borderRadius={4} />
          ))}
        </div>

        {/* Content rows — mirror Key Takeaways shape */}
        <div className="flex flex-col gap-6 p-2">
          {Array(6).fill(null).map((_, i) => (
            <div key={i}>
              <Skeleton width={`${55 + (i % 3) * 10}%`} height={15} borderRadius={4} />
              <Skeleton count={2} height={13} style={{ marginTop: 8 }} borderRadius={3} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
