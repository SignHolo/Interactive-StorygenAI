import { useState, useEffect } from "react";
import { X, Check, Save } from "lucide-react";
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
  // Multi-provider state
  const [aiProvider, setAiProvider] = useState<string>(settings?.aiProvider || "gemini");
  const [openaiApiKey, setOpenaiApiKey] = useState(settings?.openaiApiKey || "");
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState(settings?.openaiBaseUrl || "");
  const [anthropicApiKey, setAnthropicApiKey] = useState(settings?.anthropicApiKey || "");
  const [generationModel, setGenerationModel] = useState(settings?.generationModel || "gemini-3-pro-preview");
  const [ragModel, setRagModel] = useState(settings?.ragModel || "gemini-2.5-pro");
  const [proofreaderModel, setProofreaderModel] = useState(settings?.proofreaderModel || "gemini-2.5-pro");
  const [utilityModel, setUtilityModel] = useState(settings?.utilityModel || "gemini-3-flash-preview");
  const [embeddingModel, setEmbeddingModel] = useState(settings?.embeddingModel || "embedding-001");
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryContent, setEditingMemoryContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Update local state when settings change
  useEffect(() => {
    if (settings) {
      setBehaviorPrompt(settings.behaviorPrompt || "");
      setFrameworkTemplate(settings.frameworkTemplate || "");
      setCharacterPreset(settings.characterPreset || "");
      setLore(settings.lore || "");
      setApiKey(settings.geminiApiKey || "");
      setAiProvider(settings.aiProvider || "gemini");
      setOpenaiApiKey(settings.openaiApiKey || "");
      setOpenaiBaseUrl(settings.openaiBaseUrl || "");
      setAnthropicApiKey(settings.anthropicApiKey || "");
      setGenerationModel(settings.generationModel || "gemini-3-pro-preview");
      setRagModel(settings.ragModel || "gemini-2.5-pro");
      setProofreaderModel(settings.proofreaderModel || "gemini-2.5-pro");
      setUtilityModel(settings.utilityModel || "gemini-3-flash-preview");
      setEmbeddingModel(settings.embeddingModel || "embedding-001");
    }
  }, [settings]);

  // Check if there are unsaved changes
  const hasUnsavedChanges =
    behaviorPrompt !== (settings?.behaviorPrompt || "") ||
    frameworkTemplate !== (settings?.frameworkTemplate || "") ||
    characterPreset !== (settings?.characterPreset || "") ||
    lore !== (settings?.lore || "") ||
    apiKey !== (settings?.geminiApiKey || "") ||
    aiProvider !== (settings?.aiProvider || "gemini") ||
    openaiApiKey !== (settings?.openaiApiKey || "") ||
    openaiBaseUrl !== (settings?.openaiBaseUrl || "") ||
    anthropicApiKey !== (settings?.anthropicApiKey || "") ||
    generationModel !== (settings?.generationModel || "gemini-3-pro-preview") ||
    ragModel !== (settings?.ragModel || "gemini-2.5-pro") ||
    proofreaderModel !== (settings?.proofreaderModel || "gemini-2.5-pro") ||
    utilityModel !== (settings?.utilityModel || "gemini-3-flash-preview") ||
    embeddingModel !== (settings?.embeddingModel || "embedding-001");

  // Manual save handler
  const handleSaveAllSettings = () => {
    setIsSaving(true);
    onSaveSettings({
      behaviorPrompt,
      frameworkTemplate,
      characterPreset,
      lore,
      geminiApiKey: apiKey || undefined,
      aiProvider,
      openaiApiKey: openaiApiKey || undefined,
      openaiBaseUrl: openaiBaseUrl || undefined,
      anthropicApiKey: anthropicApiKey || undefined,
      generationModel,
      ragModel,
      proofreaderModel,
      utilityModel,
      embeddingModel,
    });
    setTimeout(() => {
      setIsSaving(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    }, 300);
  };

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

      <div
        className={`fixed left-0 top-0 h-screen w-[85vw] sm:w-96 bg-card/95 backdrop-blur-xl border-r border-border shadow-2xl z-50 transition-transform duration-500 ease-out ${isOpen ? "translate-x-0" : "-translate-x-full"
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
              <Button
                variant={hasUnsavedChanges ? "default" : "outline"}
                size="sm"
                onClick={handleSaveAllSettings}
                disabled={!hasUnsavedChanges || isSaving}
                data-testid="button-save-settings"
                className="gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </Button>
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
          <Tabs defaultValue="behavior" className="flex-1 flex flex-col overflow-hidden hidden-scrollbar">
            <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-background/50 backdrop-blur-md p-0 grid grid-cols-3 h-auto">
              <TabsTrigger
                value="behavior"
                className="rounded-none py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-xs font-medium transition-all"
                data-testid="tab-behavior"
              >
                Behavior
              </TabsTrigger>
              <TabsTrigger
                value="framework"
                className="rounded-none py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-xs font-medium transition-all"
                data-testid="tab-framework"
              >
                Framework
              </TabsTrigger>
              <TabsTrigger
                value="lore"
                className="rounded-none py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-xs font-medium transition-all"
                data-testid="tab-lore"
              >
                Lore
              </TabsTrigger>
              <TabsTrigger
                value="characters"
                className="rounded-none py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-xs font-medium transition-all"
                data-testid="tab-characters"
              >
                Characters
              </TabsTrigger>
              <TabsTrigger
                value="memory"
                className="rounded-none py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-xs font-medium transition-all"
                data-testid="tab-memory"
              >
                Memory
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="rounded-none py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary text-xs font-medium transition-all"
                data-testid="tab-settings"
              >
                Settings
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="behavior" className="flex-1 p-4 m-0 h-full data-[state=active]:flex flex-col">
                <div className="flex flex-col h-full gap-3">
                  <div className="space-y-1.5 flex-shrink-0">
                    <Label htmlFor="behavior" className="text-sm font-medium">
                      Personality & Style
                    </Label>
                    <p className="text-xs text-muted-foreground/80">Define the AI's core behavior.</p>
                  </div>
                  <Textarea
                    id="behavior"
                    value={behaviorPrompt}
                    onChange={(e) => setBehaviorPrompt(e.target.value)}
                    className="flex-1 font-mono text-sm resize-none p-4 rounded-xl shadow-sm focus-visible:ring-primary/50"
                    placeholder="You are a creative storyteller..."
                    data-testid="textarea-behavior"
                  />
                </div>
              </TabsContent>

              <TabsContent value="framework" className="flex-1 p-4 m-0 h-full data-[state=active]:flex flex-col">
                <div className="flex flex-col h-full gap-3">
                  <div className="space-y-1.5 flex-shrink-0">
                    <Label htmlFor="framework" className="text-sm font-medium">
                      Output Framework Structure
                    </Label>
                    <p className="text-xs text-muted-foreground/80">Define the JSON structure or specific format to respond in.</p>
                  </div>
                  <Textarea
                    id="framework"
                    value={frameworkTemplate}
                    onChange={(e) => setFrameworkTemplate(e.target.value)}
                    className="flex-1 font-mono text-sm resize-none p-4 rounded-xl shadow-sm focus-visible:ring-primary/50"
                    placeholder='Example:\n{\n  "scene": "...",\n  "dialogue": "..."\n}'
                    data-testid="textarea-framework"
                  />
                </div>
              </TabsContent>

              <TabsContent value="lore" className="flex-1 p-4 m-0 h-full data-[state=active]:flex flex-col">
                <div className="flex flex-col h-full gap-3">
                  <div className="space-y-1.5 flex-shrink-0">
                    <Label htmlFor="lore" className="text-sm font-medium">
                      World Lore
                    </Label>
                    <p className="text-xs text-muted-foreground/80">Document background information, world building, and history.</p>
                  </div>
                  <Textarea
                    id="lore"
                    value={lore}
                    onChange={(e) => setLore(e.target.value)}
                    className="flex-1 font-mono text-sm resize-none p-4 rounded-xl shadow-sm focus-visible:ring-primary/50"
                    placeholder="e.g., The kingdom of Eldoria: A land of magic and ancient ruins..."
                    data-testid="textarea-lore"
                  />
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

              <TabsContent value="characters" className="flex-1 p-4 m-0 h-full data-[state=active]:flex flex-col">
                <div className="flex flex-col h-full gap-3">
                  <div className="space-y-1.5 flex-shrink-0">
                    <Label htmlFor="characters" className="text-sm font-medium">
                      Character Presets
                    </Label>
                    <p className="text-xs text-muted-foreground/80">Define characters to inform the AI of their traits.</p>
                  </div>
                  <Textarea
                    id="characters"
                    value={characterPreset}
                    onChange={(e) => setCharacterPreset(e.target.value)}
                    className="flex-1 font-mono text-sm resize-none p-4 rounded-xl shadow-sm focus-visible:ring-primary/50"
                    placeholder="e.g., King Arthur: A noble king..."
                    data-testid="textarea-characters"
                  />
                </div>
              </TabsContent>

              <TabsContent value="settings" className="h-full p-0 m-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-6">
                    {/* Provider Selection */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">AI Provider</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={(aiProvider === "gemini" || aiProvider === "gemma") ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAiProvider("gemini")}
                          className="flex-1"
                          data-testid="btn-provider-gemini"
                        >
                          Google AI
                        </Button>
                        <Button
                          variant={aiProvider === "openai" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAiProvider("openai")}
                          className="flex-1"
                          data-testid="btn-provider-openai"
                        >
                          OpenAI
                        </Button>
                        <Button
                          variant={aiProvider === "anthropic" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setAiProvider("anthropic")}
                          className="flex-1"
                          data-testid="btn-provider-anthropic"
                        >
                          Claude AI
                        </Button>
                      </div>

                      {/* Gemini / Gemma sub-selector — visible when Google AI is active */}
                      {(aiProvider === "gemini" || aiProvider === "gemma") && (
                        <div className="flex gap-2 pl-2 border-l-2 border-primary/30">
                          <Button
                            variant={aiProvider === "gemini" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAiProvider("gemini")}
                            className="flex-1"
                            data-testid="btn-sub-gemini"
                          >
                            Gemini
                          </Button>
                          <Button
                            variant={aiProvider === "gemma" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAiProvider("gemma")}
                            className="flex-1"
                            data-testid="btn-sub-gemma"
                          >
                            Gemma
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* API Keys */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">API Keys</Label>

                      {(aiProvider === "gemini" || aiProvider === "gemma") && (
                        <div className="space-y-1">
                          <Label htmlFor="apikey" className="text-xs text-muted-foreground">
                            Google AI API Key
                          </Label>
                          <Input
                            id="apikey"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your Google AI API key"
                            data-testid="input-api-key"
                          />
                          <p className="text-xs text-muted-foreground">
                            {aiProvider === "gemma"
                              ? "Gemma 4 models are served via the Google AI API. "
                              : ""}
                            Get your key from{" "}
                            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>
                          </p>
                        </div>
                      )}

                      {aiProvider === "openai" && (
                        <>
                          <div className="space-y-1">
                            <Label htmlFor="openai-apikey" className="text-xs text-muted-foreground">
                              OpenAI API Key
                            </Label>
                            <Input
                              id="openai-apikey"
                              type="password"
                              value={openaiApiKey}
                              onChange={(e) => setOpenaiApiKey(e.target.value)}
                              placeholder="sk-..."
                              data-testid="input-openai-key"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="openai-baseurl" className="text-xs text-muted-foreground">
                              Base URL (optional, for OpenAI-compatible providers)
                            </Label>
                            <Input
                              id="openai-baseurl"
                              value={openaiBaseUrl}
                              onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                              placeholder="https://api.openai.com/v1"
                              data-testid="input-openai-baseurl"
                            />
                            <p className="text-xs text-muted-foreground">
                              Leave empty for OpenAI. Use custom URL for OpenRouter, Together AI, etc.
                            </p>
                          </div>
                        </>
                      )}

                      {aiProvider === "anthropic" && (
                        <div className="space-y-1">
                          <Label htmlFor="anthropic-apikey" className="text-xs text-muted-foreground">
                            Anthropic API Key
                          </Label>
                          <Input
                            id="anthropic-apikey"
                            type="password"
                            value={anthropicApiKey}
                            onChange={(e) => setAnthropicApiKey(e.target.value)}
                            placeholder="sk-ant-..."
                            data-testid="input-anthropic-key"
                          />
                        </div>
                      )}
                    </div>

                    {/* Model Configuration */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Model Configuration</Label>
                      <p className="text-xs text-muted-foreground -mt-1">
                        Type any model name your provider supports.
                      </p>
                      <div className="space-y-1">
                        <Label htmlFor="generation-model" className="text-xs text-muted-foreground">Generation Model</Label>
                        <Input
                          id="generation-model"
                          value={generationModel}
                          onChange={(e) => setGenerationModel(e.target.value)}
                          placeholder="e.g. gemini-3-pro-preview"
                          data-testid="input-generation-model"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="rag-model" className="text-xs text-muted-foreground">RAG Model</Label>
                        <Input
                          id="rag-model"
                          value={ragModel}
                          onChange={(e) => setRagModel(e.target.value)}
                          placeholder="e.g. gemini-2.5-pro"
                          data-testid="input-rag-model"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="proofreader-model" className="text-xs text-muted-foreground">Proofreader Model</Label>
                        <Input
                          id="proofreader-model"
                          value={proofreaderModel}
                          onChange={(e) => setProofreaderModel(e.target.value)}
                          placeholder="e.g. gemini-2.5-pro"
                          data-testid="input-proofreader-model"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="utility-model" className="text-xs text-muted-foreground">Utility Model (classification, summary, location)</Label>
                        <Input
                          id="utility-model"
                          value={utilityModel}
                          onChange={(e) => setUtilityModel(e.target.value)}
                          placeholder="e.g. gemini-3-flash-preview"
                          data-testid="input-utility-model"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="embedding-model" className="text-xs text-muted-foreground">Embedding Model</Label>
                        <Input
                          id="embedding-model"
                          value={embeddingModel}
                          onChange={(e) => setEmbeddingModel(e.target.value)}
                          placeholder="e.g. embedding-001"
                          data-testid="input-embedding-model"
                        />
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </>
  );
}
