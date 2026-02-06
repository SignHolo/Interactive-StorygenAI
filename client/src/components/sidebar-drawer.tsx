import { useState, useEffect, useRef } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "./theme-toggle";
import type { Settings, MemoryLog } from "@shared/schema";

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings | null;
  memoryLogs: MemoryLog[];
  onSaveSettings: (settings: Partial<Settings>) => void;
  onDeleteMemory: (id: string) => void;
  onUpdateMemory: (id: string, content: string) => void;
}

export function SidebarDrawer({
  isOpen,
  onClose,
  settings,
  memoryLogs,
  onSaveSettings,
  onDeleteMemory,
  onUpdateMemory,
}: SidebarDrawerProps) {
  const { toast } = useToast();
  const [behaviorPrompt, setBehaviorPrompt] = useState(settings?.behaviorPrompt || "");
  const [frameworkTemplate, setFrameworkTemplate] = useState(settings?.frameworkTemplate || "");
  const [characterPreset, setCharacterPreset] = useState(settings?.characterPreset || "");
  const [lore, setLore] = useState(settings?.lore || "");
  const [apiKey, setApiKey] = useState(settings?.geminiApiKey || "");
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryContent, setEditingMemoryContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Auto-save timers
  const behaviorTimerRef = useRef<NodeJS.Timeout>();
  const frameworkTimerRef = useRef<NodeJS.Timeout>();
  const characterPresetTimerRef = useRef<NodeJS.Timeout>();
  const loreTimerRef = useRef<NodeJS.Timeout>();
  const apiKeyTimerRef = useRef<NodeJS.Timeout>();

  // Update local state when settings change
  useEffect(() => {
    if (settings) {
      setBehaviorPrompt(settings.behaviorPrompt || "");
      setFrameworkTemplate(settings.frameworkTemplate || "");
      setCharacterPreset(settings.characterPreset || "");
      setLore(settings.lore || "");
      setApiKey(settings.geminiApiKey || "");
    }
  }, [settings]);

  // Auto-save behavior prompt with debounce
  useEffect(() => {
    if (behaviorPrompt && behaviorPrompt !== settings?.behaviorPrompt) {
      if (behaviorTimerRef.current) {
        clearTimeout(behaviorTimerRef.current);
      }
      behaviorTimerRef.current = setTimeout(() => {
        setIsSaving(true);
        onSaveSettings({ behaviorPrompt });
        setTimeout(() => {
          setIsSaving(false);
          setShowSaved(true);
          setTimeout(() => setShowSaved(false), 2000);
        }, 300);
      }, 1000);
    }
    return () => {
      if (behaviorTimerRef.current) {
        clearTimeout(behaviorTimerRef.current);
      }
    };
  }, [behaviorPrompt, settings?.behaviorPrompt, onSaveSettings]);

  // Auto-save framework template with debounce
  useEffect(() => {
    if (frameworkTemplate !== settings?.frameworkTemplate && settings !== null) {
      if (frameworkTimerRef.current) {
        clearTimeout(frameworkTimerRef.current);
      }
      frameworkTimerRef.current = setTimeout(() => {
        setIsSaving(true);
        onSaveSettings({ frameworkTemplate });
        setTimeout(() => {
          setIsSaving(false);
          setShowSaved(true);
          setTimeout(() => setShowSaved(false), 2000);
        }, 300);
      }, 1000);
    }
    return () => {
      if (frameworkTimerRef.current) {
        clearTimeout(frameworkTimerRef.current);
      }
    };
  }, [frameworkTemplate, settings?.frameworkTemplate, onSaveSettings, settings]);

  // Auto-save API key with debounce (longer delay for security)
  useEffect(() => {
    if (apiKey && apiKey !== settings?.geminiApiKey) {
      if (apiKeyTimerRef.current) {
        clearTimeout(apiKeyTimerRef.current);
      }
      apiKeyTimerRef.current = setTimeout(() => {
        setIsSaving(true);
        onSaveSettings({ geminiApiKey: apiKey });
        setTimeout(() => {
          setIsSaving(false);
          setShowSaved(true);
          setTimeout(() => setShowSaved(false), 2000);
        }, 300);
      }, 1500);
    }
    return () => {
      if (apiKeyTimerRef.current) {
        clearTimeout(apiKeyTimerRef.current);
      }
    };
  }, [apiKey, settings?.geminiApiKey, onSaveSettings]);

  // Auto-save character preset with debounce
  useEffect(() => {
    if (characterPreset !== settings?.characterPreset && settings !== null) {
      if (characterPresetTimerRef.current) {
        clearTimeout(characterPresetTimerRef.current);
      }
      characterPresetTimerRef.current = setTimeout(() => {
        setIsSaving(true);
        onSaveSettings({ characterPreset });
        setTimeout(() => {
          setIsSaving(false);
          setShowSaved(true);
          setTimeout(() => setShowSaved(false), 2000);
        }, 300);
      }, 1000);
    }
    return () => {
      if (characterPresetTimerRef.current) {
        clearTimeout(characterPresetTimerRef.current);
      }
    };
  }, [characterPreset, settings?.characterPreset, onSaveSettings, settings]);

  // Auto-save lore with debounce
  useEffect(() => {
    if (lore !== settings?.lore && settings !== null) {
      if (loreTimerRef.current) {
        clearTimeout(loreTimerRef.current);
      }
      loreTimerRef.current = setTimeout(() => {
        setIsSaving(true);
        onSaveSettings({ lore });
        setTimeout(() => {
          setIsSaving(false);
          setShowSaved(true);
          setTimeout(() => setShowSaved(false), 2000);
        }, 300);
      }, 1000);
    }
    return () => {
      if (loreTimerRef.current) {
        clearTimeout(loreTimerRef.current);
      }
    };
  }, [lore, settings?.lore, onSaveSettings, settings]);

  const handleEditMemory = (memory: MemoryLog) => {
    setEditingMemoryId(memory.id);
    setEditingMemoryContent(memory.content);
  };

  const handleSaveMemory = () => {
    if (editingMemoryId) {
      onUpdateMemory(editingMemoryId, editingMemoryContent);
      setEditingMemoryId(null);
      setEditingMemoryContent("");
      toast({
        title: "Updated",
        description: "Memory log updated successfully",
      });
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          data-testid="backdrop-drawer"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed left-0 top-0 h-screen w-80 bg-card border-r border-card-border shadow-xl z-50 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="sidebar-drawer"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-card-border">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Settings</h2>
              {isSaving && (
                <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
              )}
              {showSaved && !isSaving && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="h-3 w-3" />
                  <span>Saved</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                data-testid="button-close-drawer"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          


          
          {/* Tabs */}
          <Tabs defaultValue="behavior" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start rounded-none border-b border-card-border bg-transparent p-0 grid grid-cols-4 h-auto">
              <TabsTrigger
                value="behavior"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                data-testid="tab-behavior"
              >
                Behavior
              </TabsTrigger>
              <TabsTrigger
                value="framework"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                data-testid="tab-framework"
              >
                Framework
              </TabsTrigger>
              <TabsTrigger
                value="lore"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                data-testid="tab-lore"
              >
                Lore
              </TabsTrigger>
              <TabsTrigger
                value="characters"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                data-testid="tab-characters"
              >
                Characters
              </TabsTrigger>
              <TabsTrigger
                value="memory"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                data-testid="tab-memory"
              >
                Memory
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                data-testid="tab-settings"
              >
                API Key
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="behavior" className="h-full p-4 m-0">
                <div className="flex flex-col h-full gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="behavior" className="text-sm text-muted-foreground">
                      Define the AI's personality and storytelling style (auto-saves)
                    </Label>
                    <Textarea
                      id="behavior"
                      value={behaviorPrompt}
                      onChange={(e) => setBehaviorPrompt(e.target.value)}
                      className="h-64 font-mono text-sm resize-none"
                      placeholder="You are a creative storyteller..."
                      data-testid="textarea-behavior"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="framework" className="h-full p-4 m-0">
                <div className="flex flex-col h-full gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="framework" className="text-sm text-muted-foreground">
                      Define the output structure template (auto-saves)
                    </Label>
                    <Textarea
                      id="framework"
                      value={frameworkTemplate}
                      onChange={(e) => setFrameworkTemplate(e.target.value)}
                      className="h-48 font-mono text-sm resize-none"
                      placeholder='Example:\n{\n  "scene": "...",\n  "dialogue": "..."\n}'
                      data-testid="textarea-framework"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="lore" className="h-full p-4 m-0">
                <div className="flex flex-col h-full gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lore" className="text-sm text-muted-foreground">
                      Define the world lore and background information (auto-saves)
                    </Label>
                    <Textarea
                      id="lore"
                      value={lore}
                      onChange={(e) => setLore(e.target.value)}
                      className="h-64 font-mono text-sm resize-none"
                      placeholder="e.g., The kingdom of Eldoria: A land of magic and ancient ruins..."
                      data-testid="textarea-lore"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="memory" className="h-full p-0 m-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-3">
                    {memoryLogs.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p className="text-sm">No memory logs yet</p>
                        <p className="text-xs mt-1">
                          Memories will be created as you chat
                        </p>
                      </div>
                    ) : (
                      memoryLogs.map((memory) => (
                        <Card key={memory.id} className="p-3 space-y-2" data-testid={`memory-${memory.id}`}>
                          {editingMemoryId === memory.id ? (
                            <>
                              <Textarea
                                value={editingMemoryContent}
                                onChange={(e) => setEditingMemoryContent(e.target.value)}
                                className="min-h-20 text-sm resize-none"
                                data-testid={`textarea-memory-${memory.id}`}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={handleSaveMemory}
                                  className="flex-1"
                                  data-testid={`button-save-memory-${memory.id}`}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingMemoryId(null)}
                                  className="flex-1"
                                  data-testid={`button-cancel-memory-${memory.id}`}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-sm leading-relaxed">{memory.content}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(memory.createdAt).toLocaleDateString()}
                                </span>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditMemory(memory)}
                                    data-testid={`button-edit-memory-${memory.id}`}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => onDeleteMemory(memory.id)}
                                    data-testid={`button-delete-memory-${memory.id}`}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="characters" className="h-full p-4 m-0">
                <div className="flex flex-col h-full gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="characters" className="text-sm text-muted-foreground">
                      Define the characters in the story (auto-saves)
                    </Label>
                    <Textarea
                      id="characters"
                      value={characterPreset}
                      onChange={(e) => setCharacterPreset(e.target.value)}
                      className="h-64 font-mono text-sm resize-none"
                      placeholder="e.g., King Arthur: A noble king..."
                      data-testid="textarea-characters"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="h-full p-4 m-0">
                <div className="flex flex-col h-full gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="apikey" className="text-sm text-muted-foreground">
                      Gemini API Key (auto-saves)
                    </Label>
                    <Input
                      id="apikey"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your Gemini API key"
                      data-testid="input-api-key"
                    />
                    <p className="text-xs text-muted-foreground">
                      Get your API key from{" "}
                      <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Google AI Studio
                      </a>
                    </p>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </>
  );
}
