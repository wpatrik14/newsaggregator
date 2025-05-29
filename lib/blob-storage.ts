import { put, list, del } from "@vercel/blob"
import type { Article } from "@/types/article"

const ARTICLES_PREFIX = "articles/"
const MAX_AGE_MS = 60 * 60 * 1000 // 1 hour in milliseconds
const RATE_LIMIT_DELAY = 500 // Delay between requests in ms to avoid rate limiting

// In-memory cache to track articles being processed
const articlesBeingProcessed = new Set<string>()
const processedArticleUrls = new Set<string>()

// Helper function to normalize URLs for comparison
function normalizeUrl(url: string): string {
  if (!url) return ""
  try {
    // Handle cases where URL might be a pathname
    const baseUrl = url.startsWith("http") ? url : `https://example.com${url.startsWith("/") ? "" : "/"}${url}`
    const u = new URL(baseUrl)
    // Remove protocol, www, query params, hash, and trailing slashes
    let result = `${u.hostname.replace("www.", "")}${u.pathname}`
      .replace(/\/+$/, "") // Remove trailing slashes
      .toLowerCase()

    // Remove common tracking parameters
    result = result.replace(/[?&]?(utm_|ref=|source=)[^&]+/g, "")

    return result
  } catch (e) {
    console.error("Error normalizing URL:", url, e)
    return url.toLowerCase()
  }
}

// Helper function to add delay between requests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Check if article is already being processed
export function isArticleBeingProcessed(articleId: string): boolean {
  return articlesBeingProcessed.has(articleId)
}

// Mark article as being processed
export function markArticleAsProcessing(articleId: string): void {
  articlesBeingProcessed.add(articleId)
}

// Mark article as finished processing
export function markArticleAsFinished(articleId: string): void {
  articlesBeingProcessed.delete(articleId)
}

// Store an article in Blob storage
export async function storeArticle(article: Article): Promise<string> {
  try {
    // Check if this article is already being processed
    if (isArticleBeingProcessed(article.id)) {
      console.log(`Article ${article.id} is already being processed, skipping`)
      return `processing:${article.id}`
    }

    // Check if we've already processed this URL
    if (article.url) {
      const normalizedUrl = normalizeUrl(article.url)
      if (processedArticleUrls.has(normalizedUrl)) {
        console.log(`Article with URL ${article.url} already processed, skipping`)
        return `duplicate:${article.id}`
      }

      // Mark URL as processed
      processedArticleUrls.add(normalizedUrl)
    }

    // Mark as being processed if it's unanalyzed
    if (!article.analyzed) {
      markArticleAsProcessing(article.id)
    }

    // Check for duplicates only for new articles
    if (!article.analyzed) {
      try {
        const isDuplicate = await checkDuplicateArticle(article)
        if (isDuplicate) {
          console.log(`Article with URL ${article.url} already exists, skipping storage`)
          markArticleAsFinished(article.id)
          return isDuplicate
        }
      } catch (duplicateError) {
        console.error("Error checking for duplicate article:", duplicateError)
        // Continue with storing the article
      }
    }

    // Add a timestamp for cleanup purposes
    const articleWithTimestamp = {
      ...article,
      storedAt: new Date().toISOString(),
    }

    const articleJson = JSON.stringify(articleWithTimestamp)

    // Add a small delay before storing to avoid rate limiting
    await delay(RATE_LIMIT_DELAY)

    const blob = await put(`${ARTICLES_PREFIX}${article.id}.json`, articleJson, {
      contentType: "application/json",
      access: "public",
      allowOverwrite: true, // Allow overwriting for analysis updates
    })

    // Mark as finished processing when analysis is complete
    if (article.analyzed) {
      markArticleAsFinished(article.id)
    }

    return blob.url
  } catch (error) {
    console.error(`Error storing article ${article.id} in Blob storage:`, error)
    markArticleAsFinished(article.id)
    return `error:${article.id}`
  }
}

