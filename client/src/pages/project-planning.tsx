import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema, type Project } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import ProjectVersions from "@/components/project-versions";

const projectFormSchema = insertProjectSchema.extend({
  techStack: z.string().optional(),
  features: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

export default function ProjectPlanning() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = "default-user";

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["/api/projects", { userId }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/projects?userId=${userId}`);
      return response.json();
    },
  });

  const { data: githubRepos = [] } = useQuery({
    queryKey: ["/api/github/repositories"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/github/repositories");
        return response.json();
      } catch (error) {
        return [];
      }
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const metadata = {
        techStack: data.techStack?.split(',').map(s => s.trim()).filter(Boolean) || [],
        features: data.features?.split(',').map(s => s.trim()).filter(Boolean) || [],
      };

      const response = await apiRequest("POST", "/api/projects", {
        ...data,
        userId,
        metadata,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowCreateDialog(false);
      toast({
        title: "Project Created",
        description: "Your project has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const analyzeProjectMutation = useMutation({
    mutationFn: async (githubUrl: string) => {
      const urlParts = githubUrl.replace('https://github.com/', '').split('/');
      if (urlParts.length !== 2) throw new Error("Invalid GitHub URL");
      
      const [owner, repo] = urlParts;
      const response = await apiRequest("GET", `/api/github/repositories/${owner}/${repo}/analyze`);
      return response.json();
    },
    onSuccess: (analysis) => {
      setSelectedProject(prev => prev ? {
        ...prev,
        metadata: { ...prev.metadata, analysis }
      } : null);
      toast({
        title: "Analysis Complete",
        description: "Project analysis has been completed.",
      });
    },
  });

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      githubUrl: "",
      status: "active",
      techStack: "",
      features: "",
    },
  });

  const onSubmit = (data: ProjectFormData) => {
    createProjectMutation.mutate(data);
  };

  const handleAnalyzeProject = (project: Project) => {
    if (project.githubUrl) {
      analyzeProjectMutation.mutate(project.githubUrl);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project Planning</h1>
          <p className="text-muted-foreground">Manage your software projects and architecture</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-project">
              <i className="fas fa-plus mr-2"></i>
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Add a new project to your workspace for planning and analysis.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Awesome Project" {...field} data-testid="input-project-name" />
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe your project..." {...field} data-testid="input-project-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="githubUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GitHub URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://github.com/username/repo" {...field} data-testid="input-github-url" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="techStack"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tech Stack (comma-separated)</FormLabel>
                        <FormControl>
                          <Input placeholder="React, Node.js, TypeScript" {...field} data-testid="input-tech-stack" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="features"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Features (comma-separated)</FormLabel>
                        <FormControl>
                          <Input placeholder="Authentication, API, Dashboard" {...field} data-testid="input-features" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-project-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createProjectMutation.isPending} data-testid="button-save-project">
                    {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* GitHub Integration */}
      {githubRepos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <i className="fab fa-github"></i>
              GitHub Repositories
            </CardTitle>
            <CardDescription>
              Import projects from your GitHub repositories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {githubRepos.slice(0, 6).map((repo: any) => (
                <Card key={repo.id} className="hover:bg-accent transition-colors cursor-pointer" data-testid={`github-repo-${repo.name}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm">{repo.name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {repo.language || "Unknown"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {repo.description || "No description available"}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <i className="fas fa-star"></i>
                        {repo.stars}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => form.setValue("githubUrl", repo.url)}
                        data-testid={`button-import-${repo.name}`}
                      >
                        Import
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project: Project) => (
          <Card key={project.id} className="hover:bg-accent transition-colors cursor-pointer" onClick={() => setSelectedProject(project)} data-testid={`project-card-${project.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{project.name}</CardTitle>
                <Badge variant={project.status === "active" ? "default" : project.status === "completed" ? "secondary" : "outline"}>
                  {project.status}
                </Badge>
              </div>
              <CardDescription className="line-clamp-2">
                {project.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {project.metadata?.techStack && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Tech Stack</p>
                    <div className="flex flex-wrap gap-1">
                      {project.metadata.techStack.slice(0, 3).map((tech: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                      {project.metadata.techStack.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{project.metadata.techStack.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    Updated {new Date(project.updatedAt!).toLocaleDateString()}
                  </span>
                  <div className="flex gap-1">
                    {project.githubUrl && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(project.githubUrl!, "_blank");
                        }}
                        data-testid={`button-github-${project.id}`}
                      >
                        <i className="fab fa-github text-xs"></i>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyzeProject(project);
                      }}
                      disabled={analyzeProjectMutation.isPending}
                      data-testid={`button-analyze-${project.id}`}
                    >
                      <i className="fas fa-chart-line text-xs"></i>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-project-diagram text-muted-foreground text-xl"></i>
            </div>
            <h3 className="text-lg font-medium mb-2">No Projects Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first project to start planning and organizing your development work.
            </p>
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-first-project">
              <i className="fas fa-plus mr-2"></i>
              Create Your First Project
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Project Details Modal */}
      {selectedProject && (
        <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedProject.name}
                <Badge variant={selectedProject.status === "active" ? "default" : selectedProject.status === "completed" ? "secondary" : "outline"}>
                  {selectedProject.status}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Project details and analysis
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{selectedProject.description}</p>
              </div>

              {selectedProject.metadata?.techStack && (
                <div>
                  <h4 className="font-medium mb-2">Technology Stack</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.metadata.techStack.map((tech: string, index: number) => (
                      <Badge key={index} variant="outline">{tech}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedProject.metadata?.features && (
                <div>
                  <h4 className="font-medium mb-2">Features</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.metadata.features.map((feature: string, index: number) => (
                      <Badge key={index} variant="secondary">{feature}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedProject.metadata?.analysis && (
                <div>
                  <h4 className="font-medium mb-2">Code Analysis</h4>
                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{selectedProject.metadata.analysis.files?.length || 0}</p>
                          <p className="text-xs text-muted-foreground">Files</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{Object.keys(selectedProject.metadata.analysis.languages || {}).length}</p>
                          <p className="text-xs text-muted-foreground">Languages</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{selectedProject.metadata.analysis.structure?.directories?.length || 0}</p>
                          <p className="text-xs text-muted-foreground">Directories</p>
                        </div>
                        <div className="text-center">
                          <Badge variant={
                            selectedProject.metadata.analysis.complexity === "low" ? "secondary" :
                            selectedProject.metadata.analysis.complexity === "medium" ? "default" : "destructive"
                          }>
                            {selectedProject.metadata.analysis.complexity} complexity
                          </Badge>
                        </div>
                      </div>
                      
                      {selectedProject.metadata.analysis.suggestions && (
                        <div>
                          <h5 className="font-medium mb-2">Suggestions</h5>
                          <ul className="text-sm space-y-1">
                            {selectedProject.metadata.analysis.suggestions.map((suggestion: string, index: number) => (
                              <li key={index} className="flex items-start gap-2">
                                <i className="fas fa-lightbulb text-primary text-xs mt-0.5"></i>
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Project Plan Versions */}
              <ProjectVersions project={selectedProject} />

              <div className="flex justify-between">
                <div className="text-sm text-muted-foreground">
                  <p>Created: {new Date(selectedProject.createdAt!).toLocaleDateString()}</p>
                  <p>Updated: {new Date(selectedProject.updatedAt!).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  {selectedProject.githubUrl && (
                    <Button variant="outline" onClick={() => window.open(selectedProject.githubUrl!, "_blank")} data-testid="button-view-github">
                      <i className="fab fa-github mr-2"></i>
                      View on GitHub
                    </Button>
                  )}
                  <Button onClick={() => handleAnalyzeProject(selectedProject)} disabled={analyzeProjectMutation.isPending} data-testid="button-analyze-project">
                    <i className="fas fa-chart-line mr-2"></i>
                    {analyzeProjectMutation.isPending ? "Analyzing..." : "Analyze Project"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
