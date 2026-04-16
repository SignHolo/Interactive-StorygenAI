import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@shared/schema";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`group py-8 px-4 sm:px-6 w-full flex animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out ${
        isUser ? "bg-muted/30 border-y border-border/40" : ""
      }`}
      data-testid={`message-${message.role}`}
    >
      <div className="max-w-3xl mx-auto w-full flex items-start gap-5">
        {!isUser && (
          <div className="hidden sm:flex flex-shrink-0 w-10 h-10 rounded-full border border-primary/20 items-center justify-center text-primary/70 font-serif italic bg-card/50 shadow-sm">
            AI
          </div>
        )}
        
        {isUser && (
          <div className="hidden sm:flex flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground items-center justify-center font-sans shadow-md">
            U
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-3 pt-1">
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${isUser ? 'text-primary' : 'text-foreground/70'}`}>
              {isUser ? "You" : "AI Storyteller"}
            </span>
            <span className="text-xs text-muted-foreground/60">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          <div
            className={`prose dark:prose-invert max-w-none ${
              isUser
                ? "text-base font-sans text-foreground/80 leading-relaxed"
                : "text-lg sm:text-xl font-serif text-foreground leading-[1.8] tracking-wide"
            }`}
          >
            {isUser ? (
              <p className="m-0 whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => (
                    <p className="mb-6 last:mb-0 text-foreground/90">{children}</p>
                  ),
                  code: ({ children }) => (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-muted-foreground">
                      {children}
                    </code>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-foreground/80">
                      {children}
                    </em>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80"
                    >
                      {children}
                    </a>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc ml-6 mb-6 mt-2 space-y-2 text-foreground/80">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal ml-6 mb-6 mt-2 space-y-2 text-foreground/80">{children}</ol>
                  ),
                  li: ({ children }) => <li className="pl-1">{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary/40 px-4 py-2 my-4 bg-primary/5 rounded-r-md space-y-1 not-italic whitespace-pre-wrap [&>p]:m-0 [&>p]:before:content-none [&>p]:after:content-none">
                      {children}
                    </blockquote>
                  ),
                  hr: () => (
                    <hr className="my-6 border-border/50" />
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 pt-1">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-primary/10 hover:text-primary"
            onClick={handleCopy}
            data-testid={`button-copy-${message.id}`}
            title="Copy message"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
