import type { Article } from "@/types/article"
import { v4 as uuidv4 } from "uuid"
import { analyzeArticle } from "./ai"
import { storeArticle, getArticleFromBlob, isArticleBeingProcessed } from "./blob-storage"
import type { ArticleCategory } from "@/types/article"

// NewsAPI.org endpoints
const NEWS_API_BASE_URL = "https://newsapi.org/v2"
const TOP_HEADLINES_URL = `${NEWS_API_BASE_URL}/top-headlines`
const EVERYTHING_URL = `${NEWS_API_BASE_URL}/everything`

// NewsAPI.org response types
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

// Track articles being analyzed to prevent duplicates
const articlesInAnalysis = new Set<string>()

// Search for articles using NewsAPI.org
export async function searchArticles(
  query: string,
  from?: string,
  to?: string,
  sortBy: "relevancy" | "popularity" | "publishedAt" = "publishedAt",
  size = 20,
): Promise<{ articles: Article[]; errors: string[] }> {
  try {
    console.log(`Searching articles: query=${query}, from=${from}, to=${to}, sortBy=${sortBy}, size=${size}`)

    const apiKey = process.env.NEWS_ORG_API_KEY

    if (!apiKey) {
      throw new Error("NewsAPI.org API key is missing. Please add NEWS_ORG_API_KEY to your environment variables.")
    }

    const url = new URL(EVERYTHING_URL)
    url.searchParams.append("apiKey", apiKey)
    url.searchParams.append("q", query)

    if (from) url.searchParams.append("from", from)
    if (to) url.searchParams.append("to", to)

    const sortMap = {
      relevancy: "relevancy",
      popularity: "popularity",
      publishedAt: "publishedAt",
    }
    url.searchParams.append("sortBy", sortMap[sortBy] || "publishedAt")

    url.searchParams.append("pageSize", size.toString())
    url.searchParams.append("language", "en") // NewsAPI.org uses 'en' for English

    console.log(`Making search request to NewsAPI.org: ${url.toString()}`)

    const response = await fetch(url.toString())

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`NewsAPI.org error: ${errorData.message || response.statusText}`)
    }

    const data: NewsApiResponse = await response.json()
    console.log(`Received ${data.articles?.length || 0} articles from NewsAPI.org search`)

    if (data.status !== "ok") {
      throw new Error(`NewsAPI.org error: ${data.message || "Unknown error"}`)
    }

    // Only return analyzed articles for search
    const processedArticles: Article[] = []
    const errors: string[] = []

    for (const apiArticle of data.articles || []) {
      try {
        const articleKey = apiArticle.url

        // Skip if already being processed
        if (isArticleBeingProcessed(articleKey) || articlesInAnalysis.has(articleKey)) {
          console.log(`Skipping article already being processed: ${articleKey}`)
          continue
        }

        // For search, we'll analyze immediately and only return analyzed articles
        const content = apiArticle.content || apiArticle.description || ""
        if (!content) {
          console.log(`Skipping article with no content: ${apiArticle.title}`)
          continue
        }

        try {
          articlesInAnalysis.add(articleKey)

          const { metrics, summary, aiSummary, categories } = await analyzeArticle(apiArticle.title, content)

          const article: Article = {
            id: uuidv4(),
            title: apiArticle.title,
            summary: summary,
            content: content,
            url: apiArticle.url,
            imageUrl: apiArticle.urlToImage || "",
            source: apiArticle.source.name || "Unknown",
            publishedAt: apiArticle.publishedAt,
            metrics,
            analyzed: true,
            storedAt: new Date().toISOString(),
            aiSummary,
            categories: categories || ["other"],
          }

          processedArticles.push(article)
        } catch (analysisError) {
          console.error(`Failed to analyze article: ${apiArticle.title}`, analysisError)
          errors.push(`Failed to analyze article: ${apiArticle.title}`)
        } finally {
          articlesInAnalysis.delete(articleKey)
        }
      } catch (error) {
        console.error("Error processing article:", error)
        errors.push(`Failed to process article: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    return { articles: processedArticles, errors }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error(`Error in searchArticles: ${errorMessage}`)
    return { articles: [], errors: [errorMessage] }
  }
}

export async function fetchTopHeadlines(
  country = "us",
  category?: string,
  size = 5,
): Promise<{ articles: Article[]; errors: string[] }> {
  try {
    console.log(`Fetching top headlines: country=${country}, category=${category}, size=${size}`)

    const apiKey = process.env.NEWS_ORG_API_KEY

    if (!apiKey) {
      throw new Error("NewsAPI.org API key is missing. Please add NEWS_ORG_API_KEY to your environment variables.")
    }

    const url = new URL(TOP_HEADLINES_URL)
    url.searchParams.append("apiKey", apiKey)
    url.searchParams.append("country", country)
    if (category) url.searchParams.append("category", category.toLowerCase())
    url.searchParams.append("pageSize", size.toString())

    console.log(`Making request to NewsAPI.org: ${url.toString()}`)

    const response = await fetch(url.toString())

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`NewsAPI.org error: ${errorData.message || response.statusText}`)
    }

    const data: NewsApiResponse = await response.json()
    console.log(`Received ${data.articles?.length || 0} articles from NewsAPI.org`)

    if (data.status !== "ok") {
      throw new Error(`NewsAPI.org error: ${data.message || "Unknown error"}`)
    }

    const processedArticles: Article[] = []
    const errors: string[] = []

    for (const article of data.articles || []) {
      try {
        // Create a unique ID based on URL
        const id = Buffer.from(article.url).toString("base64").substring(0, 16)
        const content = article.content || article.description || ""

        // Check if this article is already being processed
        if (isArticleBeingProcessed(id) || articlesInAnalysis.has(id)) {
          console.log(`Article ${id} is already being processed, skipping`)
          continue
        }

        // Check if article already exists - use try/catch to handle errors
        let existingArticle = null
        try {
          existingArticle = await getArticleFromBlob(id)
        } catch (error) {
          console.log(
            `Error checking for existing article ${id}: ${error instanceof Error ? error.message : "Unknown error"}`,
          )
          // Continue with creating a new article
        }

        if (existingArticle) {
          console.log(`Article ${id} already exists, adding to results`)
          processedArticles.push(existingArticle)
          continue
        }

        // Skip articles without content
        if (!content) {
          console.log(`Skipping article with no content: ${article.title}`)
          continue
        }

        const mapCategory = (cat: string): ArticleCategory => {
          const lowerCat = cat.toLowerCase()
          if (["sports", "sport"].includes(lowerCat)) return "sport"
          if (["business", "economics", "economy"].includes(lowerCat)) return "economy"
          if (["politics"].includes(lowerCat)) return "politics"
          if (["war", "conflict"].includes(lowerCat)) return "war"
          if (["technology", "tech"].includes(lowerCat)) return "technology"
          if (["science"].includes(lowerCat)) return "science"
          if (["religion", "faith"].includes(lowerCat)) return "religion"
          if (["work", "jobs", "career"].includes(lowerCat)) return "work"
          if (["travel", "tourism"].includes(lowerCat)) return "travel"
          if (["health", "medicine", "healthcare"].includes(lowerCat)) return "health"
          if (["entertainment", "celebrities", "movies", "music"].includes(lowerCat)) return "entertainment"
          if (["education"].includes(lowerCat)) return "education"
          if (["environment", "climate"].includes(lowerCat)) return "environment"
          if (["fashion", "style"].includes(lowerCat)) return "fashion"
          if (["food", "cooking", "restaurants"].includes(lowerCat)) return "food"
          if (["lifestyle"].includes(lowerCat)) return "lifestyle"
          return "other"
        }

        // Map NewsAPI.org category to our categories
        const categories: ArticleCategory[] = category ? [mapCategory(category)] : ["other"]

        // Start analysis immediately and wait for it to complete
        if (!articlesInAnalysis.has(id)) {
          articlesInAnalysis.add(id)

          console.log(`Starting analysis for: ${article.title}`)

          try {
            const {
              metrics,
              summary,
              aiSummary,
              categories: analyzedCategories,
            } = await analyzeArticle(article.title, content)

            // Create article only after successful analysis
            const analyzedArticle: Article = {
              id,
              title: article.title,
              summary: summary,
              content: content,
              url: article.url,
              imageUrl: article.urlToImage || "",
              source: article.source.name || "Unknown",
              publishedAt: article.publishedAt,
              metrics,
              analyzed: true,
              categories: analyzedCategories && analyzedCategories.length > 0 ? analyzedCategories : categories,
              aiSummary,
            }

            // Store the analyzed article
            await storeArticle(analyzedArticle)
            console.log(`Successfully analyzed and stored: ${article.title}`)

            processedArticles.push(analyzedArticle)
          } catch (analysisError) {
            console.error(`Analysis failed for ${article.title}:`, analysisError)
            errors.push(`Failed to analyze article: ${article.title}`)
            // Don't add the article to processedArticles if analysis fails
          } finally {
            articlesInAnalysis.delete(id)
          }
        }
      } catch (error) {
        const errorMessage = `Error processing article "${article.title || "Unknown"}": ${error instanceof Error ? error.message : "Unknown error"}`
        console.error(errorMessage)
        errors.push(errorMessage)
      }
    }

    console.log(
      `Finished processing articles. Returning ${processedArticles.length} analyzed articles with ${errors.length} errors.`,
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
