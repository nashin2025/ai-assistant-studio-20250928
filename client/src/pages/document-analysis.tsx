import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import FileUploadZone from "@/components/chat/file-upload-zone";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useToast } from "@/hooks/use-toast";
import type { File as FileType } from "@shared/schema";

interface FileAnalysis {
  type: string;
  language?: string;
  lineCount?: number;
  size: number;
  complexity?: 'low' | 'medium' | 'high';
  summary?: string;
  codeMetrics?: {
    functions: number;
    classes: number;
    imports: number;
    comments: number;
  };
}

// Generate dynamic insights based on uploaded files
function generateInsights(files: FileType[]) {
  const insights = [];
  
  if (files.length === 0) {
    return [];
  }
  
  const codeFiles = files.filter(f => (f.analysis as any)?.type === 'code');
  const documentFiles = files.filter(f => (f.analysis as any)?.type === 'document' || (f.analysis as any)?.type === 'text');
  const highComplexityFiles = files.filter(f => (f.analysis as any)?.complexity === 'high');
  const lowCommentFiles = codeFiles.filter(f => {
    const metrics = (f.analysis as any)?.codeMetrics;
    if (!metrics) return false;
    const commentRatio = metrics.comments / Math.max((f.analysis as any)?.lineCount || 1, 1);
    return commentRatio < 0.1;
  });
  
  // Code organization insights
  if (codeFiles.length > 5) {
    insights.push({
      title: "Code Organization",
      description: `You have ${codeFiles.length} code files. Consider organizing them into logical directories for better maintainability.`,
      icon: "fas fa-folder-tree text-blue-500",
      color: "bg-blue-500/10 border-blue-500/20"
    });
  }
  
  // Complexity warnings
  if (highComplexityFiles.length > 0) {
    insights.push({
      title: "High Complexity Files",
      description: `${highComplexityFiles.length} files have high complexity. Consider refactoring large functions into smaller, focused ones.`,
      icon: "fas fa-exclamation-triangle text-yellow-500",
      color: "bg-yellow-500/10 border-yellow-500/20"
    });
  }
  
  // Documentation suggestions
  if (lowCommentFiles.length > 0) {
    insights.push({
      title: "Documentation Needed",
      description: `${lowCommentFiles.length} code files have minimal comments. Adding documentation will improve maintainability.`,
      icon: "fas fa-file-text text-orange-500",
      color: "bg-orange-500/10 border-orange-500/20"
    });
  }
  
  // README suggestion
  if (files.length > 0 && !files.some(f => f.originalName.toLowerCase().includes('readme'))) {
    insights.push({
      title: "Missing README",
      description: "Consider adding a README file to document your project's purpose, setup instructions, and usage.",
      icon: "fas fa-info-circle text-indigo-500",
      color: "bg-indigo-500/10 border-indigo-500/20"
    });
  }
  
  // Positive feedback
  if (codeFiles.length > 0 && highComplexityFiles.length === 0) {
    insights.push({
      title: "Good Code Structure",
      description: "Your code files show good complexity levels. Keep maintaining this clean structure!",
      icon: "fas fa-check-circle text-green-500",
      color: "bg-green-500/10 border-green-500/20"
    });
  }
  
  // Language diversity
  const languages = new Set(codeFiles.map(f => f.analysis?.language).filter(Boolean));
  if (languages.size > 3) {
    insights.push({
      title: "Multi-Language Project",
      description: `Your project uses ${languages.size} different languages. Ensure consistent coding standards across all languages.`,
      icon: "fas fa-globe text-purple-500",
      color: "bg-purple-500/10 border-purple-500/20"
    });
  }
  
  return insights;
}

