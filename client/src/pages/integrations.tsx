import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  private: boolean;
  updatedAt: string;
}

const createRepoSchema = z.object({
  name: z.string().min(1, "Repository name is required"),
  description: z.string().optional(),
  private: z.boolean().default(false),
});

type CreateRepoFormData = z.infer<typeof createRepoSchema>;

export default function Integrations() {
  const [showCreateRepo, setShowCreateRepo] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: githubRepos = [], isLoading: isLoadingRepos, error: reposError } = useQuery({
    queryKey: ["/api/github/repositories"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/github/repositories");
      return response.json();
    },
    retry: false,
  });

  const createRepoMutation = useMutation({
    mutationFn: async (data: CreateRepoFormData) => {
      const response = await apiRequest("POST", "/api/github/repositories", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/github/repositories"] });
      setShowCreateRepo(false);
      toast({
        title: "Repository Created",
        description: "Your GitHub repository has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create repository",
        variant: "destructive",
      });
    },
  });

  const form = useForm<CreateRepoFormData>({
    resolver: zodResolver(createRepoSchema),
    defaultValues: {
      name: "",
      description: "",
      private: false,
    },
  });

  const onSubmit = (data: CreateRepoFormData) => {
    createRepoMutation.mutate(data);
  };

  const integrationCards = [
    {
      name: "GitHub",
      description: "Connect your GitHub repositories for code analysis and project management",
      icon: "fab fa-github",
      status: reposError ? "disconnected" : "connected",
      color: "text-gray-900 dark:text-gray-100",
      bgColor: "bg-gray-100 dark:bg-gray-800",
    },
    {
      name: "Google Search",
      description: "Enhanced web search capabilities with Google's search API",
      icon: "fab fa-google",
      status: "configured",
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      name: "Bing Search",
      description: "Microsoft Bing search integration for comprehensive results",
      icon: "fas fa-search",
      status: "configured",
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      name: "OpenAI",
      description: "Connect to OpenAI's GPT models for enhanced AI capabilities",
      icon: "fas fa-brain",
      status: "available",
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      name: "Anthropic Claude",
      description: "Integration with Anthropic's Claude AI models",
      icon: "fas fa-robot",
      status: "available",
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
    {
      name: "Slack",
      description: "Send notifications and updates to Slack channels",
      icon: "fab fa-slack",
      status: "available",
      color: "text-green-500",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      name: "Discord",
      description: "Connect with Discord for team collaboration and notifications",
      icon: "fab fa-discord",
      status: "available",
      color: "text-indigo-500",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/20",
    },
    {
      name: "Jira",
      description: "Integrate with Jira for project management and issue tracking",
      icon: "fab fa-atlassian",
      status: "available",
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Connected</Badge>;
      case "configured":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Configured</Badge>;
      case "disconnected":
        return <Badge variant="destructive">Disconnected</Badge>;
      default:
        return <Badge variant="outline">Available</Badge>;
    }
  };

  if (isLoadingRepos) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
        <p className="text-muted-foreground">Connect external services and APIs to enhance your AI assistant</p>
      </div>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="services" data-testid="tab-services">Services</TabsTrigger>
          <TabsTrigger value="github" data-testid="tab-github">GitHub</TabsTrigger>
          <TabsTrigger value="webhooks" data-testid="tab-webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrationCards.map((integration) => (
              <Card key={integration.name} className="hover:bg-accent transition-colors" data-testid={`integration-${integration.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${integration.bgColor}`}>
                        <i className={`${integration.icon} ${integration.color} text-lg`}></i>
                      </div>
                      <div>
                        <CardTitle className="text-base">{integration.name}</CardTitle>
                        {getStatusBadge(integration.status)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-sm mb-4">
                    {integration.description}
                  </CardDescription>
                  <div className="flex justify-between items-center">
                    {integration.status === "connected" || integration.status === "configured" ? (
                      <Button variant="outline" size="sm" data-testid={`button-configure-${integration.name.toLowerCase()}`}>
                        <i className="fas fa-cog mr-2"></i>
                        Configure
                      </Button>
                    ) : integration.status === "disconnected" ? (
                      <Button variant="outline" size="sm" data-testid={`button-reconnect-${integration.name.toLowerCase()}`}>
                        <i className="fas fa-plug mr-2"></i>
                        Reconnect
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" data-testid={`button-connect-${integration.name.toLowerCase()}`}>
                        <i className="fas fa-plus mr-2"></i>
                        Connect
                      </Button>
                    )}
                    <Switch 
                      checked={integration.status === "connected" || integration.status === "configured"}
                      disabled={integration.status === "available" || integration.status === "disconnected"}
                      data-testid={`toggle-${integration.name.toLowerCase()}`}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="github" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">GitHub Integration</h2>
              <p className="text-muted-foreground">Manage your GitHub repositories and create new ones</p>
            </div>
            {!reposError && (
              <Dialog open={showCreateRepo} onOpenChange={setShowCreateRepo}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-repo">
                    <i className="fab fa-github mr-2"></i>
                    Create Repository
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create GitHub Repository</DialogTitle>
                    <DialogDescription>
                      Create a new repository on your GitHub account
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Repository Name</FormLabel>
                            <FormControl>
                              <Input placeholder="my-awesome-project" {...field} data-testid="input-repo-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="A brief description of your project" {...field} data-testid="input-repo-description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="private"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <FormLabel>Private Repository</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="toggle-private-repo"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowCreateRepo(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createRepoMutation.isPending} data-testid="button-create-repo-submit">
                          {createRepoMutation.isPending ? "Creating..." : "Create Repository"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {reposError ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                  <i className="fas fa-exclamation-triangle text-destructive text-xl"></i>
                </div>
                <h3 className="text-lg font-medium mb-2">GitHub Not Connected</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Connect your GitHub account to manage repositories and analyze code.
                </p>
                <Button variant="outline" data-testid="button-connect-github">
                  <i className="fab fa-github mr-2"></i>
                  Connect GitHub
                </Button>
              </CardContent>
            </Card>
          ) : githubRepos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <i className="fab fa-github text-muted-foreground text-xl"></i>
                </div>
                <h3 className="text-lg font-medium mb-2">No Repositories Found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  You don't have any repositories yet. Create your first one to get started.
                </p>
                <Button onClick={() => setShowCreateRepo(true)} data-testid="button-create-first-repo">
                  <i className="fab fa-github mr-2"></i>
                  Create Your First Repository
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {githubRepos.map((repo: GitHubRepository) => (
                <Card key={repo.id} className="hover:bg-accent transition-colors" data-testid={`github-repo-${repo.name}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {repo.name}
                          {repo.private && <i className="fas fa-lock text-muted-foreground text-xs"></i>}
                        </CardTitle>
                        <CardDescription className="text-xs">{repo.fullName}</CardDescription>
                      </div>
                      {repo.language && (
                        <Badge variant="outline" className="text-xs">
                          {repo.language}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {repo.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <i className="fas fa-star"></i>
                        {repo.stars}
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="fas fa-code-branch"></i>
                        {repo.forks}
                      </span>
                      <span>{new Date(repo.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(repo.url, "_blank")}
                        data-testid={`button-view-${repo.name}`}
                      >
                        <i className="fas fa-external-link-alt mr-1"></i>
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // This would trigger repository analysis
                          toast({
                            title: "Analysis Started",
                            description: `Analyzing ${repo.name}...`,
                          });
                        }}
                        data-testid={`button-analyze-${repo.name}`}
                      >
                        <i className="fas fa-chart-line mr-1"></i>
                        Analyze
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Endpoints</CardTitle>
              <CardDescription>
                Configure webhooks to receive notifications from external services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">GitHub Webhooks</h4>
                    <p className="text-sm text-muted-foreground">Receive notifications for repository events</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                      https://your-domain.com/api/webhooks/github
                    </code>
                  </div>
                  <Switch data-testid="toggle-github-webhook" />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">CI/CD Webhooks</h4>
                    <p className="text-sm text-muted-foreground">Get notified about build and deployment status</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                      https://your-domain.com/api/webhooks/cicd
                    </code>
                  </div>
                  <Switch data-testid="toggle-cicd-webhook" />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Custom Webhooks</h4>
                    <p className="text-sm text-muted-foreground">General purpose webhook endpoint</p>
                    <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                      https://your-domain.com/api/webhooks/custom
                    </code>
                  </div>
                  <Switch data-testid="toggle-custom-webhook" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook Security</CardTitle>
              <CardDescription>
                Configure security settings for webhook endpoints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook Secret</label>
                <Input
                  type="password"
                  placeholder="Enter webhook secret"
                  data-testid="input-webhook-secret"
                />
                <p className="text-xs text-muted-foreground">
                  Used to verify webhook payload authenticity
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">IP Allowlist</h4>
                  <p className="text-sm text-muted-foreground">Restrict webhook access to specific IP addresses</p>
                </div>
                <Switch data-testid="toggle-ip-allowlist" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Rate Limiting</h4>
                  <p className="text-sm text-muted-foreground">Limit the number of webhook requests per minute</p>
                </div>
                <Switch defaultChecked data-testid="toggle-rate-limiting" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
