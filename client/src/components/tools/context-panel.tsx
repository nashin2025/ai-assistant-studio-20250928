import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { LLMConfiguration, SearchEngine, File as FileType } from "@shared/schema";

interface ContextPanelProps {
  className?: string;
}

export default function ContextPanel({ className }: ContextPanelProps) {
  const [activeTab, setActiveTab] = useState<"llm" | "search" | "context" | "files">("llm");
  const userId = "default-user";

  const { data: llmConfigs = [] } = useQuery({
    queryKey: ["/api/llm-configurations", { userId }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/llm-configurations?userId=${userId}`);
      return response.json();
    },
  });

  const { data: searchEngines = [] } = useQuery({
    queryKey: ["/api/search-engines", { userId }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/search-engines?userId=${userId}`);
      return response.json();
    },
  });

  const { data: recentFiles = [] } = useQuery({
    queryKey: ["/api/files", { userId }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/files?userId=${userId}`);
      const files = await response.json();
      return files.slice(0, 5); // Only show recent 5 files
    },
  });

  const defaultConfig = llmConfigs.find((config: LLMConfiguration) => config.isDefault) || llmConfigs[0];
  const enabledEngines = searchEngines.filter((engine: SearchEngine) => engine.enabled);

  const contextItems = [
    { type: "code", name: "React Component Analysis", icon: "fas fa-code" },
    { type: "search", name: "Web Search Results", icon: "fas fa-globe" },
  ];

  return (
    <aside className={cn("w-80 bg-sidebar border-l border-sidebar-border flex flex-col", className)}>
      {/* Tools Header */}
      <div className="p-4 border-b border-sidebar-border">
        <h3 className="font-semibold text-sm text-sidebar-foreground">AI Tools & Context</h3>
        <p className="text-xs text-muted-foreground mt-1">Active integrations and context information</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* LLM Configuration */}
          <div>
            <h4 className="font-medium text-sm mb-3 text-sidebar-foreground">Local LLM Configuration</h4>
            {defaultConfig ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Model Endpoint</label>
                  <Select defaultValue={defaultConfig.id}>
                    <SelectTrigger className="w-full mt-1 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {llmConfigs.map((config: LLMConfiguration) => (
                        <SelectItem key={config.id} value={config.id}>
                          {config.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Active Model</label>
                  <div className="mt-1 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded text-sm text-primary">
                    {defaultConfig.model}
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Temperature: {(defaultConfig.temperature || 70) / 100}
                  </label>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[defaultConfig.temperature || 70]}
                    className="w-full mt-1"
                    data-testid="context-temperature-slider"
                  />
                  <div className="text-xs text-muted-foreground text-right">{(defaultConfig.temperature || 70) / 100}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No LLM configuration found
              </div>
            )}
          </div>

          <Separator />

          {/* Search Engines */}
          <div>
            <h4 className="font-medium text-sm mb-3 text-sidebar-foreground">Search Engine Integration</h4>
            <div className="space-y-2">
              {searchEngines.map((engine: SearchEngine) => (
                <label key={engine.id} className="flex items-center gap-2">
                  <Switch
                    checked={engine.enabled}
                    className="scale-75"
                    data-testid={`context-toggle-${engine.name.toLowerCase()}`}
                  />
                  <span className="text-sm">{engine.name}</span>
                </label>
              ))}
            </div>
            
            {enabledEngines.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                {enabledEngines.length} engine{enabledEngines.length !== 1 ? 's' : ''} enabled
              </div>
            )}
          </div>

          <Separator />

          {/* Context & Files */}
          <div>
            <h4 className="font-medium text-sm mb-3 text-sidebar-foreground">Active Context</h4>
            <div className="space-y-2">
              {contextItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-accent/30 rounded text-sm">
                  <i className={`${item.icon} text-primary text-xs`}></i>
                  <span className="flex-1 truncate">{item.name}</span>
                  <Button variant="ghost" size="sm" className="h-auto p-0 text-muted-foreground hover:text-destructive">
                    <i className="fas fa-times text-xs"></i>
                  </Button>
                </div>
              ))}
              
              {contextItems.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No active context
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Recent Files */}
          <div>
            <h4 className="font-medium text-sm mb-3 text-sidebar-foreground">Recent Files</h4>
            <div className="space-y-2">
              {recentFiles.map((file: FileType) => (
                <div key={file.id} className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer transition-colors text-sm">
                  <i className="fas fa-file-alt text-muted-foreground text-xs"></i>
                  <div className="flex-1 min-w-0">
                    <p className="truncate" title={file.originalName}>{file.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(file.createdAt!).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {recentFiles.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No recent files
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Quick Actions */}
          <div>
            <h4 className="font-medium text-sm mb-3 text-sidebar-foreground">Quick Actions</h4>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start text-xs" data-testid="quick-web-search">
                <i className="fas fa-search mr-2"></i>
                Web Search
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-xs" data-testid="quick-code-review">
                <i className="fas fa-code mr-2"></i>
                Code Review
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-xs" data-testid="quick-file-upload">
                <i className="fas fa-upload mr-2"></i>
                Upload File
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-xs" data-testid="quick-new-project">
                <i className="fas fa-plus mr-2"></i>
                New Project
              </Button>
            </div>
          </div>

          <Separator />

          {/* Status Information */}
          <div>
            <h4 className="font-medium text-sm mb-3 text-sidebar-foreground">System Status</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">LLM Status:</span>
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1 status-pulse"></div>
                  Ready
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Search APIs:</span>
                <Badge variant="outline">
                  {enabledEngines.length}/{searchEngines.length} Active
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Storage:</span>
                <Badge variant="outline">
                  {recentFiles.length} Files
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
