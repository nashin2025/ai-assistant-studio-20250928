import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "Chat Assistant",
    href: "/",
    icon: "fas fa-comments",
  },
  {
    name: "Project Planning",
    href: "/project-planning",
    icon: "fas fa-project-diagram",
  },
  {
    name: "Project Templates",
    href: "/project-templates",
    icon: "fas fa-layer-group",
  },
  {
    name: "Code Analysis",
    href: "/code-analysis",
    icon: "fas fa-code",
  },
  {
    name: "Web Search",
    href: "/web-search",
    icon: "fas fa-search",
  },
  {
    name: "Document Analysis",
    href: "/document-analysis",
    icon: "fas fa-file-alt",
  },
  {
    name: "Integrations",
    href: "/integrations",
    icon: "fas fa-plug",
  },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-16 lg:w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* App Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-robot text-sidebar-primary-foreground text-sm"></i>
          </div>
          <div className="hidden lg:block">
            <h1 className="font-semibold text-sm text-sidebar-foreground">AI Assistant Studio</h1>
            <p className="text-xs text-muted-foreground">Professional AI Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-2">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <i className={`${item.icon} w-4`}></i>
                <span className="hidden lg:block">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Configuration & Settings */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        <Link 
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-sm w-full"
          data-testid="nav-settings"
        >
          <i className="fas fa-cog w-4"></i>
          <span className="hidden lg:block">Settings</span>
        </Link>
        
        {/* LLM Status Indicator */}
        <div className="flex items-center gap-3 px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full status-pulse"></div>
            <span className="hidden lg:block text-muted-foreground">Ollama Connected</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
