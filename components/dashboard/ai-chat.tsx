'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Video, ChatMessage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, MessageSquare, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIChatProps {
  video: Video;
  onUpdateChat?: (messages: ChatMessage[]) => void;
}

export function AIChat({ video, onUpdateChat }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(video.aiConversation || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync back to video object when messages change
  useEffect(() => {
    if (messages.length > 0) {
      onUpdateChat?.(messages);
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const starterPrompts = [
    "Summarize the main argument",
    "What are the action items?",
    "What concepts should I research further?",
  ];

  const handleSendMessage = async (e?: React.FormEvent, contentOverride?: string) => {
    e?.preventDefault();
    const chatContent = contentOverride || input;
    if (!chatContent.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: chatContent,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      console.log('Sending message to API...', chatContent);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: video.transcript,
          segments: video.segments,
          videoTitle: video.title,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${errorText}`);
      }
      
      if (!response.body) throw new Error('No readable response stream');

      const assistantId = `msg_${Date.now()}_assistant`;
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let receivedAnything = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim() || line === 'data: [DONE]') continue;
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              const content = data.choices?.[0]?.delta?.content || '';
              if (content) {
                if (!receivedAnything) {
                  receivedAnything = true;
                  setIsLoading(false); // Hide loading indicator as soon as text starts appearing
                }
                fullContent += content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantId ? { ...msg, content: fullContent } : msg
                  )
                );
              }
            } catch (e) {
              // Ignore partial JSON
            }
          }
        }
      }

      if (!receivedAnything) {
        setIsLoading(false);
        console.warn('API returned an empty stream');
        toast.error('AI could not generate a response. Please try again.');
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error('Chat critical error:', error);
      toast.error(`Chat error: ${error.message}`);
    }
  };

  const handlePromptClick = (prompt: string) => {
    handleSendMessage(undefined, prompt);
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('Message copied to clipboard');
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-muted/20 border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-card flex-shrink-0">
        <h3 className="font-semibold text-sm">AI Learning Assistant</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center px-4">
                Ask questions about the video content to deepen your understanding.
              </p>
              <div className="grid grid-cols-1 gap-2 w-full max-w-xs pt-4">
                {starterPrompts.map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    className="text-xs text-left h-auto py-2.5 px-3 flex justify-start normal-case font-normal hover:bg-primary/5 border-primary/10"
                    onClick={() => handlePromptClick(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col mb-4 ${message.role === 'user' ? 'items-end' : 'items-start'} min-w-0`}
              >
                <div
                  className={`max-w-[92%] px-5 py-3 rounded-2xl text-sm leading-relaxed break-words overflow-hidden relative group/msg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-none shadow-sm'
                      : 'bg-card border border-border/50 text-foreground rounded-tl-none shadow-sm'
                  }`}
                >
                  {message.role === 'assistant' && message.content && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 w-7 h-7 opacity-0 group-hover/msg:opacity-100 transition-opacity"
                      onClick={() => copyMessage(message.id, message.content)}
                    >
                      {copiedId === message.id ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </Button>
                  )}
                  <div className="markdown-content max-w-none break-words overflow-wrap-anywhere">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1.5 px-1 font-medium tracking-wide uppercase">
                  {message.role === 'assistant' ? 'AI Assistant' : 'You'}
                </span>
              </div>
            ))
          )}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start mb-4">
              <div className="bg-card border border-border/50 text-foreground px-5 py-3 rounded-2xl rounded-tl-none shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            </div>
          )}
          <div ref={scrollRef} className="h-1" />
        </div>
      </div>

      <form onSubmit={handleSendMessage} className="p-4 pb-8 sm:pb-6 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="text-sm rounded-xl bg-muted/50 border-primary/20 focus-visible:ring-primary/20"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 rounded-xl"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
