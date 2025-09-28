import type { LLMConfiguration } from "@shared/schema";

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMRequest {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export class LLMService {
  async sendMessage(config: LLMConfiguration, request: LLMRequest): Promise<LLMResponse> {
    try {
      const response = await fetch(`${config.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages: request.messages,
          temperature: (request.temperature || config.temperature || 70) / 100,
          max_tokens: request.maxTokens || config.maxTokens || 2048,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices?.[0]?.message?.content || "",
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        } : undefined,
      };
    } catch (error) {
      console.error("LLM Service Error:", error);
      throw new Error(`Failed to communicate with LLM: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async testConnection(endpoint: string, model: string): Promise<boolean> {
    try {
      const response = await fetch(`${endpoint}/v1/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.data?.some((m: any) => m.id === model) || false;
    } catch (error) {
      console.error("LLM Connection Test Error:", error);
      return false;
    }
  }

  async getAvailableModels(endpoint: string): Promise<string[]> {
    try {
      const response = await fetch(`${endpoint}/v1/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data?.map((model: any) => model.id) || [];
    } catch (error) {
      console.error("Get Models Error:", error);
      throw new Error(`Failed to fetch available models: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
