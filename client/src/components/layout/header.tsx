import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@shared/schema";

const pageConfig = {
  "/": {
    title: "Chat Assistant",
    description: "AI-powered conversation interface",
  },
  "/project-planning": {
    title: "Project Planning",
    description: "Software architecture and design tools",
  },
  "/code-analysis": {
    title: "Code Analysis",
    description: "Review and optimize your code",
  },
  "/web-search": {
    title: "Web Search",
    description: "Multi-engine search and content analysis",
  },
  "/document-analysis": {
    title: "Document Analysis",
    description: "Process and analyze uploaded documents",
  },
  "/integrations": {
    title: "Integrations",
    description: "Connect external services and APIs",
  },
  "/settings": {
    title: "Settings",
    description: "Configure your AI assistant",
  },
};

export default function Header() {
  const [location] = useLocation();
  const { user } = useAuth();
  const config = pageConfig[location as keyof typeof pageConfig] || { title: "AI Assistant", description: "" };

  // Type the user properly
  const typedUser = user as User | null;

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getUserDisplayName = () => {
    if (typedUser?.firstName && typedUser?.lastName) {
      return `${typedUser.firstName} ${typedUser.lastName}`;
    }
    if (typedUser?.firstName) {
      return typedUser.firstName;
    }
    if (typedUser?.email) {
      return typedUser.email;
    }
    return "User";
  };

  const getUserInitials = () => {
    if (typedUser?.firstName && typedUser?.lastName) {
      return `${typedUser.firstName[0]}${typedUser.lastName[0]}`;
    }
    if (typedUser?.firstName) {
      return typedUser.firstName[0];
    }
    if (typedUser?.email) {
      return typedUser.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <header className="bg-card border-b border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-lg text-card-foreground" data-testid="page-title">{config.title}</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1 status-pulse"></div>
              LLM Ready
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" data-testid="button-export">
            <i className="fas fa-download w-3 h-3 mr-2"></i>
            Export
          </Button>
          
          <Button variant="ghost" size="sm" data-testid="button-history">
            <i className="fas fa-history w-3 h-3 mr-2"></i>
            History
          </Button>
          
          <div className="h-4 w-px bg-border"></div>
          
          <Button size="sm" data-testid="button-new">
            <i className="fas fa-plus w-3 h-3 mr-2"></i>
            New
          </Button>
          
          <div className="h-4 w-px bg-border"></div>
          
          {/* User Profile Section */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 p-2" data-testid="button-user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={typedUser?.profileImageUrl || undefined} alt={getUserDisplayName()} />
                  <AvatarFallback className="text-sm">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block text-sm font-medium" data-testid="text-username">
                  {getUserDisplayName()}
                </span>
                <i className="fas fa-chevron-down text-xs"></i>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm font-medium" data-testid="text-user-email">
                {typedUser?.email || "No email"}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = "/settings"}>
                <i className="fas fa-cog mr-2"></i>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                <i className="fas fa-sign-out-alt mr-2"></i>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
