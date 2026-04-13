'use client';

import Skeleton from 'react-loading-skeleton';

/** Shown in the right chat panel while the analysis is loading */
export function ChatPanelSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex-shrink-0">
        <Skeleton width={140} height={16} borderRadius={4} />
      </div>

      {/* Starter prompts area */}
      <div className="flex-1 flex flex-col gap-3 p-4 justify-center items-center">
        <div className="w-full max-w-xs flex flex-col gap-3 pt-4">
          {Array(3).fill(null).map((_, i) => (
            <Skeleton key={i} width="100%" height={38} borderRadius={8} />
          ))}
        </div>
      </div>

      {/* Input bar */}
      <div className="p-4 pb-8 sm:pb-6 border-t border-border bg-card">
        <Skeleton width="100%" height={42} borderRadius={12} />
      </div>
    </div>
  );
}
