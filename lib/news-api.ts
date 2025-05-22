import type { Article } from "@/types/article"
import { v4 as uuidv4 } from "uuid"
import { analyzeArticle } from "./ai"
import { storeArticle } from "./blob-storage"

// News API endpoints
const TOP_HEADLINES_URL = "https://newsapi.org/v2/top-headlines"
const EVERYTHING_URL = "https://newsapi.org/v2/everything"

// News API response types
interface NewsApiArticle {
  source: {
    id: string | null
    name: string
  }
  author: string | null
  title: string
  description: string | null
  url: string
  urlToImage: string | null
  publishedAt: string
  content: string | null
}

interface NewsApiResponse {
  status: string
  totalResults: number
  articles: NewsApiArticle[]
  code?: string
  message?: string
}

// Helper function to add delay between requests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Track the current page for pagination
let currentPage = 1

// Track articles being analyzed to prevent duplicates
const articlesInProgress = new Set<string>()

// Fetch top headlines from News API
export async function fetchTopHeadlines(
  country = "us",
  category?: string,
  pageSize = 5, // Changed to 5 articles
  page?: number, // Make page optional
): Promise<{ articles: Article[]; errors: string[] }> {
  // If page is not provided, use the next page
  const pageToFetch = page || currentPage++
  
  // Reset to page 1 if we've gone too far (News API has a limit)
  if (pageToFetch > 5) {
    currentPage = 1
  }
  try {
    console.log(`Fetching top headlines: country=${country}, category=${category || "all"}`)

    const apiKey = process.env.NEWS_ORG_API_KEY

    if (!apiKey) {
      throw new Error("News API key is missing. Please add NEWS_ORG_API_KEY to your environment variables.")
    }

    // Build the URL with query parameters
    const url = new URL(TOP_HEADLINES_URL)
    url.searchParams.append("country", country)
    if (category && category !== "all") {
      url.searchParams.append("category", category)
    }
    url.searchParams.append("pageSize", pageSize.toString())
    url.searchParams.append("page", pageToFetch.toString())
    
    console.log(`Fetching page ${pageToFetch} of results`)

    // Make the request to News API
    console.log(`Making request to News API: ${url.toString()}`)
    const response = await fetch(url.toString(), {
      headers: {
        "X-Api-Key": apiKey,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`News API error: ${errorData.message || response.statusText}`)
    }

    const data: NewsApiResponse = await response.json()
    console.log(`Received ${data.articles.length} articles from News API`)

    if (data.status === "error") {
      throw new Error(`News API error: ${data.message}`)
    }

    // Process articles
    const processedArticles: Article[] = []
    const errors: string[] = []

    // Limit to 5 articles
    const articlesToProcess = data.articles.slice(0, 5)
    console.log(`Processing ${articlesToProcess.length} articles`)

    // Process articles sequentially
    for (const article of articlesToProcess) {
      try {
        // Skip articles with missing essential data
        if (!article.title) {
          console.log("Skipping article with missing title")
          continue
        }

        console.log(`Processing article: "${article.title.substring(0, 30)}..."`)

        // Create a unique ID for the article
        const id = uuidv4()

        // Extract content and clean it up
        const content = article.content || article.description || ""
        const cleanContent = content.replace(/\[\+\d+ chars\]$/, "")

        // Create the article object first (unanalyzed)
        const newArticle: Article = {
          id,
          title: article.title,
          summary: article.description || "",
          content: `<p>${cleanContent}</p>`,
          url: article.url,
          imageUrl: article.urlToImage || "/placeholder.svg?height=400&width=600",
          source: article.source.name,
          publishedAt: article.publishedAt,
          metrics: {
            clickbaitScore: 0,
            biasScore: 0,
            targetGeneration: "",
            politicalLeaning: "",
            sentimentScore: 0,
            sentimentTone: "",
            readabilityScore: 0,
            readingLevel: "",
            emotionalTone: "",
          },
          analyzed: false, // Mark as unanalyzed initially
        }

        try {
          // Add the unanalyzed article to the response
          processedArticles.push(newArticle)

          // Start the analysis in the background if not already in progress
          const articleKey = `${article.source.name}-${article.title}`;
          if (!articlesInProgress.has(articleKey)) {
            articlesInProgress.add(articleKey);
            
            // Use a small delay to ensure the article is added to storage first
            setTimeout(async () => {
              try {
                await analyzeArticleInBackground(newArticle, article.title, cleanContent);
              } catch (error) {
                console.error(`Background analysis error for "${article.title.substring(0, 30)}...":`, error);
              } finally {
                // Remove from in-progress set when done
                articlesInProgress.delete(articleKey);
              }
            }, 100);
          }
        } catch (storageError) {
          console.error(`Error storing article in Blob storage: "${article.title.substring(0, 30)}..."`, storageError)
          errors.push(
            `Failed to store article "${article.title}": ${storageError instanceof Error ? storageError.message : "Unknown error"}`,
          )
          // Continue with the next article
        }
      } catch (error) {
        console.error(`Error processing article "${article.title?.substring(0, 30) || "unknown"}":`, error)
        errors.push(
          `Error processing article "${article.title || "Unknown"}": ${error instanceof Error ? error.message : "Unknown error"}`,
        )
      }
    }

    console.log(
      `Finished processing articles. Returning ${processedArticles.length} processed articles with ${errors.length} errors.`,
    )
    return { articles: processedArticles, errors }
  } catch (error) {
    console.error("Error fetching top headlines:", error)
    return {
      articles: [],
      errors: [`Failed to fetch articles: ${error instanceof Error ? error.message : "Unknown error"}`],
    }
  }
}

// Analyze article in the background and update Blob storage
async function analyzeArticleInBackground(article: Article, title: string, content: string) {
  try {
    console.log(`Starting background AI analysis for article: "${title.substring(0, 30)}..."`)

    // Add a delay to avoid rate limiting
    await delay(1000)


    // Analyze the article with AI
    const { metrics, summary, aiSummary } = await analyzeArticle(title, content)

    console.log(`Analysis successful for article: "${title.substring(0, 30)}..."`)
    console.log(
      `Metrics: clickbait=${metrics.clickbaitScore}, bias=${metrics.biasScore}, target=${metrics.targetGeneration}`,
    )

    // Update the article with analysis results
    const updatedArticle: Article = {
      ...article,
      metrics: {
        ...article.metrics,
        ...metrics,
      },
      summary: summary || article.summary,
      aiSummary: aiSummary || "",
      analyzed: true,
    }

    // Store the updated article in Blob storage
    await storeArticle(updatedArticle)
    console.log(`Successfully stored analyzed article: "${title.substring(0, 30)}..."`)
  } catch (error) {
    console.error(`Error analyzing article "${title.substring(0, 30)}...":`, error)
    throw error // Re-throw to be caught by the caller
  }
}