export default function DocumentAnalysis() {
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const { toast } = useToast();
  const userId = "demo-user";

  const { uploadFile, isUploading } = useFileUpload();

  const { data: files = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/files", { userId }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/files?userId=${userId}`);
      return response.json();
    },
  });

  const handleFileUpload = async (uploadedFiles: File[]) => {
    try {
      for (const file of uploadedFiles) {
        await uploadFile(file);
      }
      await refetch();
      setShowUploadZone(false);
      toast({
        title: "Files Uploaded",
        description: `${uploadedFiles.length} file(s) uploaded and analyzed successfully.`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewFile = async (file: FileType) => {
    setSelectedFile(file);
    try {
      const response = await fetch(`/api/files/${file.id}/content`);
      if (response.ok) {
        const content = await response.text();
        setFileContent(content);
      }
    } catch (error) {
      console.error("Error fetching file content:", error);
      setFileContent(null);
    }
  };

  const getFileIcon = (mimeType: string, fileName: string) => {
    if (mimeType.startsWith('image/')) return 'fas fa-image';
    if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
    if (mimeType.includes('word') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) return 'fas fa-file-word';
    if (mimeType.includes('text') || fileName.endsWith('.txt') || fileName.endsWith('.md')) return 'fas fa-file-alt';
    if (fileName.endsWith('.js') || fileName.endsWith('.jsx') || fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return 'fab fa-js-square';
    if (fileName.endsWith('.py')) return 'fab fa-python';
    if (fileName.endsWith('.java')) return 'fab fa-java';
    if (fileName.endsWith('.html')) return 'fab fa-html5';
    if (fileName.endsWith('.css')) return 'fab fa-css3-alt';
    return 'fas fa-file';
  };

  const getComplexityColor = (complexity?: string) => {
    switch (complexity) {
      case 'low': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'high': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
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
          <h1 className="text-2xl font-bold text-foreground">Document Analysis</h1>
          <p className="text-muted-foreground">Upload and analyze various document types</p>
        </div>
        <Button onClick={() => setShowUploadZone(true)} data-testid="button-upload-documents">
          <i className="fas fa-upload mr-2"></i>
          Upload Documents
        </Button>
      </div>

      <Tabs defaultValue="files" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="files" data-testid="tab-files">All Files</TabsTrigger>
          <TabsTrigger value="analysis" data-testid="tab-analysis">Analysis Results</TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-4">
          {files.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <i className="fas fa-file-alt text-muted-foreground text-xl"></i>
                </div>
                <h3 className="text-lg font-medium mb-2">No Documents Uploaded</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Upload your documents to get detailed analysis and insights.
                </p>
                <Button onClick={() => setShowUploadZone(true)} data-testid="button-upload-first">
                  <i className="fas fa-upload mr-2"></i>
                  Upload Your First Document
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file: FileType) => {
                const analysis = file.analysis as FileAnalysis;
                return (
                  <Card
                    key={file.id}
                    className="hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => handleViewFile(file)}
                    data-testid={`file-card-${file.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <i className={`${getFileIcon(file.mimeType, file.originalName)} text-primary`}></i>
                          <CardTitle className="text-sm truncate">{file.originalName}</CardTitle>
                        </div>
                        {analysis?.complexity && (
                          <Badge variant="outline" className={`text-xs ${getComplexityColor(analysis.complexity)}`}>
                            {analysis.complexity}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs">
                        {analysis?.type && (
                          <span className="capitalize">{analysis.type}</span>
                        )}
                        {analysis?.language && (
                          <span> • {analysis.language}</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Size:</span>
                          <span className="font-medium">{formatFileSize(file.size)}</span>
                        </div>
                        {analysis?.lineCount && (
                          <div className="flex justify-between text-xs">
                            <span>Lines:</span>
                            <span className="font-medium">{analysis.lineCount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span>Uploaded:</span>
                          <span className="font-medium">{new Date(file.createdAt!).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      {analysis?.summary && (
                        <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                          {analysis.summary}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">{files.length}</div>
                <div className="text-sm text-muted-foreground">Total Files</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {formatFileSize(files.reduce((sum: number, file: FileType) => sum + file.size, 0))}
                </div>
                <div className="text-sm text-muted-foreground">Total Size</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {[...new Set(files.map((f: FileType) => (f.analysis as FileAnalysis)?.type).filter(Boolean))].length}
                </div>
                <div className="text-sm text-muted-foreground">File Types</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {files.filter((f: FileType) => (f.analysis as FileAnalysis)?.type === 'code').length}
                </div>
                <div className="text-sm text-muted-foreground">Code Files</div>
              </CardContent>
            </Card>
          </div>

          {/* File Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>File Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(
                  files.reduce((acc: Record<string, number>, file: FileType) => {
                    const type = (file.analysis as FileAnalysis)?.type || 'unknown';
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([type, count]) => {
                  const percentage = (count / files.length) * 100;
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{type}</span>
                        <span>{count} files ({percentage.toFixed(1)}%)</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Code Complexity Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(['low', 'medium', 'high'] as const).map(complexity => {
                    const count = files.filter((f: FileType) => (f.analysis as FileAnalysis)?.complexity === complexity).length;
                    const codeFiles = files.filter((f: FileType) => (f.analysis as FileAnalysis)?.type === 'code').length;
                    const percentage = codeFiles > 0 ? (count / codeFiles) * 100 : 0;
                    
                    return (
                      <div key={complexity} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                              complexity === 'low' ? 'bg-green-500' :
                              complexity === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}></div>
                            {complexity} Complexity
                          </span>
                          <span>{count} files ({percentage.toFixed(1)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Language Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    files
                      .filter((f: FileType) => (f.analysis as FileAnalysis)?.language)
                      .reduce((acc: Record<string, number>, file: FileType) => {
                        const language = (file.analysis as FileAnalysis)?.language || 'unknown';
                        acc[language] = (acc[language] || 0) + 1;
                        return acc;
                      }, {})
                  ).slice(0, 5).map(([language, count]) => {
                    const codeFiles = files.filter((f: FileType) => (f.analysis as FileAnalysis)?.language).length;
                    const percentage = codeFiles > 0 ? (count / codeFiles) * 100 : 0;
                    return (
                      <div key={language} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{language}</span>
                          <span>{count} files ({percentage.toFixed(1)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {generateInsights(files).map((insight, index) => (
                  <div key={index} className={`flex items-start gap-3 p-3 border rounded ${insight.color}`}>
                    <i className={`${insight.icon} mt-0.5`}></i>
                    <div>
                      <p className="font-medium text-sm">{insight.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                ))}
                {generateInsights(files).length === 0 && (
                  <div className="text-center py-6">
                    <i className="fas fa-info-circle text-muted-foreground text-2xl mb-2"></i>
                    <p className="text-sm text-muted-foreground">
                      Upload files to get personalized insights and recommendations.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Zone Modal */}
      {showUploadZone && (
        <FileUploadZone
          onFilesSelected={handleFileUpload}
          onClose={() => setShowUploadZone(false)}
          maxFiles={20}
          maxFileSize={50 * 1024 * 1024} // 50MB
          acceptedTypes={['.js', '.jsx', '.ts', '.tsx', '.py', '.md', '.txt', '.json', '.css', '.html', '.java', '.cpp', '.c', '.h', '.rb', '.go', '.rs', '.swift', '.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.gif']}
        />
      )}

      {/* File Details Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <i className={`${getFileIcon(selectedFile.mimeType, selectedFile.originalName)} text-primary`}></i>
                  {selectedFile.originalName}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)} data-testid="button-close-file-details">
                  <i className="fas fa-times"></i>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold">{formatFileSize(selectedFile.size)}</p>
                  <p className="text-sm text-muted-foreground">File Size</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold capitalize">{(selectedFile.analysis as FileAnalysis)?.type || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">File Type</p>
                </div>
                {(selectedFile.analysis as FileAnalysis)?.lineCount && (
                  <div className="text-center">
                    <p className="text-lg font-bold">{((selectedFile.analysis as FileAnalysis)?.lineCount || 0).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Lines</p>
                  </div>
                )}
                {(selectedFile.analysis as FileAnalysis)?.complexity && (
                  <div className="text-center">
                    <Badge variant={
                      (selectedFile.analysis as FileAnalysis)?.complexity === "low" ? "secondary" :
                      (selectedFile.analysis as FileAnalysis)?.complexity === "medium" ? "default" : "destructive"
                    }>
                      {(selectedFile.analysis as FileAnalysis)?.complexity} complexity
                    </Badge>
                  </div>
                )}
              </div>

              {(selectedFile.analysis as FileAnalysis)?.summary && (
                <div>
                  <h4 className="font-medium mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {(selectedFile.analysis as FileAnalysis).summary}
                  </p>
                </div>
              )}

              {fileContent && (
                <div>
                  <h4 className="font-medium mb-2">Content Preview</h4>
                  <ScrollArea className="h-64 w-full border rounded bg-muted">
                    <pre className="p-3 text-xs font-mono whitespace-pre-wrap">
                      {fileContent.slice(0, 5000)}
                      {fileContent.length > 5000 && "\n\n... Content truncated"}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              <div className="flex justify-between items-center pt-4">
                <div className="text-sm text-muted-foreground">
                  <p>Uploaded: {new Date(selectedFile.createdAt!).toLocaleString()}</p>
                  <p>MIME Type: {selectedFile.mimeType}</p>
                </div>
                <Button
                  onClick={() => window.open(`/api/files/${selectedFile.id}/content`, '_blank')}
                  data-testid="button-download-file"
                >
                  <i className="fas fa-download mr-2"></i>
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <i className="fas fa-spinner fa-spin text-primary"></i>
            <div>
              <p className="text-sm font-medium">Uploading and analyzing files...</p>
              <Progress value={75} className="w-48 h-2 mt-1" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
