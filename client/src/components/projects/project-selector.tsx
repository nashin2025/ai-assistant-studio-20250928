import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Folder, Settings, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'completed';
  createdAt: number;
  updatedAt: number;
}

interface ProjectSelectorProps {
  selectedProjectId?: string;
  onProjectChange: (projectId: string | null) => void;
  showCreateButton?: boolean;
}

export function ProjectSelector({ 
  selectedProjectId, 
  onProjectChange, 
  showCreateButton = true 
}: ProjectSelectorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/projects");
      return response.json();
    },
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: { name: string; description?: string }) => {
      const response = await apiRequest("POST", "/api/projects", projectData);
      return response.json();
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      onProjectChange(newProject.id);
      setIsCreateDialogOpen(false);
      setNewProject({ name: "", description: "" });
      toast({
        title: "Project created",
        description: `"${newProject.name}" has been created successfully.`,
      });
    },
    onError: (error) => {
      console.error("Failed to create project:", error);
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateProject = () => {
    if (!newProject.name.trim()) return;
    createProjectMutation.mutate(newProject);
  };

  const getProjectIcon = (status: string) => {
    switch (status) {
      case 'archived':
        return <Archive className="h-4 w-4 text-gray-500" />;
      case 'completed':
        return <Settings className="h-4 w-4 text-green-500" />;
      default:
        return <Folder className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="flex items-center gap-2" data-testid="project-selector">
      <Select 
        value={selectedProjectId || "all"} 
        onValueChange={(value) => onProjectChange(value === "all" ? null : value)}
      >
        <SelectTrigger className="w-[250px]" data-testid="select-project">
          <SelectValue placeholder="Select project..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" data-testid="option-all-projects">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-gray-500" />
              All Projects
            </div>
          </SelectItem>
          {projects.map((project: Project) => (
            <SelectItem key={project.id} value={project.id} data-testid={`option-project-${project.id}`}>
              <div className="flex items-center gap-2">
                {getProjectIcon(project.status)}
                <span>{project.name}</span>
                {project.status !== 'active' && (
                  <span className="text-xs text-gray-500 ml-1">({project.status})</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showCreateButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCreateDialogOpen(true)}
          data-testid="button-create-project"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a new project to organize your files and conversations.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                placeholder="Project name"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                className="col-span-3"
                data-testid="input-project-name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Optional description"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                className="col-span-3"
                rows={3}
                data-testid="input-project-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProject}
              disabled={!newProject.name.trim() || createProjectMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createProjectMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}