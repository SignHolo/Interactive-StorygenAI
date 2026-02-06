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
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDrawerOpen(true)}
              data-testid="button-open-drawer"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">AI Storyteller</h1>
              <p className="text-xs text-muted-foreground">Powered by Gemini</p>
            </div>
          </div>
        </header>

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="min-h-full flex flex-col">
            {messagesLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                  <p className="text-sm text-muted-foreground">Loading messages...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center space-y-4 max-w-md">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-3xl">✨</span>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold">Welcome to AI Storyteller</h2>
                    <p className="text-muted-foreground">
                      Start a conversation and let the AI craft amazing stories for you.
                      Customize the behavior and framework in the sidebar.
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>💡 Tip: Press Cmd/Ctrl+B to toggle the sidebar</p>
                    {!settings?.geminiApiKey && (
                      <p className="text-destructive">⚠️ Don't forget to add your Gemini API key in Settings</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
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
