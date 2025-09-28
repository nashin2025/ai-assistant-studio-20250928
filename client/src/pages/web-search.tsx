import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { SearchEngine } from "@shared/schema";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  sources: string[];
  message?: string;
}

export default function WebSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [webContent, setWebContent] = useState<{ url: string; content: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = "default-user";

  const { data: searchEngines = [], isLoading: isLoadingEngines } = useQuery({
    queryKey: ["/api/search-engines", { userId }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/search-engines?userId=${userId}`);
      return response.json();
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("POST", "/api/search", {
        query,
        userId,
        maxResults: 20,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setSearchResults(data);
      toast({
        title: "Search Complete",
        description: data.message || `Found ${data.totalResults} results from ${data.sources.length} source(s).`,
        variant: data.totalResults === 0 && data.message ? "destructive" : "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to perform search",
        variant: "destructive",
      });
    },
  });

  const fetchContentMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/search/fetch-content", { url });
      return response.json();
    },
    onSuccess: (data, url) => {
      setWebContent({ url, content: data.content });
      toast({
        title: "Content Fetched",
        description: "Web page content has been extracted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Fetch Failed",
        description: error instanceof Error ? error.message : "Failed to fetch web content",
        variant: "destructive",
      });
    },
  });

  const updateEnginneMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SearchEngine> }) => {
      const response = await apiRequest("PUT", `/api/search-engines/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-engines"] });
      toast({
        title: "Settings Updated",
        description: "Search engine settings have been updated.",
      });
    },
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleFetchContent = (url: string) => {
    fetchContentMutation.mutate(url);
  };

  const handleToggleEngine = (engine: SearchEngine) => {
    updateEnginneMutation.mutate({
      id: engine.id,
      updates: { enabled: !engine.enabled },
    });
  };

  const quickSearches = [
    "React best practices 2024",
    "TypeScript advanced patterns",
    "Node.js performance optimization",
    "Python web scraping tutorial",
    "JavaScript async/await examples",
    "CSS Grid vs Flexbox",
  ];

  if (isLoadingEngines) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-12 bg-muted rounded"></div>
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
        <h1 className="text-2xl font-bold text-foreground">Web Search</h1>
        <p className="text-muted-foreground">Search multiple engines simultaneously and analyze web content</p>
      </div>

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search" data-testid="tab-search">Search</TabsTrigger>
          <TabsTrigger value="content" data-testid="tab-content">Web Content</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          {/* Search Input */}
          <Card>
            <CardContent className="p-6">
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Enter your search query..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                  data-testid="input-search-query"
                />
                <Button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || searchMutation.isPending}
                  data-testid="button-search"
                >
                  {searchMutation.isPending ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-search"></i>
                  )}
                </Button>
              </div>

              {/* Quick Search Suggestions */}
              <div>
                <p className="text-sm font-medium mb-2">Quick Searches:</p>
                <div className="flex flex-wrap gap-2">
                  {quickSearches.map((query, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery(query);
                        searchMutation.mutate(query);
                      }}
                      className="text-xs"
                      data-testid={`quick-search-${index}`}
                    >
                      {query}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Results */}
          {searchResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Search Results for "{searchResults.query}"</span>
                  <Badge variant="secondary">
                    {searchResults.totalResults} results from {searchResults.sources.join(", ")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {searchResults.results.map((result, index) => (
                      <Card key={index} className="hover:bg-accent transition-colors" data-testid={`search-result-${index}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-medium text-sm mb-1">
                                <a
                                  href={result.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {result.title}
                                </a>
                              </h3>
                              <p className="text-xs text-muted-foreground mb-2">{result.url}</p>
                              <p className="text-sm text-muted-foreground">{result.snippet}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Badge variant="outline" className="text-xs">
                                {result.source}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFetchContent(result.url)}
                                disabled={fetchContentMutation.isPending}
                                data-testid={`button-fetch-${index}`}
                              >
                                <i className="fas fa-download text-xs"></i>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {!searchResults && !searchMutation.isPending && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <i className="fas fa-search text-muted-foreground text-xl"></i>
                </div>
                <h3 className="text-lg font-medium mb-2">Search the Web</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Enter a search query to find information across multiple search engines.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          {webContent ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Web Content</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(webContent.url, "_blank")}
                    data-testid="button-open-original"
                  >
                    <i className="fas fa-external-link-alt mr-2"></i>
                    Open Original
                  </Button>
                </CardTitle>
                <CardDescription>{webContent.url}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg">
                  <ScrollArea className="h-[500px]">
                    <div className="text-sm whitespace-pre-wrap font-mono">
                      {webContent.content.slice(0, 10000)}
                      {webContent.content.length > 10000 && (
                        <div className="text-muted-foreground italic mt-4">
                          ... Content truncated. Open original URL to view full content.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm text-muted-foreground">
                    {webContent.content.length.toLocaleString()} characters
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(webContent.content);
                      toast({
                        title: "Copied",
                        description: "Content copied to clipboard.",
                      });
                    }}
                    data-testid="button-copy-content"
                  >
                    <i className="fas fa-copy mr-2"></i>
                    Copy Content
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <i className="fas fa-globe text-muted-foreground text-xl"></i>
                </div>
                <h3 className="text-lg font-medium mb-2">No Content Fetched</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Perform a search and click the download button on any result to extract its content.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Engine Configuration</CardTitle>
              <CardDescription>
                Enable or disable search engines and configure API keys
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {searchEngines.map((engine: SearchEngine) => (
                <div key={engine.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`search-engine-${engine.name.toLowerCase()}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                      <i className={`fas fa-${engine.name.toLowerCase() === 'google' ? 'google' : engine.name.toLowerCase() === 'bing' ? 'windows' : 'search'} text-primary text-sm`}></i>
                    </div>
                    <div>
                      <h4 className="font-medium">{engine.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {engine.apiKey ? "API key configured" : "No API key required"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={engine.enabled}
                      onCheckedChange={() => handleToggleEngine(engine)}
                      disabled={updateEnginneMutation.isPending}
                      data-testid={`toggle-${engine.name.toLowerCase()}`}
                    />
                    <span className="text-sm text-muted-foreground">
                      {engine.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <i className="fas fa-lightbulb text-primary mt-0.5"></i>
                  <div>
                    <p className="font-medium">Use specific keywords</p>
                    <p className="text-muted-foreground">Be specific in your search queries for better results</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <i className="fas fa-lightbulb text-primary mt-0.5"></i>
                  <div>
                    <p className="font-medium">Quote exact phrases</p>
                    <p className="text-muted-foreground">Use quotes to search for exact phrases: "exact phrase"</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <i className="fas fa-lightbulb text-primary mt-0.5"></i>
                  <div>
                    <p className="font-medium">Combine search engines</p>
                    <p className="text-muted-foreground">Enable multiple engines to get comprehensive results</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <i className="fas fa-lightbulb text-primary mt-0.5"></i>
                  <div>
                    <p className="font-medium">Extract web content</p>
                    <p className="text-muted-foreground">Click the download button to extract and analyze page content</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
