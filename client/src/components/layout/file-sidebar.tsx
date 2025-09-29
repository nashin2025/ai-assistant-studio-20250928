import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useToast } from "@/hooks/use-toast";
import type { File as FileType } from "@shared/schema";

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  file?: FileType;
  children: TreeNode[];
  isExpanded: boolean;
}

export default function FileSidebar() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([''])); // Root expanded by default
  const { getFileIcon } = useFileUpload();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["/api/files"],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time feel
    refetchIntervalInBackground: true, // Continue polling when tab is not active
    staleTime: 2000, // Data is considered stale after 2 seconds
  });

  // Type-safe files array
  const files: FileType[] = (data as FileType[]) || [];

  // Handle errors manually since onError is not available in v5
  if (error && !isLoading) {
    console.error('File loading error:', error);
  }

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Files refreshed",
        description: "File list has been updated",
      });
    } catch (error) {
      // Error already handled by onError callback
    }
  };

  const handleNavigateToFileManager = (fileId?: string) => {
    const url = fileId ? `/file-manager?file=${fileId}` : '/file-manager';
    navigate(url);
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const buildFileTree = (files: FileType[]): TreeNode[] => {
    const root: TreeNode[] = [];
    const nodeMap = new Map<string, TreeNode>();

    const rootNode: TreeNode = {
      name: 'root',
      path: '',
      type: 'folder',
      children: [],
      isExpanded: true
    };
    nodeMap.set('', rootNode);

    files.forEach(file => {
      const pathParts = file.originalName.split('/');
      let currentPath = '';
      let currentParent = rootNode;

      // Create folder nodes for each part of the path
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        const newPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!nodeMap.has(newPath)) {
          const folderNode: TreeNode = {
            name: part,
            path: newPath,
            type: 'folder',
            children: [],
            isExpanded: expandedFolders.has(newPath)
          };
          nodeMap.set(newPath, folderNode);
          currentParent.children.push(folderNode);
        }
        
        currentParent = nodeMap.get(newPath)!;
        currentPath = newPath;
      }

      // Create file node
      const fileName = pathParts[pathParts.length - 1];
      const fileNode: TreeNode = {
        name: fileName,
        path: file.originalName,
        type: 'file',
        file: file,
        children: [],
        isExpanded: false
      };
      currentParent.children.push(fileNode);
    });

    // Sort children: folders first, then files, both alphabetically
    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      nodes.forEach(node => sortNodes(node.children));
    };

    sortNodes(rootNode.children);
    return rootNode.children;
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const indentStyle = { paddingLeft: `${depth * 12}px` };
    const isExpanded = expandedFolders.has(node.path);

    if (node.type === 'folder') {
      return (
        <div key={node.path}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-7 px-2 text-xs hover:bg-sidebar-accent"
            style={indentStyle}
            onClick={() => toggleFolder(node.path)}
          >
            <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} text-xs text-muted-foreground mr-1`}></i>
            <i className={`fas fa-folder${isExpanded ? '-open' : ''} text-amber-500 mr-2`}></i>
            <span className="truncate flex-1 text-left">{node.name}</span>
            <span className="text-xs text-muted-foreground ml-1">{node.children.length}</span>
          </Button>
          {isExpanded && (
            <div>
              {node.children.map(child => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // File node
    const file = node.file!;

    return (
      <Button
        key={file.id}
        variant="ghost"
        size="sm"
        className="w-full justify-start h-7 px-2 text-xs hover:bg-sidebar-accent group"
        style={indentStyle}
        onClick={() => handleNavigateToFileManager(file.id)}
      >
        <i className={`${getFileIcon(file.originalName, file.mimeType)} text-primary mr-2`}></i>
        <span className="truncate flex-1 text-left">{node.name}</span>
        {file.analysis && typeof file.analysis === 'object' && (file.analysis as any).language && (
          <Badge variant="secondary" className="text-xs px-1 py-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {(file.analysis as any).language}
          </Badge>
        )}
      </Button>
    );
  };

  const treeNodes = buildFileTree(files);

  return (
    <aside className="w-64 bg-sidebar border-l border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm text-sidebar-foreground">Files</h3>
            {isFetching && !isLoading && (
              <i className="fas fa-sync-alt text-xs text-muted-foreground animate-spin" title="Updating files..."></i>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => handleNavigateToFileManager()}
              title="Open File Manager"
              data-testid="button-open-file-manager"
            >
              <i className="fas fa-external-link-alt text-xs"></i>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleRefresh}
              title="Refresh Files"
              data-testid="button-refresh-files"
            >
              <i className="fas fa-sync-alt text-xs"></i>
            </Button>
          </div>
        </div>
        {files.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {files.length} file{files.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* File Tree */}
      <ScrollArea className="flex-1">
        <div className="p-1">
          {error ? (
            <div className="text-center py-8 px-4">
              <i className="fas fa-exclamation-triangle text-2xl text-destructive mb-2"></i>
              <p className="text-xs text-muted-foreground mb-2">Failed to load files</p>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={handleRefresh}
                data-testid="button-retry-files"
              >
                <i className="fas fa-redo mr-1"></i>
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <i className="fas fa-spinner fa-spin text-muted-foreground"></i>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 px-4">
              <i className="fas fa-folder-open text-2xl text-muted-foreground/50 mb-2"></i>
              <p className="text-xs text-muted-foreground">No files</p>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs mt-2 h-7"
                onClick={() => handleNavigateToFileManager()}
                data-testid="button-add-files"
              >
                <i className="fas fa-plus mr-1"></i>
                Add files
              </Button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {treeNodes.map(node => renderTreeNode(node, 0))}
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}