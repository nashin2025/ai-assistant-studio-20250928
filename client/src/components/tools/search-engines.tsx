import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { SearchEngine } from "@shared/schema";

export default function SearchEngines() {
  const [selectedEngine, setSelectedEngine] = useState<SearchEngine | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = "default-user";

  const { data: searchEngines = [], isLoading } = useQuery({
    queryKey: ["/api/search-engines", { userId }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/search-engines?userId=${userId}`);
      return response.json();
    },
  });

  const updateEngineMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SearchEngine> }) => {
      const response = await apiRequest("PUT", `/api/search-engines/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-engines"] });
      toast({
        title: "Settings Updated",
        description: "Search engine settings have been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update search engine",
        variant: "destructive",
      });
    },
  });

  const handleToggleEngine = (engine: SearchEngine) => {
    updateEngineMutation.mutate({
      id: engine.id,
      updates: { enabled: !engine.enabled },
    });
  };

  const handleUpdateApiKey = (engine: SearchEngine) => {
    setSelectedEngine(engine);
    setApiKey(engine.apiKey || "");
    setShowApiKeyDialog(true);
  };

  const handleSaveApiKey = () => {
    if (selectedEngine) {
      updateEngineMutation.mutate({
        id: selectedEngine.id,
        updates: { apiKey: apiKey || null },
      });
      setShowApiKeyDialog(false);
      setSelectedEngine(null);
      setApiKey("");
    }
  };

  const getEngineIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'google':
        return 'fab fa-google';
      case 'bing':
        return 'fab fa-microsoft';
      case 'duckduckgo':
        return 'fas fa-search';
      default:
        return 'fas fa-search';
    }
  };

  const getEngineColor = (name: string) => {
    switch (name.toLowerCase()) {
      case 'google':
        return 'text-blue-600';
      case 'bing':
        return 'text-blue-500';
      case 'duckduckgo':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

  const getEngineDescription = (name: string) => {
    switch (name.toLowerCase()) {
      case 'google':
        return 'Google Search API for comprehensive web results';
      case 'bing':
        return 'Microsoft Bing Search API for alternative perspectives';
      case 'duckduckgo':
        return 'Privacy-focused search with instant answers';
      default:
        return 'Search engine integration';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {searchEngines.map((engine: SearchEngine) => (
        <Card key={engine.id} data-testid={`search-engine-${engine.name.toLowerCase()}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                  <i className={`${getEngineIcon(engine.name)} ${getEngineColor(engine.name)} text-xl`}></i>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{engine.name}</h3>
                  <p className="text-sm text-muted-foreground">{getEngineDescription(engine.name)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {engine.apiKey ? (
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                        API Key Configured
                      </Badge>
                    ) : engine.name.toLowerCase() === 'duckduckgo' ? (
                      <Badge variant="outline">No API Key Required</Badge>
                    ) : (
                      <Badge variant="destructive">API Key Required</Badge>
                    )}
                    {engine.enabled ? (
                      <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Enabled</Badge>
                    ) : (
                      <Badge variant="outline">Disabled</Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {engine.name.toLowerCase() !== 'duckduckgo' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateApiKey(engine)}
                    data-testid={`button-api-key-${engine.name.toLowerCase()}`}
                  >
                    <i className="fas fa-key mr-2"></i>
                    {engine.apiKey ? 'Update API Key' : 'Add API Key'}
                  </Button>
                )}
                
                <div className="flex items-center gap-2">
                  <Label htmlFor={`toggle-${engine.id}`} className="text-sm">
                    {engine.enabled ? 'Enabled' : 'Disabled'}
                  </Label>
                  <Switch
                    id={`toggle-${engine.id}`}
                    checked={engine.enabled}
                    onCheckedChange={() => handleToggleEngine(engine)}
                    disabled={updateEngineMutation.isPending}
                    data-testid={`toggle-${engine.name.toLowerCase()}`}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* API Key Configuration Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure API Key for {selectedEngine?.name}</DialogTitle>
            <DialogDescription>
              Enter your API key to enable {selectedEngine?.name} search functionality.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                data-testid="input-api-key"
              />
              {selectedEngine?.name.toLowerCase() === 'google' && (
                <p className="text-xs text-muted-foreground">
                  Get your Google Custom Search API key from the Google Cloud Console.
                </p>
              )}
              {selectedEngine?.name.toLowerCase() === 'bing' && (
                <p className="text-xs text-muted-foreground">
                  Get your Bing Search API key from Microsoft Azure Cognitive Services.
                </p>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveApiKey}
                disabled={updateEngineMutation.isPending}
                data-testid="button-save-api-key"
              >
                {updateEngineMutation.isPending ? "Saving..." : "Save API Key"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Search Configuration Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <i className="fas fa-lightbulb text-primary mt-0.5"></i>
              <div>
                <p className="font-medium">Enable Multiple Engines</p>
                <p className="text-muted-foreground">Use multiple search engines to get comprehensive results and different perspectives</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <i className="fas fa-shield-alt text-primary mt-0.5"></i>
              <div>
                <p className="font-medium">API Key Security</p>
                <p className="text-muted-foreground">API keys are stored securely and only used for search requests</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <i className="fas fa-chart-line text-primary mt-0.5"></i>
              <div>
                <p className="font-medium">Rate Limiting</p>
                <p className="text-muted-foreground">Search requests are automatically rate-limited to stay within API quotas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
