import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import ProjectPlanning from "@/pages/project-planning";
import ProjectTemplates from "@/pages/project-templates";
import CodeAnalysis from "@/pages/code-analysis";
import WebSearch from "@/pages/web-search";
import DocumentAnalysis from "@/pages/document-analysis";
import FileManager from "@/pages/file-manager";
import Integrations from "@/pages/integrations";
import Settings from "@/pages/settings";
import MainLayout from "@/components/layout/main-layout";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <i className="fas fa-spinner fa-spin text-4xl text-muted-foreground"></i>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Landing} />
        </>
      ) : (
        <>
          <MainLayout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/project-planning" component={ProjectPlanning} />
              <Route path="/project-templates" component={ProjectTemplates} />
              <Route path="/code-analysis" component={CodeAnalysis} />
              <Route path="/web-search" component={WebSearch} />
              <Route path="/document-analysis" component={DocumentAnalysis} />
              <Route path="/file-manager" component={FileManager} />
              <Route path="/integrations" component={Integrations} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </MainLayout>
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
