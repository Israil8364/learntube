'use client';

import { useState, useEffect } from 'react';
import { Hero } from '@/components/landing/hero';
import { InputTabs } from '@/components/landing/input-tabs';
import { FeatureCards } from '@/components/landing/feature-cards';
import { PastAnalyses } from '@/components/landing/past-analyses';
import { HistoryCardSkeleton } from '@/components/skeletons/history-card-skeleton';
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
  const [isLoadingHistory, setIsLoadingHistory] = useState(true); // Start true to buffer flash
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showLengthModal, setShowLengthModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorContent, setErrorContent] = useState({ title: '', message: '' });
  const router = useRouter();

  useEffect(() => {
    // Check if we have ANY history at all before showing skeletons
    const stored = getStoredVideos();
    if (stored.length === 0) {
      setIsLoadingHistory(false);
      return;
    }

    const loadHistory = async () => {
      try {
        const response = await fetch('/api/analyses');
        if (response.ok) {
          const data = await response.json();
          setVideos(data);
        } else {
          setVideos(stored);
        }
      } catch (e) {
        setVideos(stored);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadHistory();
  }, []);

  const handleAnalyze = async (url: string | null, transcript: string | null) => {
    if (!url && !transcript) return;

    // Fast-fail rate limit check locally before triggering loaders
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    // Calculate how many videos were done in the last 24 hours
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentVideos = videos.filter(v => new Date(v.createdAt).getTime() > twentyFourHoursAgo);

    if (!session && recentVideos.length >= 2) {
      setShowLimitModal(true);
      return;
    }

    if (session && recentVideos.length >= 4) {
      toast.error("You've reached your daily limit of 4 analyses. Come back tomorrow!");
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
        if (response.status === 429 || errData.code === 'RATE_LIMIT_EXCEEDED') {
          throw new Error('RATE_LIMIT');
        }
        if (response.status === 413 || errData.code === 'VIDEO_TOO_LONG') {
          throw new Error('VIDEO_TOO_LONG');
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
      } else if (error.message === 'VIDEO_TOO_LONG' || error.message.includes('context length') || error.message.includes('tokens')) {
        setShowLengthModal(true);
      } else {
        // Handle specific content errors with a modal for better visibility
        if (error.message.includes('captions') || error.message.includes('transcript')) {
          setErrorContent({
            title: 'Transcript Not Found',
            message: 'This video doesn’t have available captions for us to analyze. Try a video with subtitles or paste the transcript manually!'
          });
        } else if (error.message.includes('Invalid YouTube URL')) {
          setErrorContent({
            title: 'Invalid URL',
            message: 'We couldn’t find a valid video at that link. Please check the URL and try again!'
          });
        } else {
          setErrorContent({
            title: 'Video lenght is too long',
            message: error.message || 'We encountered an issue while analyzing your video. Please try a shorter video or try again in a moment.'
          });
        }
        setShowErrorModal(true);
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

      <AlertDialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <AlertDialogContent className="bg-[#121417] border-white/10 text-white sm:max-w-[400px]">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <AlertDialogTitle className="text-xl font-semibold">{errorContent.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 leading-relaxed">
              {errorContent.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction
              onClick={() => setShowErrorModal(false)}
              className="bg-zinc-800 text-white hover:bg-zinc-700 border-none w-full sm:w-auto"
            >
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLengthModal} onOpenChange={setShowLengthModal}>
        <AlertDialogContent className="bg-[#121417] border-white/10 text-white sm:max-w-[440px]">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <AlertDialogTitle className="text-xl font-semibold">Whoa, that’s a marathon!</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 leading-relaxed">
              This video is a bit of a giant! To ensure our AI gives you the most accurate and high-quality insights, we currently support videos with up to ~90 minutes of dialogue.
              <br /><br />
              Try a shorter video or a highlight clip to see the magic happen!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction
              onClick={() => setShowLengthModal(false)}
              className="bg-primary text-white hover:bg-primary/90 border-none w-full sm:w-auto"
            >
              Got it, thanks!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="container max-w-7xl mx-auto px-4 py-8">
        <Hero />
        <InputTabs onAnalyze={handleAnalyze} isLoading={isLoading} />
        <FeatureCards />
        <PastAnalyses videos={videos} isLoading={isLoadingHistory} />
      </div>
    </main>
  );
}
