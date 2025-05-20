import type { Article } from "@/types/article"
import { analyzeArticle } from "./ai"
import { storeArticle } from "./blob-storage"
import Parser from "rss-parser"
import { v4 as uuidv4 } from "uuid"

// Define the sources we want to fetch from
const sources = [
  {
    name: "CNN",
    url: "http://rss.cnn.com/rss/cnn_topstories.rss",
  },
  {
    name: "BBC",
    url: "http://feeds.bbci.co.uk/news/rss.xml",
  },
  {
    name: "Reuters",
    url: "http://feeds.reuters.com/reuters/topNews",
  },
  // Add more sources as needed
]

export async function fetchArticlesFromSources(): Promise<Article[]> {
  const parser = new Parser()
  const articles: Article[] = []

  try {
    // Process each source
    for (const source of sources) {
      try {
        const feed = await parser.parseURL(source.url)

        // Process each item in the feed
        for (const item of feed.items.slice(0, 5)) {
          // Limit to 5 articles per source
          // Extract content
          const title = item.title || "Untitled"
          const content = item.content || item.contentSnippet || ""
          const summary = item.contentSnippet || ""
          const url = item.link || ""
          const publishedAt = item.pubDate || new Date().toISOString()

          // Generate a placeholder image URL
          const imageUrl = "/placeholder.svg?height=400&width=600"

          // Analyze the article with AI
          const metrics = await analyzeArticle(title, content)

          // Create a unique ID for the article
          const id = uuidv4()

          // Create the article object
          const article: Article = {
            id,
            title,
            summary,
            content,
            url,
            imageUrl,
            source: source.name,
            publishedAt,
            metrics,
          }

          // Store the article in Blob storage
          await storeArticle(article)

          articles.push(article)
        }
      } catch (error) {
        console.error(`Error fetching from ${source.name}:`, error)
      }
    }

    return articles
  } catch (error) {
    console.error("Error fetching articles:", error)
    return []
  }
}
