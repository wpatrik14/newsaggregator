"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, BarChart3, Target, AlertCircle, RefreshCw, Trash2, Loader2, Gauge, BookOpen, Heart, TrendingUp, Zap } from "lucide-react"
import ArticleMetricBadge from "./article-metric-badge"
import { useFilters } from "@/contexts/filter-context"
import type { Article } from "@/types/article"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

interface ArticleListState {
  articles: Article[];
  filteredArticles: Article[];
  isLoading: boolean;
  isRefreshing: boolean;
  isDeleting: boolean;
  error: string | null;
  analysisErrors: string[];
}

export default function ArticleList() {
  const [state, setState] = useState<ArticleListState>({
    articles: [],
    filteredArticles: [],
    isLoading: true,
    isRefreshing: false,
    isDeleting: false,
    error: null,
    analysisErrors: []
  });
  
  const { filters } = useFilters();
  
  // Helper functions to update state
  const setArticles = (updater: Article[] | ((prev: Article[]) => Article[])) => {
    setState(prev => {
      const newArticles = typeof updater === 'function' 
        ? updater(prev.articles) 
        : updater;
      return { ...prev, articles: newArticles };
    });
  };
  
  const setFilteredArticles = (filteredArticles: Article[]) => setState(prev => ({ ...prev, filteredArticles }));
  const setIsLoading = (isLoading: boolean) => setState(prev => ({ ...prev, isLoading }));
  const setIsRefreshing = (isRefreshing: boolean) => setState(prev => ({ ...prev, isRefreshing }));
  const setIsDeleting = (isDeleting: boolean) => setState(prev => ({ ...prev, isDeleting }));
  const setError = (error: string | null) => setState(prev => ({ ...prev, error }));
  const setAnalysisErrors = (analysisErrors: string[]) => setState(prev => ({ ...prev, analysisErrors }));
  
  // Destructure state for easier access
  const { articles, filteredArticles, isLoading, isRefreshing, isDeleting, error, analysisErrors } = state;

  // Delete all articles
  const deleteAllArticles = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      const response = await fetch("/api/articles/delete-all", {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Delete all articles response:", data);

      // Clear the articles state
      setArticles([]);
      setFilteredArticles([]);

      toast({
        title: "Articles Deleted",
        description: `Successfully deleted ${data.deletedCount} articles.`,
      });
    } catch (error) {
      console.error("Failed to delete articles:", error)
      setError(`Failed to delete articles: ${error instanceof Error ? error.message : "Unknown error"}`)

      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to delete articles: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Fetch articles with proper TypeScript types and error handling
  const fetchArticles = useCallback(async (loadMore = false) => {
    try {
      // Set loading states
      if (loadMore) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      setError(null);
      setAnalysisErrors([]);

      // Build the API URL with query parameters
      const apiUrl = new URL("/api/articles", window.location.origin);
      
      // Add country parameter (defaults to 'hu' for Hungary)
      apiUrl.searchParams.append("country", filters.country || "hu");
      
      // Add category filter if not 'all'
      if (filters.category !== "all") {
        apiUrl.searchParams.append("category", filters.category);
      }
      
      // Add refresh parameter if loading more
      if (loadMore) {
        apiUrl.searchParams.append("refresh", "true");
      }
      
      // Add parameter to include unanalyzed articles
      apiUrl.searchParams.append("includeUnanalyzed", "true");

      // Make the API request
      const apiResponse = await fetch(apiUrl.toString());
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${apiResponse.status}`);
      }

      const responseData = await apiResponse.json();

      if (responseData.error) {
        throw new Error(responseData.error);
      }

      // Handle analysis errors if any
      if (responseData.errors?.length > 0) {
        setAnalysisErrors(responseData.errors);
        
        // Show toast for analysis errors if loading more
        if (loadMore) {
          toast({
            variant: "warning",
            title: "Analysis Issues",
            description: `${responseData.errors.length} articles had analysis issues.`,
          });
        }
      }

      // Update articles based on whether we're loading more or doing initial load
      if (loadMore) {
        // When loading more, append new articles to the existing ones
        setArticles(prevArticles => {
          const existingUrls = new Set(prevArticles.map(article => article.url));
          const newArticles = (responseData.articles || []).filter((article: Article) => 
            !existingUrls.has(article.url)
          );
          
          if (newArticles.length > 0) {
            toast({
              title: "New Articles Loaded",
              description: `Added ${newArticles.length} new articles.`,
            });
            return [...prevArticles, ...newArticles];
          } else {
            toast({
              title: "No New Articles",
              description: "No new articles to show.",
            });
            return prevArticles;
          }
        });
      } else {
        // Initial load, just set the articles
        setArticles(responseData.articles || []);
      }
    } catch (error: any) {
      console.error("Failed to fetch articles:", error);
      const errorMessage = `Failed to ${loadMore ? 'load more' : 'fetch'} articles: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setError(errorMessage);

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filters.category, filters.country]); // Recreate when filters.category or filters.country changes

  // Poll for updates to check if unanalyzed articles have been analyzed
  useEffect(() => {
    // Only poll if there are unanalyzed articles
    const hasUnanalyzedArticles = articles.some((article) => article.analyzed === false);

    if (!hasUnanalyzedArticles) return;

    const pollInterval = setInterval(() => {
      // Only fetch if we're not already loading or refreshing
      if (!isLoading && !isRefreshing) {
        fetchArticles()
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }, [articles, isLoading, isRefreshing])

  // Fetch articles when component mounts (only if not already loaded) or when category filter changes
  useEffect(() => {
    // Only fetch if we don't have any articles yet
    if (articles.length === 0) {
      fetchArticles()
    }
  }, [filters.category])

  // Apply filters whenever they change or articles change
  useEffect(() => {
    if (!articles.length) return

    const filtered = articles.filter((article) => {
      // Only include articles that have been successfully analyzed
      if (article.analyzed !== true) return false

      // Skip articles that don't have metrics
      if (!article.metrics) return false

      // Filter by clickbait score
      if (
        article.metrics.clickbaitScore < filters.clickbaitRange[0] ||
        article.metrics.clickbaitScore > filters.clickbaitRange[1]
      ) {
        return false
      }

      // Filter by bias score
      if (article.metrics.biasScore < filters.biasRange[0] || article.metrics.biasScore > filters.biasRange[1]) {
        return false
      }

      // Filter by target generation
      if (filters.targetGeneration !== "all") {
        const targetGenMap = {
          "baby-boomers": "Baby Boomers",
          "gen-x": "Generation X",
          millennials: "Millennials",
          "gen-z": "Generation Z",
          "gen-alpha": "Generation Alpha",
        }

        const expectedGeneration = targetGenMap[filters.targetGeneration as keyof typeof targetGenMap]
        if (article.metrics.targetGeneration !== expectedGeneration) {
          return false
        }
      }

      // Filter by source
      if (filters.source !== "all" && article.source.toLowerCase() !== filters.source) {
        return false
      }

      return true
    })

    setFilteredArticles(filtered)
  }, [articles, filters])

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
          <p>Loading articles...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button onClick={() => fetchArticles()} className="mt-4" variant="outline">
          Try Again
        </Button>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-xl font-semibold">Latest News</h2>
        <div className="flex gap-2">
          <Button
            onClick={deleteAllArticles}
            size="sm"
            variant="outline"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            disabled={isDeleting || isRefreshing}
          >
            {isDeleting ? "Deleting..." : "Delete All"}
            <Trash2 className="ml-2 h-4 w-4" />
          </Button>
          <Button onClick={() => fetchArticles(true)} size="sm" variant="outline" disabled={isRefreshing}>
            {isRefreshing ? "Loading..." : "Load More"}
            <RefreshCw className={`ml-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {analysisErrors.length > 0 && (
        <Alert variant="warning" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Analysis Issues</AlertTitle>
          <AlertDescription>
            <p className="mb-2">Some articles could not be analyzed:</p>
            <ul className="list-disc pl-5 text-sm">
              {analysisErrors.slice(0, 3).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
              {analysisErrors.length > 3 && <li>...and {analysisErrors.length - 3} more errors</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {filteredArticles.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div>
            <p className="text-muted-foreground">No articles available</p>
            <p className="text-sm text-muted-foreground">
              {articles.length > 0
                ? "Try adjusting your filter criteria"
                : "Click the Refresh button to load new articles"}
            </p>
            {articles.length === 0 && (
              <Button onClick={() => fetchArticles(true)} className="mt-4" disabled={isRefreshing}>
                {isRefreshing ? "Refreshing..." : "Refresh Articles"}
                {isRefreshing && <RefreshCw className="ml-2 h-4 w-4 animate-spin" />}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map((article) => (
            <Card key={article.id} className="h-full overflow-hidden transition-all hover:shadow-md">
              {/* Use a div instead of Link for unanalyzed articles */}
              {article.analyzed === false ? (
                <div>
                  <div
                    className="h-48 bg-cover bg-center relative"
                    style={{
                      backgroundImage: `url(${article.imageUrl || "/placeholder.svg?height=400&width=600"})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {/* Overlay for unanalyzed articles */}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p className="text-sm font-medium">Analyzing article...</p>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline">{article.source}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                      </span>
                    </div>
                    <h2 className="mb-2 line-clamp-2 text-xl font-bold">{article.title}</h2>
                    <p className="line-clamp-3 text-sm text-muted-foreground">{article.summary}</p>
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2 border-t p-4 items-center justify-center">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>AI analysis in progress...</span>
                    </div>
                  </CardFooter>
                </div>
              ) : (
                <Link href={`/articles/${article.id}`}>
                  <div
                    className="h-48 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${article.imageUrl || "/placeholder.svg?height=400&width=600"})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline">{article.source}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                      </span>
                    </div>
                    <h2 className="mb-2 line-clamp-2 text-xl font-bold">{article.title}</h2>
                    <p className="line-clamp-3 text-sm text-muted-foreground">{article.summary}</p>
                  </CardContent>
                  <CardFooter className="grid grid-cols-2 gap-2 border-t p-4">
                    <ArticleMetricBadge
                      icon={<AlertTriangle size={14} />}
                      label="Clickbait"
                      value={article.metrics.clickbaitScore}
                      colorScale="high-bad"
                    />
                    <ArticleMetricBadge
                      icon={<BarChart3 size={14} />}
                      label="Bias"
                      value={article.metrics.biasScore}
                      colorScale="high-bad"
                    />
                    <ArticleMetricBadge
                      icon={<Gauge size={14} />}
                      label="Sentiment"
                      value={article.metrics.sentimentScore}
                      colorScale="high-good"
                    />
                    <ArticleMetricBadge
                      icon={<BookOpen size={14} />}
                      label="Readability"
                      value={article.metrics.readabilityScore}
                      colorScale="high-good"
                    />
                    <ArticleMetricBadge
                      icon={<Zap size={14} />}
                      label="Tone"
                      text={article.metrics.sentimentTone}
                    />
                    <ArticleMetricBadge
                      icon={<Heart size={14} />}
                      label="Emotion"
                      text={article.metrics.emotionalTone}
                    />
                    <ArticleMetricBadge
                      icon={<Target size={14} />}
                      label="Target"
                      text={article.metrics.targetGeneration}
                    />
                    <ArticleMetricBadge
                      icon={<TrendingUp size={14} />}
                      label="Level"
                      text={article.metrics.readingLevel}
                    />
                  </CardFooter>
                </Link>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
