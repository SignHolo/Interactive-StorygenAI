import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarDrawer } from "@/components/sidebar-drawer";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { TypingIndicator } from "@/components/typing-indicator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Message, Settings, MemoryLog } from "@shared/schema";

export default function Home() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  // Fetch settings
  const { data: settings = null } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  // Fetch memory logs
  const { data: memoryLogs = [] } = useQuery<MemoryLog[]>({
    queryKey: ["/api/memory"],
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/chat", { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/memory"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<Settings>) => {
      return await apiRequest("PUT", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  // Delete memory mutation
  const deleteMemoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/memory/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memory"] });
    },
  });

  // Update memory mutation
  const updateMemoryMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      return await apiRequest("PUT", `/api/memory/${id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memory"] });
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, sendMessageMutation.isPending]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setIsDrawerOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Cache settings locally for fast reload
  useEffect(() => {
    if (settings) {
      localStorage.setItem("cachedSettings", JSON.stringify(settings));
    }
  }, [settings]);

  const cachedSettings = (() => {
    try {
      return JSON.parse(localStorage.getItem("cachedSettings") || "null");
    } catch {
      return null;
    }
  })();



  const handleSendMessage = (content: string) => {
    sendMessageMutation.mutate(content);
  };

  const handleSaveSettings = (data: Partial<Settings>) => {
    updateSettingsMutation.mutate(data);
  };

  const handleDeleteMemory = (id: string) => {
    deleteMemoryMutation.mutate(id);
  };

  const handleUpdateMemory = (id: string, content: string) => {
    updateMemoryMutation.mutate({ id, content });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        settings={settings}
        memoryLogs={memoryLogs}
        onSaveSettings={handleSaveSettings}
        onDeleteMemory={handleDeleteMemory}
        onUpdateMemory={handleUpdateMemory}
      />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="relative flex items-center justify-center px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border/40 z-10">
          <div className="absolute left-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDrawerOpen(true)}
              data-testid="button-open-drawer"
              className="hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex flex-col items-center text-center">
            <h1 className="text-xl font-serif font-semibold tracking-wide flex items-center gap-3">
              <img src="/logo.png" alt="Book and Pen Logo" className="w-8 h-8 object-contain drop-shadow-sm" />
              Interactive Novel Session
            </h1>
            <a 
              href="https://github.com/SignHolo" 
              target="_blank" 
              rel="noreferrer" 
              className="text-xs text-muted-foreground/80 font-medium hover:text-primary transition-colors"
            >
              Github.com/SignHolo
            </a>
          </div>
        </header>

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="min-h-full flex flex-col pb-6">
            {messagesLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="animate-spin h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full mx-auto" />
                  <p className="text-sm font-medium text-muted-foreground animate-pulse">Summoning stories...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8 animate-in fade-in duration-1000">
                <div className="text-center space-y-6 max-w-md bg-card/40 p-8 py-12 rounded-3xl border border-border/50 shadow-sm backdrop-blur-sm">
                  <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto shadow-inner border border-primary/10 p-4">
                    <img src="/logo.png" alt="Book and Pen Logo" className="w-full h-full object-contain drop-shadow-md" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-serif font-bold tracking-tight text-foreground/90">Welcome to Interactive Novel Session</h2>
                    <p className="text-muted-foreground/80 leading-relaxed">
                      Start a conversation and let the AI craft amazing tales for you.
                      Customize the lore, characters, and behavior in the sidebar to shape your world.
                    </p>
                  </div>
                  <div className="pt-4 text-xs font-medium text-muted-foreground/60 space-y-2">
                    <p className="flex items-center justify-center gap-1 opacity-75">
                      <kbd className="px-2 py-1 bg-card border border-border/50 rounded-md font-mono text-[10px]">Ctrl</kbd>
                      <span>+</span>
                      <kbd className="px-2 py-1 bg-card border border-border/50 rounded-md font-mono text-[10px]">B</kbd>
                      <span className="ml-1">to toggle sidebar</span>
                    </p>
                    {!settings?.geminiApiKey && (
                      <p className="text-destructive/90 bg-destructive/10 py-2 px-3 rounded-lg border border-destructive/20 inline-block mt-2">
                        ⚠️ Don't forget to add your Gemini API key in Settings
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {sendMessageMutation.isPending && <TypingIndicator />}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={sendMessageMutation.isPending}
        />
      </div>
    </div>
  );
}
