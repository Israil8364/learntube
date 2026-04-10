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

import { createClient } from '@/lib/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { AnalysisLoadingModal } from '@/components/dashboard/analysis-loading-modal';
import { Header } from '@/components/layout/header';

export default function LandingPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchVideos() {
      try {
        const response = await fetch('/api/analyses');
        if (response.ok) {
          const data = await response.json();
          setVideos(data);
        } else {
          setVideos(getStoredVideos());
        }
      } catch (error) {
        setVideos(getStoredVideos());
      }
    }
    fetchVideos();
  }, []);

  const handleAnalyze = async (url: string | null, transcript: string | null) => {
    if (!url && !transcript) return;

    // Fast-fail rate limit check locally before triggering loaders
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session && videos.length >= 10) {
      setShowLimitModal(true);
      return;
    }

    if (session && videos.length >= 20) {
      toast.error("You've reached the maximum limit for authenticated users.");
      return;
    }

    setIsLoading(true);
    setLoadingStep(0); // Booting crawler
    
    try {
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
        if (response.status === 429) {
          throw new Error('RATE_LIMIT');
        }
        throw new Error(errData.error || 'Failed to analyze video');
      }

      const data = await response.json();
      const videoId = data.id || generateVideoId();

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

      // Store in local storage for unauthenticated quick-access as requested
      saveVideo(newVideo);
      setVideos([newVideo, ...videos]);

      toast.success('Video analyzed successfully!');
      router.push(`/analysis/${videoId}`);
    } catch (error: any) {
      console.error('Analysis failed:', error);
      if (error.message === 'RATE_LIMIT') {
        setShowLimitModal(true);
      } else {
        toast.error(error.message || 'Failed to analyze video. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background relative pt-4">
      <Header />
      <AnalysisLoadingModal isOpen={isLoading} currentStepIndex={loadingStep} />
      
      <AlertDialog open={showLimitModal} onOpenChange={setShowLimitModal}>
        <AlertDialogContent className="bg-[#121417] border-white/10 text-white sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400">Limit Exceeded</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              You have reached your limit of free analyses! Please sign up or log in to instantly increase your limit and access more insights.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-none hover:bg-white/10 text-white hover:text-white mt-2 sm:mt-0">
              Close
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                setShowLimitModal(false);
                const supabase = createClient();
                await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: `${window.location.origin}/auth/callback` },
                });
              }} 
              className="bg-primary text-white hover:bg-primary/90 border-none"
            >
              Sign Up For Free
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="container max-w-7xl mx-auto px-4 py-8">
        <Hero />
        <InputTabs onAnalyze={handleAnalyze} isLoading={isLoading} />
        <FeatureCards />
        <PastAnalyses videos={videos} />
      </div>
    </main>
  );
}