// Check if an article with the same URL already exists
async function checkDuplicateArticle(article: Article): Promise<string | null> {
  if (!article.url) {
    console.warn("Article has no URL, cannot check for duplicates")
    return null
  }

  try {
    // Get the normalized URL for comparison
    const normalizedUrl = normalizeUrl(article.url)

    // List recent blobs to check for duplicates
    const { blobs } = await list({
      prefix: ARTICLES_PREFIX,
      limit: 100, // Check last 100 articles
    })

    // Check each blob for URL matches
    for (const blob of blobs) {
      try {
        // Extract ID from the path
        const pathParts = blob.pathname.split("/")
        const filename = pathParts[pathParts.length - 1]
        const id = filename.replace(".json", "")

        // Skip the current article if it's being updated
        if (id === article.id) continue

        // Add a small delay between requests
        await delay(RATE_LIMIT_DELAY)

        // Try to get the article, but don't throw if it doesn't exist
        const existingArticle = await getArticleFromBlobSafe(id)
        if (!existingArticle) continue

        // Check if URLs match (normalized)
        if (existingArticle.url && normalizeUrl(existingArticle.url) === normalizedUrl) {
          console.log(`Found duplicate article by URL: ${article.url}`)
          return blob.url
        }

        // Check if titles are very similar and from same source
        if (existingArticle.source === article.source && similarTitles(existingArticle.title, article.title)) {
          console.log(`Found similar article by title: ${article.title}`)
          return blob.url
        }
      } catch (error) {
        console.error("Error checking article content:", error)
        continue
      }
    }

    return null
  } catch (error) {
    console.error("Error in checkDuplicateArticle:", error)
    return null
  }
}

// Helper function to check if titles are similar
function similarTitles(title1: string, title2: string): boolean {
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .trim()

  const normalizedTitle1 = normalize(title1)
  const normalizedTitle2 = normalize(title2)

  if (normalizedTitle1 === normalizedTitle2) return true

  if (normalizedTitle1.includes(normalizedTitle2) || normalizedTitle2.includes(normalizedTitle1)) {
    return true
  }

  return false
}

// Store multiple articles in Blob storage
export async function storeArticles(articles: Article[]): Promise<void> {
  for (const article of articles) {
    await storeArticle(article)
    await delay(RATE_LIMIT_DELAY)
  }
}

// Safe version of getArticleFromBlob that doesn't throw on 404
async function getArticleFromBlobSafe(id: string): Promise<Article | null> {
  try {
    return await getArticleFromBlob(id)
  } catch (error) {
    console.log(
      `Article ${id} not found or error fetching: ${error instanceof Error ? error.message : "Unknown error"}`,
    )
    return null
  }
}

