"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, BarChart3, Target, AlertCircle, RefreshCw, Trash2, Loader2 } from "lucide-react"
import ArticleMetricBadge from "./article-metric-badge"
import { useFilters } from "@/contexts/filter-context"
import type { Article } from "@/types/article"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

export default function ArticleList() {
  const [articles, setArticles] = useState<Article[]>([])
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysisErrors, setAnalysisErrors] = useState<string[]>([])
  const { filters } = useFilters()

  // Delete all articles
  const deleteAllArticles = async () => {
    try {
      setIsDeleting(true)
      setError(null)

      const response = await fetch("/api/articles/delete-all", {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const data = await response.json()
      console.log("Delete all articles response:", data)

      // Clear the articles state
      setArticles([])
      setFilteredArticles([])

      toast({
        title: "Articles Deleted",
        description: `Successfully deleted ${data.deletedCount} articles.`,
      })
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

  // Fetch articles
  const fetchArticles = async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true)

        // Trigger cleanup when refreshing
        try {
          await fetch("/api/cleanup")
        } catch (cleanupError) {
          console.error("Error cleaning up old articles:", cleanupError)
          // Continue even if cleanup fails
        }
      } else {
        setIsLoading(true)
      }
      setError(null)
      setAnalysisErrors([])

      // Build the API URL with query parameters
      const url = new URL("/api/articles", window.location.origin)
      if (filters.category !== "all") {
        url.searchParams.append("category", filters.category)
      }
      if (refresh) {
        url.searchParams.append("refresh", "true")
      }
      // Add parameter to include unanalyzed articles
      url.searchParams.append("includeUnanalyzed", "true")

      const response = await fetch(url.toString())
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Check for analysis errors
      if (data.errors && data.errors.length > 0) {
        setAnalysisErrors(data.errors)

        // Show toast for analysis errors
        if (refresh) {
          toast({
            variant: "warning",
            title: "Analysis Issues",
            description: `${data.errors.length} articles had analysis issues.`,
          })
        }
      }

      // Include all articles, both analyzed and unanalyzed
      setArticles(data.articles || [])

      // Show toast for successful refresh
      if (refresh) {
        toast({
          title: "Articles Refreshed",
          description: `Successfully loaded ${data.articles.length} articles.`,
        })
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error)
      setError(`Failed to load articles: ${error instanceof Error ? error.message : "Unknown error"}`)

      if (refresh) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to refresh articles: ${error instanceof Error ? error.message : "Unknown error"}`,
        })
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Poll for updates to check if unanalyzed articles have been analyzed
  useEffect(() => {
    // Only poll if there are unanalyzed articles
    const hasUnanalyzedArticles = articles.some((article) => article.analyzed === false)

    if (!hasUnanalyzedArticles) return

    const pollInterval = setInterval(() => {
      // Only fetch if we're not already loading or refreshing
      if (!isLoading && !isRefreshing) {
        fetchArticles()
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }, [articles, isLoading, isRefreshing])

  // Fetch articles when component mounts or when category filter changes
  useEffect(() => {
    fetchArticles()
  }, [filters.category])

  // Apply filters whenever they change or articles change
  useEffect(() => {
    if (!articles.length) return

    const filtered = articles.filter((article) => {
      // Include unanalyzed articles
      if (article.analyzed === false) return true

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
            {isRefreshing ? "Refreshing..." : "Refresh"}
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
                  <CardFooter className="flex flex-wrap gap-2 border-t p-4">
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
                      icon={<Target size={14} />}
                      label="Target"
                      text={article.metrics.targetGeneration}
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
