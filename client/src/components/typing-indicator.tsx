export function TypingIndicator() {
  return (
    <div className="py-8 px-4 sm:px-6 w-full flex animate-in fade-in" data-testid="typing-indicator">
      <div className="max-w-3xl mx-auto w-full flex items-start gap-5">
        <div className="hidden sm:flex flex-shrink-0 w-10 h-10 rounded-full border border-primary/20 items-center justify-center text-primary/70 font-serif italic bg-card/50 shadow-sm">
          AI
        </div>
        <div className="flex-1 min-w-0 space-y-3 pt-1">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground/70">AI Storyteller</span>
            <span className="text-xs text-muted-foreground/60 italic">Writing...</span>
          </div>
          <div className="flex gap-1.5 items-center pt-2">
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  );
}
