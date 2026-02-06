export function TypingIndicator() {
  return (
    <div className="py-6 px-4" data-testid="typing-indicator">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center text-sm font-semibold">
            AI
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <span className="text-sm font-medium">AI Storyteller</span>
            <div className="flex gap-1 items-center">
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
