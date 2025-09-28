import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useToast } from "@/hooks/use-toast";
import type { File as FileType } from "@shared/schema";

interface CodeMetrics {
  functions: number;
  classes: number;
  imports: number;
  comments: number;
}

interface FileAnalysis {
  type: string;
  language?: string;
  lineCount?: number;
  size: number;
  complexity?: 'low' | 'medium' | 'high';
  summary?: string;
  codeMetrics?: CodeMetrics;
}

export default function CodeAnalysis() {
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [activeTab, setActiveTab] = useState("files");
  const { toast } = useToast();
  const userId = "default-user";

  const { uploadFile, isUploading } = useFileUpload();

  const { data: files = [], isLoading: isLoadingFiles, refetch: refetchFiles } = useQuery({
    queryKey: ["/api/files", { userId }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/files?userId=${userId}`);
      return response.json();
    },
  });

  const analyzeGitHubMutation = useMutation({
    mutationFn: async (url: string) => {
      const urlParts = url.replace('https://github.com/', '').split('/');
      if (urlParts.length !== 2) throw new Error("Invalid GitHub URL");
      
      const [owner, repo] = urlParts;
      const response = await apiRequest("GET", `/api/github/repositories/${owner}/${repo}/analyze`);
      return response.json();
    },
    onSuccess: (analysis) => {
      toast({
        title: "Analysis Complete",
        description: "GitHub repository analysis completed successfully.",
      });
      setActiveTab("github");
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze repository",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (uploadedFiles: File[]) => {
    try {
      for (const file of uploadedFiles) {
        await uploadFile(file);
      }
      await refetchFiles();
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    const codeFiles = droppedFiles.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'php', 'rb', 'go', 'rs', 'swift'].includes(ext || '');
    });
    
    if (codeFiles.length > 0) {
      handleFileUpload(codeFiles);
    }
  };

  const getComplexityColor = (complexity?: string) => {
    switch (complexity) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getLanguageIcon = (language?: string) => {
    const iconMap: Record<string, string> = {
      javascript: 'fab fa-js-square',
      typescript: 'fab fa-js-square',
      python: 'fab fa-python',
      java: 'fab fa-java',
      php: 'fab fa-php',
      html: 'fab fa-html5',
      css: 'fab fa-css3-alt',
      react: 'fab fa-react',
      node: 'fab fa-node-js',
    };
    return iconMap[language?.toLowerCase() || ''] || 'fas fa-file-code';
  };

  if (isLoadingFiles) {
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Code Analysis</h1>
        <p className="text-muted-foreground">Analyze and optimize your code files and repositories</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="files" data-testid="tab-files">Uploaded Files</TabsTrigger>
          <TabsTrigger value="upload" data-testid="tab-upload">Upload & Analyze</TabsTrigger>
          <TabsTrigger value="github" data-testid="tab-github">GitHub Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-4">
          {files.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <i className="fas fa-file-code text-muted-foreground text-xl"></i>
                </div>
                <h3 className="text-lg font-medium mb-2">No Files Analyzed</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Upload your code files to get detailed analysis and optimization suggestions.
                </p>
                <Button onClick={() => setActiveTab("upload")} data-testid="button-start-upload">
                  <i className="fas fa-upload mr-2"></i>
                  Upload Files
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
                    onClick={() => setSelectedFile(file)}
                    data-testid={`file-card-${file.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <i className={`${getLanguageIcon(analysis?.language)} text-primary`}></i>
                          <CardTitle className="text-sm">{file.originalName}</CardTitle>
                        </div>
                        {analysis?.complexity && (
                          <Badge variant="outline" className={`text-xs ${getComplexityColor(analysis.complexity)}`}>
                            {analysis.complexity}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs">
                        {analysis?.language && (
                          <span className="capitalize">{analysis.language}</span>
                        )}
                        {analysis?.lineCount && (
                          <span> • {analysis.lineCount} lines</span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {analysis?.codeMetrics && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between">
                            <span>Functions:</span>
                            <span className="font-medium">{analysis.codeMetrics.functions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Classes:</span>
                            <span className="font-medium">{analysis.codeMetrics.classes}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Imports:</span>
                            <span className="font-medium">{analysis.codeMetrics.imports}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Comments:</span>
                            <span className="font-medium">{analysis.codeMetrics.comments}</span>
                          </div>
                        </div>
                      )}
                      {analysis?.summary && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {analysis.summary}
                        </p>
                      )}
                      <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
                        <span>{(file.size / 1024).toFixed(1)} KB</span>
                        <span>{new Date(file.createdAt!).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Code Files</CardTitle>
              <CardDescription>
                Drag and drop your code files or click to browse. Supported formats: .js, .jsx, .ts, .tsx, .py, .java, .cpp, .c, .h, .css, .html, .php, .rb, .go, .rs, .swift
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
                data-testid="upload-zone"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <i className="fas fa-cloud-upload-alt text-primary text-xl"></i>
                  </div>
                  <div>
                    <p className="font-medium">Drop your code files here</p>
                    <p className="text-sm text-muted-foreground">or click to browse files</p>
                  </div>
                  {isUploading && (
                    <div className="space-y-2">
                      <Progress value={75} className="w-full max-w-xs mx-auto" />
                      <p className="text-sm text-muted-foreground">Analyzing files...</p>
                    </div>
                  )}
                </div>
              </div>
              <input
                id="file-upload"
                type="file"
                multiple
                accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.h,.css,.html,.php,.rb,.go,.rs,.swift"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    handleFileUpload(files);
                  }
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="github" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyze GitHub Repository</CardTitle>
              <CardDescription>
                Enter a GitHub repository URL to perform comprehensive code analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="https://github.com/username/repository"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  data-testid="input-github-url"
                />
                <Button
                  onClick={() => analyzeGitHubMutation.mutate(githubUrl)}
                  disabled={!githubUrl || analyzeGitHubMutation.isPending}
                  data-testid="button-analyze-github"
                >
                  {analyzeGitHubMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-chart-line mr-2"></i>
                      Analyze
                    </>
                  )}
                </Button>
              </div>

              {analyzeGitHubMutation.data && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Analysis Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-muted rounded">
                        <p className="text-2xl font-bold text-primary">{analyzeGitHubMutation.data.files?.length || 0}</p>
                        <p className="text-sm text-muted-foreground">Files</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded">
                        <p className="text-2xl font-bold text-primary">{Object.keys(analyzeGitHubMutation.data.languages || {}).length}</p>
                        <p className="text-sm text-muted-foreground">Languages</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded">
                        <p className="text-2xl font-bold text-primary">{analyzeGitHubMutation.data.structure?.directories?.length || 0}</p>
                        <p className="text-sm text-muted-foreground">Directories</p>
                      </div>
                      <div className="text-center p-3 bg-muted rounded">
                        <Badge
                          variant={
                            analyzeGitHubMutation.data.complexity === "low" ? "secondary" :
                            analyzeGitHubMutation.data.complexity === "medium" ? "default" : "destructive"
                          }
                          className="text-sm"
                        >
                          {analyzeGitHubMutation.data.complexity} complexity
                        </Badge>
                      </div>
                    </div>

                    {analyzeGitHubMutation.data.languages && (
                      <div>
                        <h4 className="font-medium mb-2">Languages Used</h4>
                        <div className="space-y-2">
                          {Object.entries(analyzeGitHubMutation.data.languages).map(([lang, bytes]: [string, any]) => {
                            const total = Object.values(analyzeGitHubMutation.data.languages).reduce((a: any, b: any) => a + b, 0);
                            const percentage = ((bytes / total) * 100).toFixed(1);
                            return (
                              <div key={lang} className="flex items-center justify-between">
                                <span className="text-sm">{lang}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-muted rounded-full h-2">
                                    <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                                  </div>
                                  <span className="text-xs text-muted-foreground w-12">{percentage}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {analyzeGitHubMutation.data.suggestions && (
                      <div>
                        <h4 className="font-medium mb-2">Optimization Suggestions</h4>
                        <ul className="space-y-2">
                          {analyzeGitHubMutation.data.suggestions.map((suggestion: string, index: number) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <i className="fas fa-lightbulb text-primary text-xs mt-0.5"></i>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* File Details Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <i className={`${getLanguageIcon((selectedFile.analysis as FileAnalysis)?.language)} text-primary`}></i>
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
                  <p className="text-lg font-bold">{((selectedFile.analysis as FileAnalysis)?.lineCount || 0).toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Lines of Code</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  <p className="text-sm text-muted-foreground">File Size</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold capitalize">{(selectedFile.analysis as FileAnalysis)?.language || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">Language</p>
                </div>
                <div className="text-center">
                  <Badge variant={
                    (selectedFile.analysis as FileAnalysis)?.complexity === "low" ? "secondary" :
                    (selectedFile.analysis as FileAnalysis)?.complexity === "medium" ? "default" : "destructive"
                  }>
                    {(selectedFile.analysis as FileAnalysis)?.complexity || 'unknown'} complexity
                  </Badge>
                </div>
              </div>

              {(selectedFile.analysis as FileAnalysis)?.codeMetrics && (
                <div>
                  <h4 className="font-medium mb-2">Code Metrics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted p-3 rounded text-center">
                      <p className="text-xl font-bold text-primary">{(selectedFile.analysis as FileAnalysis).codeMetrics!.functions}</p>
                      <p className="text-sm text-muted-foreground">Functions</p>
                    </div>
                    <div className="bg-muted p-3 rounded text-center">
                      <p className="text-xl font-bold text-primary">{(selectedFile.analysis as FileAnalysis).codeMetrics!.classes}</p>
                      <p className="text-sm text-muted-foreground">Classes</p>
                    </div>
                    <div className="bg-muted p-3 rounded text-center">
                      <p className="text-xl font-bold text-primary">{(selectedFile.analysis as FileAnalysis).codeMetrics!.imports}</p>
                      <p className="text-sm text-muted-foreground">Imports</p>
                    </div>
                    <div className="bg-muted p-3 rounded text-center">
                      <p className="text-xl font-bold text-primary">{(selectedFile.analysis as FileAnalysis).codeMetrics!.comments}</p>
                      <p className="text-sm text-muted-foreground">Comments</p>
                    </div>
                  </div>
                </div>
              )}

              {(selectedFile.analysis as FileAnalysis)?.summary && (
                <div>
                  <h4 className="font-medium mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {(selectedFile.analysis as FileAnalysis).summary}
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center pt-4">
                <div className="text-sm text-muted-foreground">
                  <p>Uploaded: {new Date(selectedFile.createdAt!).toLocaleString()}</p>
                  <p>Type: {(selectedFile.analysis as FileAnalysis)?.type || 'Unknown'}</p>
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
    </div>
  );
}
