import type { Article } from "@/types/article"
import { v4 as uuidv4 } from "uuid"
import { analyzeArticle } from "./ai"
import { storeArticle, getArticleFromBlob } from "./blob-storage"
import { ArticleCategory } from "@/types/article"

// NewsData.io API endpoints
const NEWS_DATA_URL = "https://newsdata.io/api/1/news"

// NewsData.io response types
interface NewsDataArticle {
  article_id: string
  title: string
  link: string
  description: string
  content: string | null
  pubDate: string
  image_url: string | null
  source_id: string
  source_priority: number
  country: string[]
  category: string[]
  language: string
  creator: string[] | null
}

interface NewsDataResponse {
  status: string
  totalResults: number
  results: NewsDataArticle[]
  nextPage?: number
  code?: string
  message?: string
}

// Helper function to add delay between requests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Track the current page for pagination
let currentPage = 1

// Track articles being analyzed to prevent duplicates
const articlesInProgress = new Set<string>()

// Search for articles using NewsData.io API
export async function searchArticles(
  query: string,
  from?: string,
  to?: string,
  sortBy: "relevancy" | "popularity" | "publishedAt" = "publishedAt",
  size: number = 20
): Promise<{ articles: Article[]; errors: string[] }> {
  try {
    console.log(`Searching articles: query=${query}, from=${from}, to=${to}, sortBy=${sortBy}, size=${size}`)

    const apiKey = process.env.NEWSDATA_API_KEY

    if (!apiKey) {
      throw new Error("NewsData.io API key is missing. Please add NEWSDATA_API_KEY to your environment variables.")
    }

    // Build the URL with query parameters
    const url = new URL(NEWS_DATA_URL)
    url.searchParams.append("apikey", apiKey)
    url.searchParams.append("q", query)
    
    if (from) url.searchParams.append("from_date", from)
    if (to) url.searchParams.append("to_date", to)
    
    // Map sortBy to NewsData.io's format
    const sortMap = {
      relevancy: "relevancy",
      popularity: "popularity",
      publishedAt: "published_desc"
    }
    url.searchParams.append("sort", sortMap[sortBy] || "published_desc")
    
    url.searchParams.append("size", size.toString())
    url.searchParams.append("language", "hu") // Limit to Hungarian articles
    
    console.log(`Making search request to NewsData.io: ${url.toString()}`)
    
    const response = await fetch(url.toString())

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`NewsData.io error: ${errorData.message || response.statusText}`)
    }

    const data: NewsDataResponse = await response.json()
    console.log(`Received ${data.results?.length || 0} articles from NewsData.io search`)

    if (data.status !== "success") {
      throw new Error(`NewsData.io error: ${data.message || 'Unknown error'}`)
    }

    // Process articles
    const processedArticles: Article[] = []
    const errors: string[] = []

    for (const apiArticle of data.results || []) {
      try {
        // Skip if we've already processed this article
        const articleKey = `${apiArticle.source_id}-${apiArticle.article_id}`
        if (articlesInProgress.has(articleKey)) {
          console.log(`Skipping article already being processed: ${articleKey}`)
          continue
        }

        articlesInProgress.add(articleKey)

        const article: Article = {
          id: apiArticle.article_id || uuidv4(),
          title: apiArticle.title,
          summary: apiArticle.description || '',
          content: apiArticle.content || apiArticle.description || '',
          url: apiArticle.link,
          imageUrl: apiArticle.image_url || '',
          source: apiArticle.source_id || 'Unknown',
          publishedAt: apiArticle.pubDate,
          metrics: {
            clickbaitScore: 0,
            biasScore: 0,
            targetGeneration: '',
            politicalLeaning: '',
            sentimentScore: 0,
            sentimentTone: 'neutral',
            readabilityScore: 0,
            readingLevel: '',
            emotionalTone: 'neutral',
            engagementScore: 0,
            bias: 0,
          },
          analyzed: false,
          storedAt: new Date().toISOString(),
          categories: (apiArticle.category?.length 
            ? apiArticle.category
                .map(c => {
                  const lowerCased = c.toLowerCase();
                  // Only include categories that match our ArticleCategory type
                  if ([
                    'sport', 'economy', 'politics', 'war', 'technology', 'religion', 
                    'work', 'travel', 'health', 'entertainment', 'science', 'education', 
                    'environment', 'fashion', 'food', 'lifestyle', 'other'
                  ].includes(lowerCased)) {
                    return lowerCased as ArticleCategory;
                  }
                  return 'other';
                })
                .filter((cat, index, arr) => arr.indexOf(cat) === index) // Remove duplicates
                .slice(0, 3) // Limit to 3 categories
            : ['other']
          ) as ArticleCategory[]
        }


        processedArticles.push(article)
      } catch (error) {
        console.error('Error processing article:', error)
        errors.push(`Failed to process article: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return { articles: processedArticles, errors }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
    console.log(
      `Fetching top headlines: country=${country}, category=${category}, size=${size}`
    )

    const apiKey = process.env.NEWSDATA_API_KEY

    if (!apiKey) {
      throw new Error(
        "NewsData.io API key is missing. Please add NEWSDATA_API_KEY to your environment variables."
      )
    }

    // Build the URL with query parameters
    const url = new URL(NEWS_DATA_URL)
    url.searchParams.append("apikey", apiKey)
    url.searchParams.append("country", country)
    if (category) url.searchParams.append("category", category.toLowerCase())
    url.searchParams.append("size", size.toString())
    url.searchParams.append("language", "hu")

    console.log(`Making request to NewsData.io: ${url.toString()}`)

    const response = await fetch(url.toString())

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `NewsData.io error: ${errorData.message || response.statusText}`
      )
    }

    const data: NewsDataResponse = await response.json()
    console.log(`Received ${data.results?.length || 0} articles from NewsData.io`)

    if (data.status !== "success") {
      throw new Error(`NewsData.io error: ${data.message || 'Unknown error'}`)
    }

    // Process articles
    const processedArticles: Article[] = []
    const errors: string[] = []

    for (const article of data.results || []) {
      try {
        // Generate a unique ID for the article
        const id = article.article_id || uuidv4()
        const content = article.content || article.description || ""

        // Map NewsData.io categories to our categories
        const mapCategory = (cat: string): ArticleCategory => {
          const lowerCat = cat.toLowerCase()
          if (["sports", "sport"].includes(lowerCat)) return 'sport'
          if (["business", "economics", "economy"].includes(lowerCat)) return 'economy'
          if (["politics"].includes(lowerCat)) return 'politics'
          if (["war", "conflict"].includes(lowerCat)) return 'war'
          if (["technology", "tech"].includes(lowerCat)) return 'technology'
          if (["science"].includes(lowerCat)) return 'science'
          if (["religion", "faith"].includes(lowerCat)) return 'religion'
          if (["work", "jobs", "career"].includes(lowerCat)) return 'work'
          if (["travel", "tourism"].includes(lowerCat)) return 'travel'
          if (["health", "medicine", "healthcare"].includes(lowerCat)) return 'health'
          if (["entertainment", "celebrities", "movies", "music"].includes(lowerCat)) return 'entertainment'
          if (["education"].includes(lowerCat)) return 'education'
          if (["environment", "climate"].includes(lowerCat)) return 'environment'
          if (["fashion", "style"].includes(lowerCat)) return 'fashion'
          if (["food", "cooking", "restaurants"].includes(lowerCat)) return 'food'
          if (["lifestyle"].includes(lowerCat)) return 'lifestyle'
          return 'other'
        }

        // Get categories from article or use default
        const categories: ArticleCategory[] = (article.category?.length > 0 
          ? [...new Set(article.category.map(mapCategory))]
              .filter((cat): cat is ArticleCategory => 
                ['sport', 'economy', 'politics', 'war', 'technology', 'religion', 
                 'work', 'travel', 'health', 'entertainment', 'science', 'education', 
                 'environment', 'fashion', 'food', 'lifestyle', 'other'].includes(cat)
              )
              .slice(0, 3) // Limit to 3 categories
          : ['other'])

        // Create the article object first (unanalyzed)
        const newArticle: Article = {
          id,
          title: article.title,
          summary: article.description || "",
          content: content,
          url: article.link,
          imageUrl: article.image_url || "",
          source: article.source_id || "Unknown",
          publishedAt: article.pubDate,
          metrics: {
            clickbaitScore: 0,
            biasScore: 0,
            targetGeneration: "",
            politicalLeaning: "",
            sentimentScore: 0,
            sentimentTone: "neutral",
            readabilityScore: 0,
            readingLevel: "",
            emotionalTone: "neutral",
            engagementScore: 0,
            bias: 0,
          },
          analyzed: false, // Mark as unanalyzed initially
          categories: categories
        }

        try {
          // Check if we already have this article in our storage using article_id
          if (typeof getArticleFromBlob === 'function') {
            // First try to find by article_id if available
            const articleIdToCheck = article.article_id || article.link;
            const existingArticle = await getArticleFromBlob(articleIdToCheck);
            if (existingArticle) {
              console.log(`Article already exists in storage: ${articleIdToCheck}`);
              processedArticles.push(existingArticle);
              continue;
            }
          }

          // Store the unanalyzed article first to prevent duplicates
          await storeArticle(newArticle)
          console.log(`Stored unanalyzed article: ${article.title}`)

          // Add to in-progress set to prevent duplicate analysis
          const articleIdToCheck = article.article_id || article.link;
          articlesInProgress.add(articleIdToCheck)

          // Start analysis in the background if we have content
          if (content) {
            analyzeArticleInBackground(newArticle, article.title, content)
              .catch((error) => {
                console.error(`Error analyzing article: ${error}`)
                errors.push(`Failed to analyze article: ${article.title}`)
              })
          }

          processedArticles.push(newArticle)
        } catch (storageError) {
          console.error("Error storing article:", storageError)
          errors.push(`Failed to store article: ${article.title}`)
        }
      } catch (error) {
        const errorMessage = `Error processing article "${article.title || "Unknown"}": ${error instanceof Error ? error.message : "Unknown error"}`
        console.error(errorMessage)
        errors.push(errorMessage)
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
  const articleId = article.id;
  
  try {
    console.log(`Starting background AI analysis for article: "${title.substring(0, 30)}..."`)

    // Add a delay to avoid rate limiting
    await delay(1000)
    
    try {
      // Analyze the article content
      const { metrics, summary, aiSummary, categories } = await analyzeArticle(article.title, content)

      console.log(`Analysis successful for article: "${title.substring(0, 30)}..."`)
      console.log(`Categories: ${JSON.stringify(categories)}`)
      console.log(`Metrics: ${JSON.stringify(metrics, null, 2)}`)

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
        // Use categories from AI analysis, fallback to existing categories if none
        categories: (categories && categories.length > 0) 
          ? (categories as ArticleCategory[]) 
          : (article.categories || ['other'] as ArticleCategory[])
      }

      // Store the updated article in Blob storage
      await storeArticle(updatedArticle)
      console.log(`Successfully stored analyzed article: "${title.substring(0, 30)}..."`)
      
      return updatedArticle
    } catch (error) {
      console.error(`Error analyzing article "${title.substring(0, 30)}...":`, error)
      // If analysis fails, ensure we still have a default category
      const updatedArticle: Article = {
        ...article,
        analyzed: true,
        categories: (article.categories?.length ? article.categories : ['other']) as ArticleCategory[]
      }
      await storeArticle(updatedArticle)
      return updatedArticle
    }
  } catch (error) {
    console.error(`Error in analyzeArticleInBackground for article "${title.substring(0, 30)}...":`, error)
    throw error // Re-throw to be caught by the caller
  } finally {
    // Always remove from in-progress set when done
    articlesInProgress.delete(articleId);
  }
}
