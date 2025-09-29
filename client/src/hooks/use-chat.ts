import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAutoFileManager } from "./use-auto-file-manager";
import type { Conversation, Message, InsertMessage } from "@shared/schema";

export function useChat(conversationId?: string) {
  // Mock user ID for now - in a real app this would come from auth context
  const userId = "demo-user";

  // Initialize conversation ID from localStorage, URL param, or undefined
  const getInitialConversationId = () => {
    if (conversationId) return conversationId;
    try {
      return localStorage.getItem(`currentConversationId:${userId}`) || undefined;
    } catch {
      return undefined;
    }
  };

  const [currentConversationId, setCurrentConversationIdState] = useState<string | undefined>(getInitialConversationId);
  const queryClient = useQueryClient();
  const { processAIResponse, hasAutoSaveableContent } = useAutoFileManager();

  // Wrapper function to save to localStorage when conversation ID changes
  const setCurrentConversationId = (id: string | undefined) => {
    setCurrentConversationIdState(id);
    try {
      if (id) {
        localStorage.setItem(`currentConversationId:${userId}`, id);
      } else {
        localStorage.removeItem(`currentConversationId:${userId}`);
      }
    } catch (error) {
      console.warn('Failed to save conversation ID to localStorage:', error);
    }
  };

  // Fetch conversations
  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/conversations", { userId }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/conversations?userId=${userId}`);
      return response.json();
    },
  });

  // Sync with prop changes and reconcile invalid saved IDs
  useEffect(() => {
    // If prop conversationId changes and differs from current state, sync it
    if (conversationId && conversationId !== currentConversationId) {
      setCurrentConversationId(conversationId);
      return;
    }

    // If we have conversations loaded
    if (conversations.length > 0) {
      // Check if current conversation ID is valid
      if (currentConversationId && !conversations.find((c: Conversation) => c.id === currentConversationId)) {
        // Invalid ID - clear it and select most recent
        console.warn('Saved conversation ID is invalid, selecting most recent conversation');
        setCurrentConversationId(undefined);
      }

      // Auto-select most recent conversation if none is selected
      if (!currentConversationId) {
        // Sort by updatedAt or createdAt with resilient fallbacks
        const getTimestamp = (conv: Conversation) => {
          const updated = conv.updatedAt ? new Date(conv.updatedAt).getTime() : 0;
          const created = conv.createdAt ? new Date(conv.createdAt).getTime() : 0;
          return updated || created || 0;
        };

        const sortedConversations = [...conversations].sort((a, b) => {
          return getTimestamp(b) - getTimestamp(a); // Most recent first
        });

        const mostRecentConversation = sortedConversations[0];
        if (mostRecentConversation) {
          setCurrentConversationId(mostRecentConversation.id);
        }
      }
    }
  }, [conversations, currentConversationId, conversationId]);

  // Fetch messages for current conversation
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ["/api/conversations", currentConversationId, "messages"],
    queryFn: async () => {
      if (!currentConversationId) return [];
      const response = await apiRequest("GET", `/api/conversations/${currentConversationId}/messages`);
      return response.json();
    },
    enabled: !!currentConversationId,
  });

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest("POST", "/api/conversations", {
        userId,
        title,
      });
      return response.json();
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setCurrentConversationId(newConversation.id);
    },
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, files, conversationId: convId }: {
      content: string;
      files?: File[];
      conversationId: string;
    }) => {
      // Create user message first
      const userMessage: InsertMessage = {
        conversationId: convId,
        role: "user",
        content,
        metadata: files ? JSON.stringify({ attachedFiles: files.map(f => ({ name: f.name, size: f.size, type: f.type })) }) : undefined,
      };

      const userResponse = await apiRequest("POST", "/api/messages", userMessage);
      const createdUserMessage = await userResponse.json();

      // If files are attached, upload them
      let fileAnalysis = null;
      if (files && files.length > 0) {
        const formData = new FormData();
        files.forEach(file => formData.append('file', file));
        formData.append('userId', userId);
        
        try {
          const fileResponse = await apiRequest("POST", "/api/files/upload", formData);
          fileAnalysis = await fileResponse.json();
        } catch (error) {
          console.error("File upload failed:", error);
        }
      }

      // Get LLM configuration
      const configResponse = await apiRequest("GET", `/api/llm-configurations?userId=${userId}`);
      const configs = await configResponse.json();
      const defaultConfig = configs.find((c: any) => c.isDefault) || configs[0];

      if (!defaultConfig) {
        throw new Error("No LLM configuration found. Please configure an LLM endpoint in settings.");
      }

      // Build conversation context
      const conversationMessages = [
        ...messages,
        createdUserMessage,
      ].map(msg => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      }));

      // Add system message with file context if files were uploaded
      if (fileAnalysis) {
        conversationMessages.unshift({
          role: "system" as const,
          content: `The user has uploaded a file: ${fileAnalysis.originalName}. File analysis: ${JSON.stringify(fileAnalysis.analysis, null, 2)}. Please consider this context when responding.`,
        });
      }

      // Send to LLM with error handling
      try {
        const llmResponse = await apiRequest("POST", "/api/llm/chat", {
          configId: defaultConfig.id,
          messages: conversationMessages,
        });
        
        const llmResult = await llmResponse.json();

        // Process AI response for automatic file creation/editing
        let autoFileResult = null;
        try {
          if (hasAutoSaveableContent(llmResult.content)) {
            autoFileResult = await processAIResponse(llmResult.content);
          }
        } catch (error) {
          console.warn('Auto file processing failed:', error);
          // Continue even if auto file processing fails
        }

        // Create assistant message
        const assistantMessage: InsertMessage = {
          conversationId: convId,
          role: "assistant",
          content: llmResult.content,
          metadata: JSON.stringify({
            usage: llmResult.usage,
            fileAnalysis: fileAnalysis ? fileAnalysis.analysis : undefined,
            autoFiles: autoFileResult ? {
              created: autoFileResult.created,
              updated: autoFileResult.updated,
              errors: autoFileResult.errors,
            } : undefined,
          }),
        };

        const assistantResponse = await apiRequest("POST", "/api/messages", assistantMessage);
        return assistantResponse.json();
      } catch (llmError) {
        console.warn("LLM service unavailable:", llmError);
        
        // Create fallback assistant message when LLM is unavailable
        const fallbackMessage: InsertMessage = {
          conversationId: convId,
          role: "assistant",
          content: "I'm sorry, but I'm currently unable to connect to the AI service. Your message has been saved. Please check that the LLM service (like Ollama) is running and try again.",
          metadata: JSON.stringify({
            error: "LLM service unavailable",
            fileAnalysis: fileAnalysis ? fileAnalysis.analysis : undefined,
          }),
        };

        const fallbackResponse = await apiRequest("POST", "/api/messages", fallbackMessage);
        return fallbackResponse.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", currentConversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  // Send message function
  const sendMessage = async (content: string, files?: File[]) => {
    if (!content.trim() && (!files || files.length === 0)) return;

    let conversationId = currentConversationId;
    
    // Create new conversation if none exists
    if (!conversationId) {
      const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
      const newConversation = await createConversationMutation.mutateAsync(title);
      conversationId = newConversation.id;
    }

    return sendMessageMutation.mutateAsync({ content, files, conversationId: conversationId! });
  };

  // Get current conversation
  const currentConversation = conversations.find((c: Conversation) => c.id === currentConversationId);

  return {
    conversations,
    messages,
    currentConversation,
    currentConversationId,
    setCurrentConversationId,
    isLoading: sendMessageMutation.isPending,
    isLoadingMessages,
    sendMessage,
    createConversation: createConversationMutation.mutateAsync,
  };
}
