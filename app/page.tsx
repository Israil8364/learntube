'use client';

import { useState, useEffect } from 'react';
import { Hero } from '@/components/landing/hero';
import { InputTabs } from '@/components/landing/input-tabs';
import { FeatureCards } from '@/components/landing/feature-cards';
import { PastAnalyses } from '@/components/landing/past-analyses';
import { getStoredVideos, saveVideo, generateVideoId } from '@/lib/storage';
import { Video } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { AnalysisLoadingModal } from '@/components/dashboard/analysis-loading-modal';

export default function LandingPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const storedVideos = getStoredVideos();
    setVideos(storedVideos);
  }, []);

  const handleAnalyze = async (url: string | null, transcript: string | null) => {
    if (!url && !transcript) return;

    setIsLoading(true);
    setLoadingStep(0); // Booting crawler
    
    try {
      // Small artificial delay for "Booting" feel
      await new Promise(resolve => setTimeout(resolve, 800));
      setLoadingStep(1); // Processing result
      
      let finalTranscript = transcript;
      let finalTitle = url ? 'Video Analysis' : 'Transcript Analysis';
      let finalThumbnail = undefined;
      let finalSegments: any[] = [];

      // 1. If URL is provided, fetch transcript via our backend
      if (url && !transcript) {
        const transcriptRes = await fetch(`/api/transcript?url=${encodeURIComponent(url)}`);
        
        if (!transcriptRes.ok) {
          const errData = await transcriptRes.json();
          throw new Error(errData.error || 'Failed to fetch transcript from YouTube.');
        }

        const transcriptData = await transcriptRes.json();
        
        finalTranscript = transcriptData.transcript;
        finalTitle = transcriptData.title || finalTitle;
        finalThumbnail = transcriptData.thumbnailUrl;
        finalSegments = transcriptData.segments || [];
        
        setLoadingStep(2); // Extracting transcripts
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      if (!finalTranscript) {
        throw new Error('No transcript available to analyze.');
      }

      setLoadingStep(3); // Analyzing content with AI

      // 2. Analyze the transcript
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          transcript: finalTranscript,
          title: finalTitle,
          thumbnail: finalThumbnail,
          segments: finalSegments,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to analyze video');
      }

      const data = await response.json();
      const videoId = generateVideoId();

      const newVideo: Video = {
        id: videoId,
        url: url || 'transcript-only',
        title: data.title,
        thumbnail: data.thumbnail,
        transcript: data.transcript,
        segments: data.segments,
        summary: data.summary,
        keyPoints: data.keyPoints,
        topics: data.topics,
        tasks: data.tasks,
        learnings: data.learnings,
        aiConversation: [],
        createdAt: new Date().toISOString(),
      };

      saveVideo(newVideo);
      setVideos([newVideo, ...videos]);

      toast.success('Video analyzed successfully!');
      router.push(`/analysis/${videoId}`);
    } catch (error: any) {
      console.error('Analysis failed:', error);
      toast.error(error.message || 'Failed to analyze video. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <AnalysisLoadingModal isOpen={isLoading} currentStepIndex={loadingStep} />
      <div className="container max-w-7xl mx-auto px-4 py-12">
        <Hero />
        <InputTabs onAnalyze={handleAnalyze} isLoading={isLoading} />
        <FeatureCards />
        <PastAnalyses videos={videos} />
      </div>
    </main>
  );
}
