import { NextResponse } from "next/server"
import { fetchTopHeadlines } from "@/lib/news-api"
import { listArticlesFromBlob } from "@/lib/blob-storage"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") || undefined
    const country = searchParams.get("country") || "us"
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "5", 10)
    const refresh = searchParams.get("refresh") === "true"
    const includeUnanalyzed = searchParams.get("includeUnanalyzed") === "true"

    let articles = []
    let errors: string[] = []

    // Verify OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is missing. Please add OPENAI_API_KEY to your environment variables." },
        { status: 500 },
      )
    }

    if (refresh) {
      // Fetch fresh articles from News API
      const result = await fetchTopHeadlines(country, category, pageSize, page)
      articles = result.articles
      errors = result.errors
    } else {
      // Try to get articles from Blob storage first
      const storedArticles = await listArticlesFromBlob()

      // Filter articles based on includeUnanalyzed parameter
      if (includeUnanalyzed) {
        articles = storedArticles // Include all articles
      } else {
        // Only return articles that have been analyzed
        articles = storedArticles.filter((article) => article.analyzed === true)
      }

      // If no articles in Blob storage, fetch from News API
      if (articles.length === 0) {
        const result = await fetchTopHeadlines(country, category, pageSize, page)
        articles = result.articles
        errors = result.errors
      }
    }

    return NextResponse.json({ articles, errors })
  } catch (error) {
    console.error("Error fetching articles:", error)
    return NextResponse.json(
      { error: `Failed to fetch articles: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
