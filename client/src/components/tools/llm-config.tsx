import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { LLMConfiguration } from "@shared/schema";

export default function LLMConfig() {
  const [selectedConfig, setSelectedConfig] = useState<LLMConfiguration | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = "default-user";

  const { data: llmConfigs = [], isLoading } = useQuery({
    queryKey: ["/api/llm-configurations", { userId }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/llm-configurations?userId=${userId}`);
      return response.json();
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LLMConfiguration> }) => {
      const response = await apiRequest("PUT", `/api/llm-configurations/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/llm-configurations"] });
      toast({
        title: "Configuration Updated",
        description: "LLM configuration has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update configuration",
        variant: "destructive",
      });
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/llm-configurations/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/llm-configurations"] });
      setSelectedConfig(null);
      toast({
        title: "Configuration Deleted",
        description: "LLM configuration has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete configuration",
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

  const handleSetDefault = (config: LLMConfiguration) => {
    updateConfigMutation.mutate({
      id: config.id,
      updates: { isDefault: true },
    });
  };

  const handleUpdateTemperature = (config: LLMConfiguration, temperature: number) => {
    updateConfigMutation.mutate({
      id: config.id,
      updates: { temperature },
    });
  };

  const handleTestConnection = (config: LLMConfiguration) => {
    testConnectionMutation.mutate({
      endpoint: config.endpoint,
      model: config.model,
    });
  };

  const getEndpointStatus = (endpoint: string) => {
    if (endpoint.includes("localhost") || endpoint.includes("127.0.0.1")) {
      return { status: "local", color: "bg-blue-500" };
    }
    if (endpoint.includes("openai.com")) {
      return { status: "openai", color: "bg-green-500" };
    }
    if (endpoint.includes("anthropic.com")) {
      return { status: "anthropic", color: "bg-purple-500" };
    }
    return { status: "custom", color: "bg-gray-500" };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (llmConfigs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <i className="fas fa-robot text-muted-foreground text-xl"></i>
          </div>
          <h3 className="text-lg font-medium mb-2">No LLM Configurations</h3>
          <p className="text-muted-foreground text-center mb-4">
            Add your first LLM configuration to start using the AI assistant.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {llmConfigs.map((config: LLMConfiguration) => {
          const endpointInfo = getEndpointStatus(config.endpoint);
          return (
            <Card
              key={config.id}
              className={`hover:bg-accent transition-colors cursor-pointer ${
                selectedConfig?.id === config.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelectedConfig(config)}
              data-testid={`llm-config-${config.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{config.name}</CardTitle>
                    <CardDescription className="text-sm">{config.endpoint}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {config.isDefault && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        Default
                      </Badge>
                    )}
                    <div className={`w-2 h-2 rounded-full ${endpointInfo.color}`} title={endpointInfo.status}></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Model:</span>
                    <span className="font-medium">{config.model}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Temperature:</span>
                    <span className="font-medium">{(config.temperature || 70) / 100}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Max Tokens:</span>
                    <span className="font-medium">{config.maxTokens || 2048}</span>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestConnection(config);
                      }}
                      disabled={testConnectionMutation.isPending}
                      data-testid={`button-test-${config.id}`}
                    >
                      <i className="fas fa-plug text-xs mr-1"></i>
                      Test
                    </Button>
                    {!config.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(config);
                        }}
                        disabled={updateConfigMutation.isPending}
                        data-testid={`button-default-${config.id}`}
                      >
                        <i className="fas fa-star text-xs mr-1"></i>
                        Set Default
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configuration Details Panel */}
      {selectedConfig && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Configuration Details: {selectedConfig.name}</CardTitle>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteConfigMutation.mutate(selectedConfig.id)}
                disabled={deleteConfigMutation.isPending}
                data-testid={`button-delete-${selectedConfig.id}`}
              >
                <i className="fas fa-trash mr-2"></i>
                Delete
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Endpoint URL</label>
                  <div className="mt-1 p-2 bg-muted rounded text-sm font-mono">{selectedConfig.endpoint}</div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Model Name</label>
                  <div className="mt-1 p-2 bg-muted rounded text-sm font-mono">{selectedConfig.model}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Temperature: {(selectedConfig.temperature || 70) / 100}
                  </label>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[selectedConfig.temperature || 70]}
                    onValueChange={(value) => handleUpdateTemperature(selectedConfig, value[0])}
                    className="w-full"
                    data-testid={`slider-temperature-${selectedConfig.id}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Conservative</span>
                    <span>Creative</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Max Tokens</label>
                  <div className="mt-1 p-2 bg-muted rounded text-sm">{selectedConfig.maxTokens || 2048}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <h4 className="font-medium">Default Configuration</h4>
                <p className="text-sm text-muted-foreground">Use this configuration for new conversations</p>
              </div>
              <Switch
                checked={selectedConfig.isDefault}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleSetDefault(selectedConfig);
                  }
                }}
                disabled={updateConfigMutation.isPending}
                data-testid={`toggle-default-${selectedConfig.id}`}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
