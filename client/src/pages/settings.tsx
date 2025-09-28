import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLLMConfigurationSchema, type LLMConfiguration, type UserPreferences } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import LLMConfig from "@/components/tools/llm-config";
import SearchEngines from "@/components/tools/search-engines";

const llmFormSchema = insertLLMConfigurationSchema.extend({
  temperature: z.number().min(0).max(100),
});

type LLMFormData = z.infer<typeof llmFormSchema>;

export default function Settings() {
  const [showCreateLLM, setShowCreateLLM] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<LLMConfiguration | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = "default-user";

  const { data: llmConfigs = [], isLoading: isLoadingConfigs } = useQuery({
    queryKey: ["/api/llm-configurations", { userId }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/llm-configurations?userId=${userId}`);
      return response.json();
    },
  });

  const { data: userPreferences, isLoading: isLoadingPrefs } = useQuery({
    queryKey: ["/api/user-preferences", { userId }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/user-preferences?userId=${userId}`);
      return response.json();
    },
  });

  const createLLMConfigMutation = useMutation({
    mutationFn: async (data: LLMFormData) => {
      const response = await apiRequest("POST", "/api/llm-configurations", {
        ...data,
        userId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/llm-configurations"] });
      setShowCreateLLM(false);
      toast({
        title: "Configuration Created",
        description: "LLM configuration has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create LLM configuration",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async ({ endpoint, model }: { endpoint: string; model: string }) => {
      const response = await apiRequest("POST", "/api/llm/test-connection", {
        endpoint,
        model,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.connected ? "Connection Successful" : "Connection Failed",
        description: data.connected 
          ? "Successfully connected to the LLM endpoint" 
          : "Failed to connect to the LLM endpoint",
        variant: data.connected ? "default" : "destructive",
      });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<UserPreferences>) => {
      const response = await apiRequest("PUT", "/api/user-preferences", {
        userId,
        ...updates,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-preferences"] });
      toast({
        title: "Preferences Updated",
        description: "Your preferences have been saved successfully.",
      });
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/data/export", { userId });
      return response.json();
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-assistant-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Export Complete",
        description: "Your data has been exported successfully.",
      });
    },
  });

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/data/clear-cache", {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cache Cleared",
        description: "Application cache has been cleared.",
      });
    },
  });

  const resetSettingsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/data/reset-settings", { userId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-preferences"] });
      toast({
        title: "Settings Reset",
        description: "All settings have been reset to defaults.",
      });
    },
  });

  const form = useForm<LLMFormData>({
    resolver: zodResolver(llmFormSchema),
    defaultValues: {
      name: "",
      endpoint: "http://localhost:11434",
      model: "",
      temperature: 70,
      maxTokens: 2048,
      isDefault: false,
    },
  });

  const onSubmit = (data: LLMFormData) => {
    createLLMConfigMutation.mutate(data);
  };

  const handleTestConnection = () => {
    const endpoint = form.getValues("endpoint");
    const model = form.getValues("model");
    
    if (endpoint && model) {
      testConnectionMutation.mutate({ endpoint, model });
    } else {
      toast({
        title: "Missing Information",
        description: "Please enter both endpoint and model to test connection.",
        variant: "destructive",
      });
    }
  };

  if (isLoadingConfigs || isLoadingPrefs) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Configure your AI assistant preferences and integrations</p>
      </div>

      <Tabs defaultValue="llm" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="llm" data-testid="tab-llm">LLM Configuration</TabsTrigger>
          <TabsTrigger value="search" data-testid="tab-search">Search Engines</TabsTrigger>
          <TabsTrigger value="appearance" data-testid="tab-appearance">Appearance</TabsTrigger>
          <TabsTrigger value="advanced" data-testid="tab-advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="llm" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Local LLM Configuration</h2>
              <p className="text-muted-foreground">Configure your local language model endpoints</p>
            </div>
            <Dialog open={showCreateLLM} onOpenChange={setShowCreateLLM}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-llm">
                  <i className="fas fa-plus mr-2"></i>
                  Add LLM Configuration
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add LLM Configuration</DialogTitle>
                  <DialogDescription>
                    Configure a new local language model endpoint
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Configuration Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Ollama Local" {...field} data-testid="input-llm-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="endpoint"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Endpoint URL</FormLabel>
                            <FormControl>
                              <Input placeholder="http://localhost:11434" {...field} data-testid="input-llm-endpoint" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="model"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Model Name</FormLabel>
                            <FormControl>
                              <Input placeholder="llama2-7b-chat" {...field} data-testid="input-llm-model" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="temperature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Temperature: {field.value / 100}</FormLabel>
                            <FormControl>
                              <Slider
                                min={0}
                                max={100}
                                step={1}
                                value={[field.value]}
                                onValueChange={(value) => field.onChange(value[0])}
                                data-testid="slider-temperature"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="maxTokens"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Tokens</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={8192}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-max-tokens"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="isDefault"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>Set as Default Configuration</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="toggle-default-llm"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestConnection}
                        disabled={testConnectionMutation.isPending}
                        data-testid="button-test-connection"
                      >
                        {testConnectionMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Testing...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-plug mr-2"></i>
                            Test Connection
                          </>
                        )}
                      </Button>
                      
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowCreateLLM(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createLLMConfigMutation.isPending} data-testid="button-save-llm">
                          {createLLMConfigMutation.isPending ? "Creating..." : "Create Configuration"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <LLMConfig />
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Search Engine Configuration</h2>
            <p className="text-muted-foreground">Configure search engines and API keys</p>
          </div>
          
          <SearchEngines />
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme Settings</CardTitle>
              <CardDescription>Customize the appearance of your AI assistant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Use dark theme throughout the application</p>
                </div>
                <Switch 
                  checked={userPreferences?.theme === "dark"}
                  onCheckedChange={(checked) => 
                    updatePreferencesMutation.mutate({ theme: checked ? "dark" : "light" })
                  }
                  data-testid="toggle-dark-mode" 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">Use smaller spacing and components</p>
                </div>
                <Switch 
                  checked={userPreferences?.compactMode || false}
                  onCheckedChange={(checked) => 
                    updatePreferencesMutation.mutate({ compactMode: checked })
                  }
                  data-testid="toggle-compact-mode" 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Animations</Label>
                  <p className="text-sm text-muted-foreground">Enable smooth transitions and animations</p>
                </div>
                <Switch 
                  checked={userPreferences?.animations ?? true}
                  onCheckedChange={(checked) => 
                    updatePreferencesMutation.mutate({ animations: checked })
                  }
                  data-testid="toggle-animations" 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Font Settings</CardTitle>
              <CardDescription>Customize text appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Font Size</Label>
                <Select 
                  value={userPreferences?.fontSize || "medium"}
                  onValueChange={(value) => 
                    updatePreferencesMutation.mutate({ fontSize: value as "small" | "medium" | "large" })
                  }
                >
                  <SelectTrigger data-testid="select-font-size">
                    <SelectValue placeholder="Select font size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Code Font</Label>
                <Select 
                  value={userPreferences?.codeFont || "jetbrains"}
                  onValueChange={(value) => 
                    updatePreferencesMutation.mutate({ codeFont: value as "jetbrains" | "fira" | "source" | "consolas" })
                  }
                >
                  <SelectTrigger data-testid="select-code-font">
                    <SelectValue placeholder="Select code font" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jetbrains">JetBrains Mono</SelectItem>
                    <SelectItem value="fira">Fira Code</SelectItem>
                    <SelectItem value="source">Source Code Pro</SelectItem>
                    <SelectItem value="consolas">Consolas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Settings</CardTitle>
              <CardDescription>Configure performance and resource usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Max Concurrent Requests</Label>
                <Input 
                  type="number" 
                  value={userPreferences?.maxConcurrentRequests || 5}
                  onChange={(e) => 
                    updatePreferencesMutation.mutate({ 
                      maxConcurrentRequests: parseInt(e.target.value) || 5 
                    })
                  }
                  min="1" 
                  max="20" 
                  data-testid="input-max-requests" 
                />
                <p className="text-xs text-muted-foreground">Maximum number of simultaneous API requests</p>
              </div>
              
              <div className="space-y-2">
                <Label>Cache Duration (minutes)</Label>
                <Input 
                  type="number" 
                  value={userPreferences?.cacheDuration || 30}
                  onChange={(e) => 
                    updatePreferencesMutation.mutate({ 
                      cacheDuration: parseInt(e.target.value) || 30 
                    })
                  }
                  min="1" 
                  max="1440" 
                  data-testid="input-cache-duration" 
                />
                <p className="text-xs text-muted-foreground">How long to cache search results and LLM responses</p>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Auto-save Conversations</Label>
                  <p className="text-sm text-muted-foreground">Automatically save conversation history</p>
                </div>
                <Switch 
                  checked={userPreferences?.autoSaveConversations ?? true}
                  onCheckedChange={(checked) => 
                    updatePreferencesMutation.mutate({ autoSaveConversations: checked })
                  }
                  data-testid="toggle-auto-save" 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Manage your application data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Analytics Collection</Label>
                  <p className="text-sm text-muted-foreground">Help improve the application by sharing usage data</p>
                </div>
                <Switch 
                  checked={userPreferences?.analyticsCollection || false}
                  onCheckedChange={(checked) => 
                    updatePreferencesMutation.mutate({ analyticsCollection: checked })
                  }
                  data-testid="toggle-analytics" 
                />
              </div>
              
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => exportDataMutation.mutate()}
                  disabled={exportDataMutation.isPending}
                  data-testid="button-export-data"
                >
                  {exportDataMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-download mr-2"></i>
                      Export All Data
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => clearCacheMutation.mutate()}
                  disabled={clearCacheMutation.isPending}
                  data-testid="button-clear-cache"
                >
                  {clearCacheMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Clearing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-trash mr-2"></i>
                      Clear Cache
                    </>
                  )}
                </Button>
                <Button 
                  variant="destructive" 
                  className="w-full" 
                  onClick={() => resetSettingsMutation.mutate()}
                  disabled={resetSettingsMutation.isPending}
                  data-testid="button-reset-settings"
                >
                  {resetSettingsMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Resetting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-undo mr-2"></i>
                      Reset All Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
              <CardDescription>System information and diagnostics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm font-mono bg-muted p-3 rounded">
                <div>Version: 1.0.0</div>
                <div>Build: {new Date().toISOString().split('T')[0]}</div>
                <div>Platform: {navigator.platform}</div>
                <div>User Agent: {navigator.userAgent.slice(0, 50)}...</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
