"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, BarChart3, Target, AlertCircle, RefreshCw, Trash2, Loader2, Gauge, BookOpen, Heart, TrendingUp, Zap, Sparkles } from "lucide-react"
import ArticleMetricBadge from "./article-metric-badge"
import { useFilters } from "@/contexts/filter-context"
import type { Article } from "@/types/article"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
  // Calculate an overall score based on article metrics (0-100 scale)
  const calculateArticleScore = (article: Article): number => {
    if (!article.metrics) return 0;
    
    const {
      clickbaitScore = 0,
      sentimentTone = 'neutral',
      emotionalTone = 'neutral',
      engagementScore = 0,
      readabilityScore = 0,
      biasScore = 0
    } = article.metrics;
    
    // Convert sentiment to score (negative = 0, neutral = 50, positive = 100)
    const sentimentScore = sentimentTone.toString().toLowerCase().includes('positive') ? 100 :
                         sentimentTone.toString().toLowerCase().includes('negative') ? 0 : 50;
    
    // Convert emotion to score (negative = 0, neutral = 50, positive = 100)
    const emotionScore = ['joy', 'love', 'surprise', 'trust'].includes(emotionalTone.toString().toLowerCase()) ? 100 :
                        ['anger', 'disgust', 'fear', 'sadness'].includes(emotionalTone.toString().toLowerCase()) ? 0 : 50;
    
    // Calculate weighted average of all metrics
    const weights = {
      clickbait: 0.2,      // Lower is better (inverted)
      sentiment: 0.25,     // Higher is better
      emotion: 0.15,       // Higher is better
      engagement: 0.25,    // Higher is better
      readability: 0.1,    // Higher is better
      bias: 0.05          // Closer to 0 is better
    };
    
    // Calculate individual scores (all normalized to 0-100)
    const clickbaitScoreNorm = 100 - (clickbaitScore || 0);
    const sentimentScoreNorm = sentimentScore;
    const emotionScoreNorm = emotionScore;
    const engagementScoreNorm = engagementScore || 0;
    const readabilityScoreNorm = Math.min(100, Math.max(0, (readabilityScore || 0) * 20)); // Scale 0-5 to 0-100
    const biasScoreNorm = 100 - Math.min(100, Math.abs(biasScore || 0) * 100);
    
    // Calculate weighted score
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const weightedScore = (
      (clickbaitScoreNorm * weights.clickbait) +
      (sentimentScoreNorm * weights.sentiment) +
      (emotionScoreNorm * weights.emotion) +
      (engagementScoreNorm * weights.engagement) +
      (readabilityScoreNorm * weights.readability) +
      (biasScoreNorm * weights.bias)
    ) / totalWeight;
    
    return Math.round(weightedScore);
  };

  // Enhanced AI Summary Dialog Component
  const [showSummary, setShowSummary] = useState(false);
  const [currentSummary, setCurrentSummary] = useState('');
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const showAISummary = (aiSummary: string) => {
    setCurrentSummary(aiSummary);
    setShowSummary(true);
    document.body.style.overflow = 'hidden'; // Prevent scrolling when modal is open
  };

  const closeSummary = () => {
    setShowSummary(false);
    document.body.style.overflow = 'unset';
  };

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeSummary();
    }
  };

  // Effect to handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSummary();
      }
    };

    if (showSummary) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSummary]);

  // Format the summary with a modern design and bullet points
  const formatSummary = (summary: string) => {
    if (!summary) return null;

    // Clean up text by removing markdown formatting and extra spaces
    const cleanText = (text: string) => {
      if (!text) return '';
      return text
        .replace(/\*\*|\*/g, '') // Remove markdown bold/italic
        .replace(/\s+/g, ' ')     // Replace multiple spaces with one
        .trim();
    };

    // Split the summary into sections
    const sections = summary.split('\n\n').filter(section => section.trim().length > 0);
    const result = [];

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (!section) continue;

      // Check if this is a header (ends with ':')
      if (section.endsWith(':')) {
        const headerText = cleanText(section.slice(0, -1));
        result.push(
          <div key={`section-${i}`} className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
              {headerText}
            </h3>
          </div>
        );
      } 
      // Check if this is a list (starts with bullet or number)
      else if (section.match(/^[\s\-•*]|^\d+\./)) {
        const listItems = section
          .split('\n')
          .map(item => cleanText(item).replace(/^[\s\-•*]\s*|^\d+\.\s*/, ''))
          .filter(item => item.length > 0);
        
        if (listItems.length > 0) {
          result.push(
            <ul key={`list-${i}`} className="space-y-2 mb-4 pl-5">
              {listItems.map((item, idx) => (
                <li key={idx} className="relative pl-3 text-gray-700">
                  <span className="absolute left-0 top-2.5 w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  {item}
                </li>
              ))}
            </ul>
          );
        }
      } 
      // Regular paragraph
      else {
        const cleanParagraph = cleanText(section);
        if (cleanParagraph) {
          result.push(
            <p key={`p-${i}`} className="text-gray-700 leading-relaxed mb-4 pl-5 border-l-2 border-gray-100 pl-4">
              {cleanParagraph}
            </p>
          );
        }
      }
    }

    return result;
  };

  // Modern Summary Dialog Component
  const SummaryDialog = () => {
    if (!showSummary) return null;

    // Close dialog when clicking outside or pressing Escape
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowSummary(false);
          document.body.style.overflow = '';
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }, []);

    const handleBackdropClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        setShowSummary(false);
        document.body.style.overflow = '';
      }
    };

    return (
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300"
        onClick={handleBackdropClick}
      >
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* Header with gradient */}
          <div className="p-6 border-b dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Article Insights</h2>
                  <p className="text-sm text-blue-600 dark:text-blue-400">AI-powered analysis</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowSummary(false);
                  document.body.style.overflow = '';
                }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-gray-900">
            {isSummaryLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-100 dark:border-blue-900 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-blue-500 dark:border-blue-400 rounded-full animate-spin"></div>
                </div>
                <p className="text-gray-500 dark:text-gray-400">Generating insights...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {formatSummary(currentSummary)}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-500">
              AI-generated content • May contain inaccuracies • Not financial advice
            </p>
          </div>
        </div>
      </div>
    );
  };

  const [state, setState] = useState<ArticleListState>({
    articles: [],
    filteredArticles: [],
    isLoading: true,
    isRefreshing: false,
    isDeleting: false,
    error: null,
    analysisErrors: []
  });

  const [toastQueue, setToastQueue] = useState<Array<{
    variant?: "default" | "destructive" | "warning";
    title: string;
    description: string;
  }>>([]);

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
  
  // Handle toast notifications in a separate effect
  useEffect(() => {
    if (toastQueue.length > 0) {
      const nextToast = toastQueue[0];
      toast({
        variant: nextToast.variant,
        title: nextToast.title,
        description: nextToast.description,
      });
      setToastQueue(prev => prev.slice(1));
    }
  }, [toastQueue]);

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

      setToastQueue(prev => [...prev, {
        title: "Articles Deleted",
        description: `Successfully deleted ${data.deletedCount} articles.`,
      }]);
    } catch (error) {
      console.error("Failed to delete articles:", error)
      setError(`Failed to delete articles: ${error instanceof Error ? error.message : "Unknown error"}`)

      setToastQueue(prev => [...prev, {
        variant: "destructive",
        title: "Error",
        description: `Failed to delete articles: ${error instanceof Error ? error.message : "Unknown error"}`,
      }]);
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
        
        // Queue toast for analysis errors if loading more
        if (loadMore) {
          setToastQueue(prev => [...prev, {
            variant: "warning" as const,
            title: "Analysis Issues",
            description: `${responseData.errors.length} articles had analysis issues.`,
          }]);
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
            setToastQueue(prev => [...prev, {
              title: "New Articles Loaded",
              description: `Added ${newArticles.length} new articles.`,
            }]);
            return [...prevArticles, ...newArticles];
          } else {
            setToastQueue(prev => [...prev, {
              title: "No New Articles",
              description: "No new articles to show.",
            }]);
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

      setToastQueue(prev => [...prev, {
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      }]);
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
    <>
      <SummaryDialog />
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 cursor-help">
                            <Gauge className="h-4 w-4" />
                            <span className="font-medium">{calculateArticleScore(article)}%</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-2">
                            <p className="font-medium">Overall Score: {calculateArticleScore(article)}%</p>
                            <p className="text-sm">
                              The Overall Score is calculated using a weighted average of:
                            </p>
                            <ul className="text-sm list-disc pl-4 space-y-1">
                              <li>Clickbait (20% weight, lower is better)</li>
                              <li>Sentiment (25% weight, higher is better)</li>
                              <li>Emotion (15% weight, positive emotions score higher)</li>
                              <li>Engagement (25% weight, higher is better)</li>
                              <li>Readability (10% weight, moderate is best)</li>
                              <li>Bias (5% weight, neutral is best)</li>
                            </ul>
                          </div>
                        </TooltipContent>
                      </Tooltip>
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
                <a 
                  href={article.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block hover:shadow-lg transition-shadow rounded-lg overflow-hidden h-full flex flex-col"
                >
                  <div 
                    className="h-48 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${article.imageUrl || "/placeholder.svg?height=400&width=600"})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline">{article.source}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h2 className="text-xl font-bold hover:text-primary transition-colors flex-1">
                        {article.title}
                      </h2>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center cursor-help">
                            <Badge variant="outline" className="text-xs mb-1">
                              Score
                            </Badge>
                            <div className="text-lg font-bold text-primary">
                              {calculateArticleScore(article)}/100
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="space-y-2">
                            <p className="font-medium">Overall Score: {calculateArticleScore(article)}/100</p>
                            <p className="text-sm">
                              Calculated using a weighted average of:
                            </p>
                            <ul className="text-sm list-disc pl-4 space-y-1">
                              <li>Clickbait (20% weight, lower is better)</li>
                              <li>Sentiment (25% weight, higher is better)</li>
                              <li>Emotion (15% weight, positive emotions score higher)</li>
                              <li>Engagement (25% weight, higher is better)</li>
                              <li>Readability (10% weight, moderate is best)</li>
                              <li>Bias (5% weight, neutral is best)</li>
                            </ul>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="space-y-2">
                      <p className="line-clamp-4 text-sm text-muted-foreground">
                        {article.summary || 'No summary available.'}
                      </p>
                      {article.aiSummary && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs text-primary h-6 p-0"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            showAISummary(article.aiSummary!);
                          }}
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          View Detailed Summary
                        </Button>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="mt-auto grid grid-cols-2 gap-2 border-t p-4">
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
                      colorScale="tone"
                    />
                    <ArticleMetricBadge
                      icon={<Heart size={14} />}
                      label="Emotion"
                      text={article.metrics.emotionalTone}
                      colorScale="emotion"
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
                </a>
              )}
            </Card>
          ))}
        </div>
      )}
      </div>
    </>
  )
}
