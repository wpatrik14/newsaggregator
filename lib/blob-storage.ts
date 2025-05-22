import { put, list, del } from "@vercel/blob"
import type { Article } from "@/types/article"

const ARTICLES_PREFIX = "articles/"
const MAX_AGE_MS = 60 * 60 * 1000 // 1 hour in milliseconds
const RATE_LIMIT_DELAY = 500 // Delay between requests in ms to avoid rate limiting

// Helper function to add delay between requests
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Store an article in Blob storage
export async function storeArticle(article: Article): Promise<string> {
  try {
    // Skip duplicate check if the article is being updated (already analyzed)
    // Only check for duplicates for new articles
    if (!article.analyzed) {
      try {
        const isDuplicate = await checkDuplicateArticle(article)
        if (isDuplicate) {
          console.log(`Article with URL ${article.url} already exists, skipping storage`)
          return isDuplicate // Return the existing URL
        }
      } catch (duplicateError) {
        // Log the error but continue with storing the article
        console.error("Error checking for duplicate article:", duplicateError)
        // Don't return here, continue with storing the article
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
      access: "public", // Set access to public as required by Vercel Blob
      allowOverwrite: true, // Allow overwriting existing blobs with the same name
    })

    return blob.url
  } catch (error) {
    console.error(`Error storing article ${article.id} in Blob storage:`, error)
    // Return a dummy URL to allow the application to continue
    return `error:${article.id}`
  }
}

// Check if an article with the same URL already exists
// This function now has more robust error handling
async function checkDuplicateArticle(article: Article): Promise<string | null> {
  try {
    // List all blobs with the articles prefix
    const { blobs } = await list({ prefix: ARTICLES_PREFIX, limit: 50 }) // Increased limit to check more articles

    // If no blobs, no duplicates
    if (blobs.length === 0) {
      return null;
    }

    // First, check if we can find a match by URL without fetching content
    for (const blob of blobs) {
      try {
        // Extract ID from the path
        const pathParts = blob.pathname.split("/");
        const filename = pathParts[pathParts.length - 1];
        const id = filename.replace(".json", "");

        // Skip the current article if it's being updated
        if (id === article.id) {
          continue;
        }

        // If the URL is in the blob's path, it's likely a duplicate
        if (blob.pathname.includes(encodeURIComponent(article.url))) {
          return blob.url;
        }
      } catch (error) {
        console.error("Error checking blob path:", error);
        continue;
      }
    }

    // If no match found by path, check the content of a limited number of blobs
    const blobsToCheck = blobs.slice(0, 10); // Check up to 10 most recent blobs

    for (const blob of blobsToCheck) {
      try {
        // Add a small delay between requests to avoid rate limiting
        await delay(RATE_LIMIT_DELAY);

        // Use a timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(blob.url, {
          signal: controller.signal,
          // Add cache control to avoid caching issues
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })

        clearTimeout(timeoutId)

        // Check for rate limiting or other errors
        if (!response.ok) {
          console.warn(`Received ${response.status} when fetching ${blob.url}`)

          // If we're being rate limited, wait longer and skip this check
          if (response.status === 429) {
            console.warn("Rate limited by Blob storage API, skipping duplicate check");
            return null; // Skip duplicate check rather than failing
          }

          continue; // Skip this blob and try the next one
        }

        const existingArticle: Article = await response.json();

        // Check if the URLs match (case insensitive and ignoring URL parameters)
        const normalizeUrl = (url: string) => {
          try {
            const u = new URL(url);
            // Remove query parameters and hash, and normalize the URL
            return `${u.protocol}//${u.hostname}${u.pathname}`
              .replace(/\/$/, '') // Remove trailing slash
              .toLowerCase();
          } catch (e) {
            return url.toLowerCase();
          }
        };

        const normalizedNewUrl = normalizeUrl(article.url);
        const normalizedExistingUrl = existingArticle.url ? normalizeUrl(existingArticle.url) : '';

        if (normalizedNewUrl === normalizedExistingUrl) {
          console.log(`Found duplicate article by URL: ${article.url}`);
          return blob.url;
        }

        // Additional check for similar URLs with different protocols (http vs https)
        if (normalizedNewUrl.replace(/^https?:/, '') === normalizedExistingUrl.replace(/^https?:/, '')) {
          console.log(`Found duplicate article by URL (different protocols): ${article.url}`);
          return blob.url;
        }

        // Also check if the titles are similar (as a fallback)
        if (
          existingArticle.title &&
          article.title &&
          similarTitles(existingArticle.title, article.title)
        ) {
          console.log(`Found similar article by title: ${article.title}`);
          return blob.url;
        }
      } catch (error) {
        // If fetch fails for a specific blob, log and continue with the next one
        console.error(`Error checking article at ${blob.url}:`, error);
        continue; // Skip this blob and try the next one
      }
    }

    return null; // No duplicates found
  } catch (error) {
    // If the overall process fails, log and rethrow
    console.error("Error checking for duplicate articles:", error)
    throw error // Rethrow to be handled by the caller
  }
}

