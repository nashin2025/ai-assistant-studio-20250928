import { useState, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import Message from "./message";
import ChatInput from "./chat-input";
import FileUploadZone from "./file-upload-zone";
import { Card } from "@/components/ui/card";
import ContextPanel from "@/components/tools/context-panel";

export default function ChatInterface() {
  const { messages, isLoading, sendMessage, currentConversation } = useChat();

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Chat Messages Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="messages-container">
          {messages.length === 0 ? (
            <WelcomeMessage />
          ) : (
            messages.map((message) => (
              <Message key={message.id} message={message} />
            ))
          )}
          
          {isLoading && <LoadingMessage />}
        </div>

        {/* Chat Input */}
        <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
      </div>

      {/* Right Sidebar - Context Panel */}
      <ContextPanel className="hidden xl:flex" />
    </div>
  );
}

function WelcomeMessage() {
  return (
    <div className="max-w-4xl mx-auto" data-testid="welcome-message">
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-robot text-primary text-xl"></i>
        </div>
        <h3 className="text-xl font-semibold mb-2">Welcome to AI Assistant Studio</h3>
        <p className="text-muted-foreground mb-6">Your professional AI development companion with local LLM integration, web search, code analysis, and more.</p>
        
        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl">
          <Card className="p-4 text-left">
            <i className="fas fa-search text-primary mb-2"></i>
            <h4 className="font-medium text-sm mb-1">Web Search</h4>
            <p className="text-xs text-muted-foreground">Search multiple engines simultaneously</p>
          </Card>
          
          <Card className="p-4 text-left">
            <i className="fas fa-code text-primary mb-2"></i>
            <h4 className="font-medium text-sm mb-1">Code Analysis</h4>
            <p className="text-xs text-muted-foreground">Review and optimize your code</p>
          </Card>
          
          <Card className="p-4 text-left">
            <i className="fas fa-project-diagram text-primary mb-2"></i>
            <h4 className="font-medium text-sm mb-1">Project Planning</h4>
            <p className="text-xs text-muted-foreground">Architecture and design tools</p>
          </Card>
          
          <Card className="p-4 text-left">
            <i className="fas fa-file-upload text-primary mb-2"></i>
            <h4 className="font-medium text-sm mb-1">File Processing</h4>
            <p className="text-xs text-muted-foreground">Analyze documents and files</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="max-w-4xl mx-auto" data-testid="loading-message">
      <div className="flex gap-3 mb-4">
        <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <i className="fas fa-robot text-primary-foreground text-sm"></i>
        </div>
        <div className="flex-1">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="loading-dots text-sm text-muted-foreground">
              <span>•</span>
              <span>•</span>
              <span>•</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
