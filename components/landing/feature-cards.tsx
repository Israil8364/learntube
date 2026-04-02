import { Card } from '@/components/ui/card';
import { FileText, Lightbulb, MessageCircle } from 'lucide-react';

export function FeatureCards() {
  const features = [
    {
      icon: FileText,
      title: 'Transcripts',
      description: 'Get complete video transcripts extracted and organized',
    },
    {
      icon: Lightbulb,
      title: 'Key Insights',
      description: 'AI-powered summaries and actionable takeaways',
    },
    {
      icon: MessageCircle,
      title: 'AI Chat',
      description: 'Ask questions about the video content in real-time',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mx-auto">
      {features.map((feature) => {
        const Icon = feature.icon;
        return (
          <Card key={feature.title} className="p-6 text-center hover:shadow-md transition-shadow">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Icon className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </Card>
        );
      })}
    </div>
  );
}
