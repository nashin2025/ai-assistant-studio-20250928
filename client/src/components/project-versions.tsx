import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { ProjectPlanVersion, Project } from "@shared/schema";

interface ProjectVersionsProps {
  project: Project;
}

interface VersionFormData {
  title: string;
  description: string;
  notes: string;
  status: 'draft' | 'active' | 'archived';
}

const statusColors = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  active: "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-300",
  archived: "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-300"
};

export default function ProjectVersions({ project }: ProjectVersionsProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ProjectPlanVersion | null>(null);
  const [editingVersion, setEditingVersion] = useState<ProjectPlanVersion | null>(null);
  const [formData, setFormData] = useState<VersionFormData>({
    title: "",
    description: "",
    notes: "",
    status: "draft"
  });
  const { toast } = useToast();

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["/api/projects", project.id, "versions"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/projects/${project.id}/versions`);
      return response.json();
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: async (data: VersionFormData) => {
      // Server assigns version number to prevent race conditions
      const response = await apiRequest("POST", `/api/projects/${project.id}/versions`, {
        title: data.title,
        description: data.description,
        notes: data.notes,
        status: data.status,
        goals: [],
        requirements: [],
        architecture: "",
        techStack: [],
        timeline: "",
        resources: [],
        risks: [],
        changeLog: ""
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "versions"] });
      setShowCreateDialog(false);
      setFormData({
        title: "",
        description: "",
        notes: "",
        status: "draft"
      });
      toast({
        title: "Version Created",
        description: "New project plan version has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project plan version. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateVersionMutation = useMutation({
    mutationFn: async ({ versionId, data }: { versionId: string; data: VersionFormData }) => {
      const response = await apiRequest("PATCH", `/api/projects/${project.id}/versions/${versionId}`, {
        title: data.title,
        description: data.description,
        notes: data.notes,
        status: data.status
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "versions"] });
      setShowEditDialog(false);
      setEditingVersion(null);
      toast({
        title: "Version Updated",
        description: "Project plan version has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project plan version. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteVersionMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const response = await apiRequest("DELETE", `/api/projects/${project.id}/versions/${versionId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", project.id, "versions"] });
      toast({
        title: "Version Deleted",
        description: "Project plan version has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project plan version. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateVersion = () => {
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in the version title.",
        variant: "destructive",
      });
      return;
    }
    createVersionMutation.mutate(formData);
  };

  const handleEditVersion = (version: ProjectPlanVersion) => {
    setEditingVersion(version);
    setFormData({
      title: version.title || "",
      description: version.description || "",
      notes: version.notes || "",
      status: (version.status as 'draft' | 'active' | 'archived') || "draft"
    });
    setShowEditDialog(true);
  };

  const handleUpdateVersion = () => {
    if (!formData.title.trim() || !editingVersion) {
      toast({
        title: "Validation Error",
        description: "Please fill in the version title.",
        variant: "destructive",
      });
      return;
    }
    updateVersionMutation.mutate({ versionId: editingVersion.id, data: formData });
  };

  const handleDeleteVersion = (versionId: string) => {
    if (confirm("Are you sure you want to delete this version? This action cannot be undone.")) {
      deleteVersionMutation.mutate(versionId);
    }
  };

  const formatChangeLog = (changeLog: string | null) => {
    if (!changeLog || changeLog.trim().length === 0) return "No changes recorded";
    return changeLog;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Plan Versions</CardTitle>
          <CardDescription>Loading version history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <i className="fas fa-spinner fa-spin text-muted-foreground"></i>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Project Plan Versions</CardTitle>
            <CardDescription>Track iterations and changes to your project plan</CardDescription>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-version">
                <i className="fas fa-plus mr-2"></i>
                New Version
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Project Plan Version</DialogTitle>
                <DialogDescription>
                  Create a new version of your project plan to track changes and iterations.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Version Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Initial MVP, Enhanced UI, Performance Improvements"
                    data-testid="input-version-title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what's new or changed in this version..."
                    rows={3}
                    data-testid="textarea-version-description"
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes or details for this version..."
                    rows={4}
                    data-testid="textarea-version-notes"
                  />
                </div>
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status}
                    onValueChange={(value: 'draft' | 'active' | 'archived') => 
                      setFormData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger data-testid="select-version-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  data-testid="button-cancel-version"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateVersion}
                  disabled={createVersionMutation.isPending}
                  data-testid="button-save-version"
                >
                  {createVersionMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i>
                      Create Version
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Version Dialog */}
          <Dialog open={showEditDialog} onOpenChange={(open) => {
            setShowEditDialog(open);
            if (!open) {
              setEditingVersion(null);
              setFormData({
                title: "",
                description: "",
                notes: "",
                status: "draft"
              });
            }
          }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Project Plan Version</DialogTitle>
                <DialogDescription>
                  Update the details of this project plan version.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Version Title *</Label>
                  <Input
                    id="edit-title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Initial MVP, Enhanced UI, Performance Improvements"
                    data-testid="input-edit-version-title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what's new or changed in this version..."
                    rows={3}
                    data-testid="textarea-edit-version-description"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes or details for this version..."
                    rows={4}
                    data-testid="textarea-edit-version-notes"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select 
                    value={formData.status}
                    onValueChange={(value: 'draft' | 'active' | 'archived') => 
                      setFormData(prev => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger data-testid="select-edit-version-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditDialog(false)}
                  data-testid="button-cancel-edit-version"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateVersion}
                  disabled={updateVersionMutation.isPending}
                  data-testid="button-update-version"
                >
                  {updateVersionMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i>
                      Update Version
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-code-branch text-4xl text-muted-foreground mb-4"></i>
            <h3 className="text-lg font-medium text-foreground mb-2">No Versions Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first project plan version to start tracking changes and iterations.
            </p>
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-first-version">
              <i className="fas fa-plus mr-2"></i>
              Create First Version
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {versions.map((version: ProjectPlanVersion) => (
                <Card key={version.id} className="border border-muted">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-foreground" data-testid={`text-version-title-${version.id}`}>
                            v{version.version}: {version.title}
                          </h4>
                          <Badge 
                            className={statusColors[version.status as keyof typeof statusColors] || statusColors.draft}
                            data-testid={`badge-version-status-${version.id}`}
                          >
                            {version.status}
                          </Badge>
                        </div>
                        
                        {version.description && (
                          <p className="text-sm text-muted-foreground mb-2" data-testid={`text-version-description-${version.id}`}>
                            {version.description}
                          </p>
                        )}
                        
                        <div className="text-xs text-muted-foreground mb-2">
                          <i className="fas fa-calendar mr-1"></i>
                          Created {version.createdAt ? formatDistanceToNow(new Date(version.createdAt)) : 'unknown time'} ago
                        </div>
                        
                        {version.changeLog && version.changeLog.trim().length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <i className="fas fa-list mr-1"></i>
                            Changes: {formatChangeLog(version.changeLog)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedVersion(version)}
                          data-testid={`button-view-version-${version.id}`}
                        >
                          <i className="fas fa-eye"></i>
                        </Button>
                        <Button
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditVersion(version)}
                          data-testid={`button-edit-version-${version.id}`}
                        >
                          <i className="fas fa-edit"></i>
                        </Button>
                        <Button
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteVersion(version.id)}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-delete-version-${version.id}`}
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Version Details Dialog */}
      <Dialog open={!!selectedVersion} onOpenChange={(open) => !open && setSelectedVersion(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Version {selectedVersion?.version}: {selectedVersion?.title}
            </DialogTitle>
            <DialogDescription>
              Created {selectedVersion?.createdAt ? formatDistanceToNow(new Date(selectedVersion.createdAt)) : 'unknown time'} ago
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {selectedVersion?.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedVersion.description}
                  </p>
                </div>
              )}
              
              {selectedVersion?.changeLog && selectedVersion.changeLog.trim().length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Change Log</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedVersion.changeLog}
                  </p>
                </div>
              )}
              
              {selectedVersion?.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notes</h4>
                  <pre className="text-sm bg-muted p-4 rounded-md whitespace-pre-wrap">
                    {selectedVersion.notes}
                  </pre>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button onClick={() => setSelectedVersion(null)} data-testid="button-close-version-details">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}