// Get an article from Blob storage by ID
export async function getArticleFromBlob(id: string): Promise<Article | null> {
  try {
    // Handle invalid IDs
    if (!id || id === "undefined" || id === "null") {
      console.warn(`Invalid article ID: ${id}`)
      return null
    }

    const { blobs } = await list({ prefix: `${ARTICLES_PREFIX}${id}.json` })

    if (!blobs.length) {
      return null
    }

    const blob = blobs[0]
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(blob.url, {
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      clearTimeout(timeoutId)

      // Handle 404 gracefully
      if (response.status === 404) {
        console.log(`Article ${id} not found (404)`)
        return null
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch article: ${response.status}`)
      }

      const articleJson = await response.text()

      try {
        const article = JSON.parse(articleJson) as Article

        if (article.metrics && !article.analyzed) {
          article.analyzed = true
        }

        return article
      } catch (parseError) {
        console.error(`Invalid JSON for article ${id}: ${articleJson.substring(0, 50)}...`)
        return null
      }
    } catch (fetchError) {
      // Handle fetch errors (like timeout, network issues)
      if (fetchError.name === "AbortError") {
        console.error(`Timeout fetching article ${id}`)
      } else {
        console.error(`Error fetching article ${id}: ${fetchError.message}`)
      }
      return null
    }
  } catch (error) {
    console.error(`Error getting article ${id} from Blob storage:`, error)
    return null
  }
}

// List all articles from Blob storage
export async function listArticlesFromBlob(): Promise<Article[]> {
  try {
    const { blobs } = await list({ prefix: ARTICLES_PREFIX })

    if (!blobs.length) {
      return []
    }

    const blobsToProcess = blobs.slice(0, 50)
    const articles: Article[] = []

    for (const blob of blobsToProcess) {
      try {
        await delay(RATE_LIMIT_DELAY)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        try {
          const response = await fetch(blob.url, {
            signal: controller.signal,
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          })

          clearTimeout(timeoutId)

          // Skip if 404
          if (response.status === 404) {
            console.log(`Article at ${blob.url} not found (404), skipping`)
            continue
          }

          if (!response.ok) {
            console.warn(`Received ${response.status} when fetching ${blob.url}, skipping`)
            continue
          }

          const articleJson = await response.text()

          try {
            const article = JSON.parse(articleJson) as Article

            if (article.metrics && !article.analyzed) {
              article.analyzed = true
            }

            articles.push(article)
          } catch (parseError) {
            console.error(`Invalid JSON from ${blob.url}: ${articleJson.substring(0, 50)}...`)
            continue
          }
        } catch (fetchError) {
          // Handle fetch errors (like timeout, network issues)
          if (fetchError.name === "AbortError") {
            console.error(`Timeout fetching article at ${blob.url}`)
          } else {
            console.error(`Error fetching article at ${blob.url}: ${fetchError.message}`)
          }
          continue
        }
      } catch (error) {
        console.error(`Error processing blob at ${blob.url}:`, error)
        continue
      }
    }

    return articles
  } catch (error) {
    console.error("Error listing articles from Blob storage:", error)
    return []
  }
}

// Delete an article from Blob storage
export async function deleteArticleFromBlob(id: string): Promise<void> {
  try {
    await del(`${ARTICLES_PREFIX}${id}.json`)
    // Also remove from processing tracking
    markArticleAsFinished(id)
  } catch (error) {
    console.error(`Error deleting article ${id} from Blob storage:`, error)
  }
}

// Delete all articles from Blob storage
export async function deleteAllArticlesFromBlob(): Promise<number> {
  try {
    const { blobs } = await list({ prefix: ARTICLES_PREFIX })
    let deletedCount = 0

    for (const blob of blobs) {
      try {
        const pathParts = blob.pathname.split("/")
        const filename = pathParts[pathParts.length - 1]
        const id = filename.replace(".json", "")

        await deleteArticleFromBlob(id)
        deletedCount++
        await delay(RATE_LIMIT_DELAY)
      } catch (error) {
        console.error(`Error deleting blob at ${blob.url}:`, error)
        continue
      }
    }

    // Clear all tracking sets
    articlesBeingProcessed.clear()
    processedArticleUrls.clear()

    console.log(`Deleted ${deletedCount} articles`)
    return deletedCount
  } catch (error) {
    console.error("Error deleting all articles:", error)
    return 0
  }
}

// Clean up old articles (older than 1 hour)
export async function cleanupOldArticles(): Promise<number> {
  try {
    const { blobs } = await list({ prefix: ARTICLES_PREFIX })
    const now = new Date()
    let deletedCount = 0

    for (const blob of blobs) {
      try {
        await delay(RATE_LIMIT_DELAY)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        try {
          const response = await fetch(blob.url, {
            signal: controller.signal,
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          })

          clearTimeout(timeoutId)

          // Skip if 404
          if (response.status === 404) {
            console.log(`Article at ${blob.url} not found (404), skipping`)
            continue
          }

          if (!response.ok) {
            console.warn(`Received ${response.status} when fetching ${blob.url}, skipping`)
            continue
          }

          const articleJson = await response.text()
          let article: Article & { storedAt?: string }

          try {
            article = JSON.parse(articleJson) as Article & { storedAt?: string }
          } catch (parseError) {
            console.error(`Invalid JSON from ${blob.url}: ${articleJson.substring(0, 50)}...`)
            continue
          }

          if (!article.storedAt) continue

          const storedAt = new Date(article.storedAt)
          const ageMs = now.getTime() - storedAt.getTime()

          if (ageMs > MAX_AGE_MS) {
            const pathParts = blob.pathname.split("/")
            const filename = pathParts[pathParts.length - 1]
            const id = filename.replace(".json", "")

            await delay(RATE_LIMIT_DELAY)
            await deleteArticleFromBlob(id)
            deletedCount++
          }
        } catch (fetchError) {
          // Handle fetch errors (like timeout, network issues)
          if (fetchError.name === "AbortError") {
            console.error(`Timeout fetching article at ${blob.url}`)
          } else {
            console.error(`Error fetching article at ${blob.url}: ${fetchError.message}`)
          }
          continue
        }
      } catch (error) {
        console.error(`Error processing blob at ${blob.url}:`, error)
        continue
      }
    }

    console.log(`Cleaned up ${deletedCount} old articles`)
    return deletedCount
  } catch (error) {
    console.error("Error cleaning up old articles:", error)
    return 0
  }
}
