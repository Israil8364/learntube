

export function Hero() {
  return (
    <div className="text-center space-y-4 mb-8">
      <div className="flex justify-center mb-4">
        <div className="p-1 bg-white rounded-[2.5rem] ring-1 ring-white/10 shadow-xl shadow-white/5">
          <img src="/learntube_logo.png" alt="LearnTube" className="w-24 h-24 object-contain" />
        </div>
      </div>
      <h1 className="text-5xl md:text-6xl font-bold text-balance">
        Learn Smarter from YouTube
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-balance">
        Extract transcripts, summaries, and actionable insights from any YouTube video using AI
      </p>
    </div>
  );
}