// Helper function to check if titles are similar
function similarTitles(title1: string, title2: string): boolean {
  // Normalize titles: lowercase and remove punctuation
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .trim()

  const normalizedTitle1 = normalize(title1)
  const normalizedTitle2 = normalize(title2)

  // If titles are identical after normalization
  if (normalizedTitle1 === normalizedTitle2) return true

  // Check if one title is contained within the other
  if (normalizedTitle1.includes(normalizedTitle2) || normalizedTitle2.includes(normalizedTitle1)) {
    return true
  }

  return false
}

// Store multiple articles in Blob storage
export async function storeArticles(articles: Article[]): Promise<void> {
  // Process articles sequentially to avoid rate limiting
  for (const article of articles) {
    await storeArticle(article)
    // Add a delay between storing articles
    await delay(RATE_LIMIT_DELAY)
  }
}

// Get an article from Blob storage by ID
export async function getArticleFromBlob(id: string): Promise<Article | null> {
  try {
    // List blobs with a specific prefix to find our article
    const { blobs } = await list({ prefix: `${ARTICLES_PREFIX}${id}.json` })

    if (!blobs.length) {
      return null
    }

    // Get the article blob
    const blob = blobs[0]

    // Use a timeout to prevent hanging requests
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    // Fetch the content from the URL
    const response = await fetch(blob.url, {
      signal: controller.signal,
      // Add cache control to avoid caching issues
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.status}`)
    }

    const articleJson = await response.text()

    try {
      const article = JSON.parse(articleJson) as Article

      // Ensure the article has the analyzed flag
      if (article.metrics && !article.analyzed) {
        article.analyzed = true
      }

      return article
    } catch (parseError) {
      console.error(`Invalid JSON for article ${id}: ${articleJson.substring(0, 50)}...`)
      return null
    }
  } catch (error) {
    console.error(`Error fetching article ${id} from Blob storage:`, error)
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

    // Limit the number of blobs we process to avoid rate limiting
    const blobsToProcess = blobs.slice(0, 50) // Only process the most recent 50 articles
    const articles: Article[] = []

    // Process blobs sequentially to avoid rate limiting
    for (const blob of blobsToProcess) {
      try {
        // Add a small delay between requests
        await delay(RATE_LIMIT_DELAY)

        // Use a timeout to prevent hanging requests
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch(blob.url, {
          signal: controller.signal,
          // Add cache control to avoid caching issues
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          console.warn(`Received ${response.status} when fetching ${blob.url}`)
          continue
        }

        const articleJson = await response.text()

        try {
          const article = JSON.parse(articleJson) as Article

          // Ensure the article has the analyzed flag
          if (article.metrics && !article.analyzed) {
            article.analyzed = true
          }

          articles.push(article)
        } catch (parseError) {
          console.error(`Invalid JSON from ${blob.url}: ${articleJson.substring(0, 50)}...`)
          continue
        }
      } catch (error) {
        console.error(`Error fetching article from ${blob.url}:`, error)
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
  } catch (error) {
    console.error(`Error deleting article ${id} from Blob storage:`, error)
  }
}

// Clean up old articles (older than 1 hour)
export async function cleanupOldArticles(): Promise<number> {
  try {
    const { blobs } = await list({ prefix: ARTICLES_PREFIX })
    const now = new Date()
    let deletedCount = 0

    // Process blobs sequentially to avoid rate limiting
    for (const blob of blobs) {
      try {
        // Add a small delay between requests
        await delay(RATE_LIMIT_DELAY)

        // Use a timeout to prevent hanging requests
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch(blob.url, {
          signal: controller.signal,
          // Add cache control to avoid caching issues
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          console.warn(`Received ${response.status} when fetching ${blob.url}`)
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

        // If article has no timestamp or is older than MAX_AGE_MS, delete it
        if (!article.storedAt) continue

        const storedAt = new Date(article.storedAt)
        const ageMs = now.getTime() - storedAt.getTime()

        if (ageMs > MAX_AGE_MS) {
          // Extract ID from the path
          const pathParts = blob.pathname.split("/")
          const filename = pathParts[pathParts.length - 1]
          const id = filename.replace(".json", "")

          // Add a small delay before deleting
          await delay(RATE_LIMIT_DELAY)

          await deleteArticleFromBlob(id)
          deletedCount++
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
