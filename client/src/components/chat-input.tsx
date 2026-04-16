import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 6 * 24; // 6 lines * 24px line height
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [message]);

  return (
    <div className="border-t border-border/40 bg-background/80 backdrop-blur-md pb-4 pt-2 sm:pb-6">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 w-full">
        <div className="relative flex items-end gap-2 bg-card rounded-2xl border border-border/50 shadow-sm focus-within:shadow-md focus-within:border-primary/50 transition-all duration-300">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your response... (Press Enter to send, Shift+Enter for new line)"
            className="resize-none min-h-[56px] max-h-[200px] border-0 bg-transparent focus-visible:ring-0 shadow-none py-4 px-5 text-base sm:text-lg rounded-2xl pr-14"
            disabled={disabled}
            data-testid="input-chat-message"
          />
          <div className="absolute right-3 bottom-3">
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!message.trim() || disabled}
              className="h-10 w-10 rounded-xl bg-primary/90 hover:bg-primary shadow-sm hover:shadow transition-all duration-300"
              data-testid="button-send-message"
            >
              <Send className="h-5 w-5 hover-elevate transition" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
