'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface InputTabsProps {
  onAnalyze: (url: string | null, transcript: string | null) => Promise<void>;
  isLoading?: boolean;
}

export function InputTabs({ onAnalyze, isLoading = false }: InputTabsProps) {
  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [activeTab, setActiveTab] = useState('url');

  const handleAnalyze = async () => {
    if (activeTab === 'url' && url.trim()) {
      await onAnalyze(url, null);
      setUrl('');
    } else if (activeTab === 'transcript' && transcript.trim()) {
      await onAnalyze(null, transcript);
      setTranscript('');
    }
  };

  const isValidUrl = (url: string) => {
    return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/.test(url);
  };

  const isValidTranscript = (text: string) => {
    return text.trim().length >= 50;
  };

  const isValid =
    activeTab === 'url' ? isValidUrl(url) : isValidTranscript(transcript);

  return (
    <Card className="p-8 mb-8 w-full max-w-2xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="url">YouTube URL</TabsTrigger>
          <TabsTrigger value="transcript">Paste Transcript</TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="space-y-4">
          <Input
            type="url"
            placeholder="https://youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            className={`text-lg py-6 ${url && !isValidUrl(url) ? 'border-red-500' : ''}`}
          />
          {url && !isValidUrl(url) && (
            <p className="text-red-500 text-sm">Please enter a valid YouTube URL.</p>
          )}
        </TabsContent>

        <TabsContent value="transcript" className="space-y-4">
          <Textarea
            placeholder="Paste your video transcript here (min 50 characters)..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            disabled={isLoading}
            className={`min-h-32 text-base ${transcript && !isValidTranscript(transcript) ? 'border-red-500' : ''}`}
          />
          {transcript && !isValidTranscript(transcript) && (
            <p className="text-red-500 text-sm">Transcript must be at least 50 characters long.</p>
          )}
        </TabsContent>

        <Button
          onClick={handleAnalyze}
          disabled={!isValid || isLoading}
          className="w-full py-6 text-lg rounded-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              Analyze
              <span className="ml-2">→</span>
            </>
          )}
        </Button>
      </Tabs>
    </Card>
  );
}
