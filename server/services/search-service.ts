import type { SearchEngine } from "@shared/schema";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  sources: string[];
  message?: string;
}

export class SearchService {
  async search(engines: SearchEngine[], query: string, maxResults: number = 10): Promise<SearchResponse> {
    const searchPromises = engines.map(engine => this.searchEngine(engine, query, maxResults));
    const results = await Promise.allSettled(searchPromises);
    
    const allResults: SearchResult[] = [];
    const sources: string[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
        allResults.push(...result.value);
        sources.push(engines[index].name);
      }
    });

    // Remove duplicates and sort by relevance
    const uniqueResults = this.deduplicateResults(allResults);
    
    return {
      query,
      results: uniqueResults.slice(0, maxResults),
      totalResults: uniqueResults.length,
      sources,
    };
  }

  private async searchEngine(engine: SearchEngine, query: string, maxResults: number): Promise<SearchResult[]> {
    switch (engine.name.toLowerCase()) {
      case 'google':
        return this.searchGoogle(query, maxResults, engine.apiKey);
      case 'bing':
        return this.searchBing(query, maxResults, engine.apiKey);
      case 'duckduckgo':
        return this.searchDuckDuckGo(query, maxResults);
      default:
        console.warn(`Unknown search engine: ${engine.name}`);
        return [];
    }
  }

  private async searchGoogle(query: string, maxResults: number, apiKey?: string | null): Promise<SearchResult[]> {
    try {
      const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
      const key = apiKey || process.env.GOOGLE_API_KEY;
      
      if (!key || !searchEngineId) {
        console.warn("Google Search API key or Search Engine ID not configured");
        return [];
      }

      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=${Math.min(maxResults, 10)}`
      );

      if (!response.ok) {
        console.error("Google Search API error:", response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      
      return (data.items || []).map((item: any) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        source: 'Google',
      }));
    } catch (error) {
      console.error("Google search error:", error);
      return [];
    }
  }

  private async searchBing(query: string, maxResults: number, apiKey?: string | null): Promise<SearchResult[]> {
    try {
      const key = apiKey || process.env.BING_API_KEY;
      
      if (!key) {
        console.warn("Bing Search API key not configured");
        return [];
      }

      const response = await fetch(
        `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${Math.min(maxResults, 50)}`,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': key,
          },
        }
      );

      if (!response.ok) {
        console.error("Bing Search API error:", response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      
      return (data.webPages?.value || []).map((item: any) => ({
        title: item.name,
        url: item.url,
        snippet: item.snippet,
        source: 'Bing',
      }));
    } catch (error) {
      console.error("Bing search error:", error);
      return [];
    }
  }

  private async searchDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
    try {
      // DuckDuckGo Instant Answer API (free but limited)
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`
      );

      if (!response.ok) {
        console.error("DuckDuckGo API error:", response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      const results: SearchResult[] = [];

      // Add abstract if available
      if (data.Abstract) {
        results.push({
          title: data.Heading || query,
          url: data.AbstractURL || '#',
          snippet: data.Abstract,
          source: 'DuckDuckGo',
        });
      }

      // Add related topics
      if (data.RelatedTopics) {
        data.RelatedTopics.slice(0, maxResults - 1).forEach((topic: any) => {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0],
              url: topic.FirstURL,
              snippet: topic.Text,
              source: 'DuckDuckGo',
            });
          }
        });
      }

      return results.slice(0, maxResults);
    } catch (error) {
      console.error("DuckDuckGo search error:", error);
      return [];
    }
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = result.url.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async fetchWebContent(url: string): Promise<string> {
    try {
      // Basic URL validation to prevent SSRF
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid URL protocol. Only HTTP and HTTPS are allowed.');
      }

      // Block private/internal IP ranges (basic protection)
      const hostname = parsedUrl.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || 
          hostname.startsWith('10.') || hostname.startsWith('172.16.') || hostname === '::1') {
        throw new Error('Access to private/internal networks is not allowed.');
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        // Add timeout and size limits
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // Basic HTML to text conversion (you might want to use a proper library like cheerio)
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch (error) {
      console.error("Error fetching web content:", error);
      throw new Error(`Failed to fetch content from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
