import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { LLMConfiguration } from "@shared/schema";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export function useLLM() {
  const queryClient = useQueryClient();
  const userId = "default-user";

  // Get LLM configurations
  const { data: configs = [], isLoading: isLoadingConfigs } = useQuery({
    queryKey: ["/api/llm-configurations", { userId }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/llm-configurations?userId=${userId}`);
      return response.json();
    },
  });

  // Get default configuration
  const defaultConfig = configs.find((config: LLMConfiguration) => config.isDefault) || configs[0];

  // Send message to LLM
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      messages,
      configId,
      temperature,
      maxTokens,
    }: {
      messages: LLMMessage[];
      configId?: string;
      temperature?: number;
      maxTokens?: number;
    }) => {
      const config = configId || defaultConfig?.id;
      if (!config) {
        throw new Error("No LLM configuration available");
      }

      const response = await apiRequest("POST", "/api/llm/chat", {
        configId: config,
        messages,
        temperature,
        maxTokens,
      });
      return response.json() as Promise<LLMResponse>;
    },
  });

  // Test LLM connection
  const testConnectionMutation = useMutation({
    mutationFn: async ({ endpoint, model }: { endpoint: string; model: string }) => {
      const response = await apiRequest("POST", "/api/llm/test-connection", {
        endpoint,
        model,
      });
      return response.json();
    },
  });

  // Get available models from endpoint
  const getModelsMutation = useMutation({
    mutationFn: async (endpoint: string) => {
      const response = await apiRequest("GET", `/api/llm/models?endpoint=${encodeURIComponent(endpoint)}`);
      return response.json();
    },
  });

  // Create new LLM configuration
  const createConfigMutation = useMutation({
    mutationFn: async (configData: Omit<LLMConfiguration, "id" | "createdAt">) => {
      const response = await apiRequest("POST", "/api/llm-configurations", {
        ...configData,
        userId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/llm-configurations"] });
    },
  });

  // Update LLM configuration
  const updateConfigMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<LLMConfiguration> }) => {
      const response = await apiRequest("PUT", `/api/llm-configurations/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/llm-configurations"] });
    },
  });

  // Delete LLM configuration
  const deleteConfigMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/llm-configurations/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/llm-configurations"] });
    },
  });

  const sendMessage = (messages: LLMMessage[], options?: {
    configId?: string;
    temperature?: number;
    maxTokens?: number;
  }) => {
    return sendMessageMutation.mutateAsync({
      messages,
      ...options,
    });
  };

  const testConnection = (endpoint: string, model: string) => {
    return testConnectionMutation.mutateAsync({ endpoint, model });
  };

  const getAvailableModels = (endpoint: string) => {
    return getModelsMutation.mutateAsync(endpoint);
  };

  const createConfig = (configData: Omit<LLMConfiguration, "id" | "createdAt">) => {
    return createConfigMutation.mutateAsync(configData);
  };

  const updateConfig = (id: string, updates: Partial<LLMConfiguration>) => {
    return updateConfigMutation.mutateAsync({ id, updates });
  };

  const deleteConfig = (id: string) => {
    return deleteConfigMutation.mutateAsync(id);
  };

  return {
    // Data
    configs,
    defaultConfig,
    isLoadingConfigs,

    // Actions
    sendMessage,
    testConnection,
    getAvailableModels,
    createConfig,
    updateConfig,
    deleteConfig,

    // Mutation states
    isSending: sendMessageMutation.isPending,
    isTesting: testConnectionMutation.isPending,
    isLoadingModels: getModelsMutation.isPending,
    isCreating: createConfigMutation.isPending,
    isUpdating: updateConfigMutation.isPending,
    isDeleting: deleteConfigMutation.isPending,

    // Last response
    lastResponse: sendMessageMutation.data,
    
    // Errors
    sendError: sendMessageMutation.error,
    testError: testConnectionMutation.error,
    modelsError: getModelsMutation.error,
  };
}
