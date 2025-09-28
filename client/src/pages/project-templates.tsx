import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { ProjectTemplate } from "@shared/schema";

const categories = [
  { value: "web", label: "Web Apps", icon: "fas fa-globe" },
  { value: "api", label: "API Services", icon: "fas fa-server" },
  { value: "mobile", label: "Mobile Apps", icon: "fas fa-mobile-alt" },
  { value: "desktop", label: "Desktop Apps", icon: "fas fa-desktop" },
  { value: "ml", label: "ML/AI", icon: "fas fa-brain" },
  { value: "blockchain", label: "Blockchain", icon: "fas fa-link" }
];

const difficultyColors = {
  beginner: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
};

export default function ProjectTemplates() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["/api/project-templates", selectedCategory],
    queryFn: async () => {
      const params = selectedCategory !== "all" ? `?category=${selectedCategory}` : "";
      const response = await apiRequest("GET", `/api/project-templates${params}`);
      return response.json();
    },
  });

  const generateProjectMutation = useMutation({
    mutationFn: async ({ templateId, name, description }: { templateId: string; name: string; description: string }) => {
      const response = await apiRequest("POST", `/api/project-templates/${templateId}/generate`, {
        projectName: name,
        description
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Project Generated!",
        description: (
          <div className="space-y-2">
            <p>{data.message}</p>
            <a 
              href={data.downloadUrl} 
              className="inline-block mt-2 px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 transition-colors"
              download
            >
              <i className="fas fa-download mr-2"></i>
              Download Project
            </a>
          </div>
        ),
        duration: 10000
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowGenerateDialog(false);
      setProjectName("");
      setProjectDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate project from template",
        variant: "destructive"
      });
    }
  });

  const handleGenerateProject = () => {
    if (!selectedTemplate) return;
    
    generateProjectMutation.mutate({
      templateId: selectedTemplate.id,
      name: projectName || selectedTemplate.name,
      description: projectDescription || selectedTemplate.description
    });
  };

  const openGenerateDialog = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    setProjectName(template.name);
    setProjectDescription(template.description);
    setShowGenerateDialog(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Project Templates</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="title-templates">Project Templates</h1>
          <p className="text-muted-foreground mt-1">
            Jumpstart your development with pre-built project templates
          </p>
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger key={category.value} value={category.value} data-testid={`tab-${category.value}`}>
              <i className={`${category.icon} mr-2`}></i>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <i className="fas fa-folder-open text-4xl text-muted-foreground mb-4"></i>
                  <h3 className="text-lg font-semibold mb-2">No Templates Available</h3>
                  <p className="text-muted-foreground">
                    {selectedCategory === "all" 
                      ? "No project templates found. Check back later!"
                      : `No templates found in the ${categories.find(c => c.value === selectedCategory)?.label} category.`
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template: ProjectTemplate) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow" data-testid={`template-${template.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{template.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {template.description}
                        </CardDescription>
                      </div>
                      <Badge className={difficultyColors[template.difficulty as keyof typeof difficultyColors]}>
                        {template.difficulty}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Tech Stack</h4>
                      <div className="flex flex-wrap gap-1">
                        {[
                          ...(template.techStack as any)?.frontend || [],
                          ...(template.techStack as any)?.backend || [],
                          ...(template.techStack as any)?.database || []
                        ].slice(0, 4).map((tech: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                        {([
                          ...(template.techStack as any)?.frontend || [],
                          ...(template.techStack as any)?.backend || [],
                          ...(template.techStack as any)?.database || []
                        ].length > 4) && (
                          <Badge variant="outline" className="text-xs">
                            +{([
                              ...(template.techStack as any)?.frontend || [],
                              ...(template.techStack as any)?.backend || [],
                              ...(template.techStack as any)?.database || []
                            ].length - 4)} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {template.estimatedTime && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <i className="fas fa-clock mr-2"></i>
                        {template.estimatedTime}
                      </div>
                    )}

                    <Button 
                      onClick={() => openGenerateDialog(template)} 
                      className="w-full"
                      data-testid={`generate-${template.id}`}
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Generate Project
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Generate Project</DialogTitle>
            <DialogDescription>
              Create a new project based on the {selectedTemplate?.name} template
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  data-testid="input-project-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Enter project description"
                  rows={3}
                  data-testid="input-project-description"
                />
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Template Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Files:</span> {(selectedTemplate.files as any[]).length} files
                  </div>
                  {selectedTemplate.estimatedTime && (
                    <div>
                      <span className="font-medium">Setup Time:</span> {selectedTemplate.estimatedTime}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Difficulty:</span> 
                    <Badge className={`ml-2 ${difficultyColors[selectedTemplate.difficulty as keyof typeof difficultyColors]}`}>
                      {selectedTemplate.difficulty}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedTemplate.instructions && (
                <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <i className="fas fa-info-circle mr-2 text-blue-600"></i>
                    Setup Instructions
                  </h4>
                  <ScrollArea className="h-32">
                    <pre className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {selectedTemplate.instructions}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateProject} 
              disabled={!projectName.trim() || generateProjectMutation.isPending}
              data-testid="button-generate-confirm"
            >
              {generateProjectMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Generating...
                </>
              ) : (
                <>
                  <i className="fas fa-rocket mr-2"></i>
                  Generate Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}