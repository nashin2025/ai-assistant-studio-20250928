import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileIcon, Upload, Search, Grid, List, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectSelector } from "@/components/projects/project-selector";
// Remove unused import - we'll use our own file display logic
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/use-file-upload";

interface File {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  projectId?: string;
  createdAt: number;
  analysis?: any;
}

export function EnhancedFileManager() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size" | "type">("date");
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();
  const { uploadFiles, isUploading } = useFileUpload();

  // Fetch files with project filtering
  const { data: files = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/files", selectedProjectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedProjectId) {
        params.append('projectId', selectedProjectId);
      }
      const response = await fetch(`/api/files?${params}`);
      if (!response.ok) throw new Error('Failed to fetch files');
      return response.json();
    },
  });

  // Fetch projects for statistics
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
  });

  // Filter and sort files
  const filteredFiles = files
    .filter((file: File) => {
      const matchesSearch = file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           file.originalName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === "all" || 
                         (filterType === "images" && file.mimeType.startsWith("image/")) ||
                         (filterType === "documents" && (file.mimeType.includes("pdf") || file.mimeType.includes("text"))) ||
                         (filterType === "code" && (file.mimeType.includes("javascript") || file.mimeType.includes("python") || file.filename.match(/\.(js|ts|py|html|css|json)$/)));
      return matchesSearch && matchesType;
    })
    .sort((a: File, b: File) => {
      switch (sortBy) {
        case "name":
          return a.filename.localeCompare(b.filename);
        case "size":
          return b.size - a.size;
        case "type":
          return a.mimeType.localeCompare(b.mimeType);
        case "date":
        default:
          return b.createdAt - a.createdAt;
      }
    });

  const handleFileUpload = async (uploadedFiles: FileList) => {
    if (uploadedFiles.length === 0) return;
    
    try {
      const formData = new FormData();
      Array.from(uploadedFiles).forEach(file => {
        formData.append('file', file);
      });
      
      if (selectedProjectId) {
        formData.append('projectId', selectedProjectId);
      }
      
      await uploadFiles(uploadedFiles);
      refetch();
      toast({
        title: "Files uploaded",
        description: `${uploadedFiles.length} file(s) uploaded successfully.`,
      });
    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('javascript') || mimeType.includes('json')) return '📜';
    if (mimeType.includes('python')) return '🐍';
    if (mimeType.includes('text')) return '📝';
    return '📁';
  };

  const stats = {
    totalFiles: files.length,
    totalSize: files.reduce((acc: number, file: File) => acc + file.size, 0),
    imageFiles: files.filter((f: File) => f.mimeType.startsWith('image/')).length,
    codeFiles: files.filter((f: File) => f.filename.match(/\.(js|ts|py|html|css|json)$/)).length,
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">File Manager</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              data-testid="toggle-view-mode"
            >
              {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            <Button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files) handleFileUpload(files);
                };
                input.click();
              }}
              data-testid="button-upload-files"
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload Files"}
            </Button>
          </div>
        </div>

        {/* Project Selector */}
        <div className="mb-4">
          <ProjectSelector
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
            showCreateButton={true}
          />
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-files"
            />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="images">Images</SelectItem>
              <SelectItem value="documents">Documents</SelectItem>
              <SelectItem value="code">Code Files</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="size">Sort by Size</SelectItem>
              <SelectItem value="type">Sort by Type</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFiles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.imageFiles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Code Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.codeFiles}</div>
          </CardContent>
        </Card>
      </div>

      {/* File List */}
      <div className="flex-1 p-4">
        <Tabs defaultValue="files" className="h-full">
          <TabsList>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="tree">Tree View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="files" className="h-full">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8">Loading files...</div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery || filterType !== "all" ? "No files match your filters" : "No files yet"}
                </div>
              ) : (
                filteredFiles.map((file: File) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    data-testid={`file-item-${file.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getFileTypeIcon(file.mimeType)}</span>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {file.originalName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatFileSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{file.mimeType.split('/')[0]}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="tree" className="h-full">
            <div className="space-y-2">
              {filteredFiles.map((file: File) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  data-testid={`tree-file-${file.id}`}
                >
                  <span className="text-lg">{getFileTypeIcon(file.mimeType)}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{file.originalName}</span>
                </div>
              ))}
              {filteredFiles.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No files to display
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}