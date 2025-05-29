import { NextResponse } from "next/server"
import { fetchTopHeadlines } from "@/lib/news-api"
import { listArticlesFromBlob } from "@/lib/blob-storage"
import type { Article } from "@/types/article"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category") || undefined
    const country = searchParams.get("country") || "us"
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "5", 10)
    const refresh = searchParams.get("refresh") === "true"

    let articles: Article[] = []
    let errors: string[] = []

    // Verify API keys are available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is missing. Please add OPENAI_API_KEY to your environment variables." },
        { status: 500 },
      )
    }

    if (!process.env.NEWS_ORG_API_KEY) {
      return NextResponse.json(
        { error: "NewsAPI.org API key is missing. Please add NEWS_ORG_API_KEY to your environment variables." },
        { status: 500 },
      )
    }

    // Always try to get articles from Blob storage first
    const storedArticles = await listArticlesFromBlob()

    // Only return articles that have been analyzed
    const analyzedStoredArticles = storedArticles.filter((article) => article.analyzed === true)

    // Only fetch new articles if:
    // 1. Refresh is explicitly requested, OR
    // 2. No analyzed articles exist in storage at all
    const shouldFetchNew = refresh || analyzedStoredArticles.length === 0

    if (shouldFetchNew) {
      console.log(
        `Fetching new articles: refresh=${refresh}, existing analyzed articles=${analyzedStoredArticles.length}`,
      )

      const result = await fetchTopHeadlines(country, category, pageSize)

      if (refresh && analyzedStoredArticles.length > 0) {
        // When refreshing with existing articles, only add truly new ones
        const existingUrls = new Set(analyzedStoredArticles.map((a) => a.url.toLowerCase()))
        const existingTitles = new Set(
          analyzedStoredArticles.map((a) => `${a.title.toLowerCase()}-${a.source.toLowerCase()}`),
        )

        const newArticles = result.articles.filter((article: Article) => {
          const normalizedUrl = article.url.toLowerCase()
          const titleSourceKey = `${article.title.toLowerCase()}-${article.source.toLowerCase()}`

          return !existingUrls.has(normalizedUrl) && !existingTitles.has(titleSourceKey)
        })

        console.log(`Found ${newArticles.length} new analyzed articles out of ${result.articles.length} fetched`)

        // Add new articles to the beginning of the array
        articles = [...newArticles, ...analyzedStoredArticles]
      } else {
        // When no articles exist, use the fetched ones (all should be analyzed)
        articles = result.articles as Article[]
      }

      // Combine errors
      errors = [...(errors || []), ...(result.errors || [])]
    } else {
      console.log(`Using existing ${analyzedStoredArticles.length} analyzed articles from storage`)
      articles = analyzedStoredArticles
    }

    // Remove duplicates by URL and title+source combination
    const uniqueArticles: Article[] = []
    const seenUrls = new Set<string>()
    const seenTitles = new Set<string>()

    for (const article of articles) {
      const normalizedUrl = article.url.toLowerCase()
      const titleSourceKey = `${article.title.toLowerCase()}-${article.source.toLowerCase()}`

      if (!seenUrls.has(normalizedUrl) && !seenTitles.has(titleSourceKey)) {
        seenUrls.add(normalizedUrl)
        seenTitles.add(titleSourceKey)
        uniqueArticles.push(article)
      }
    }

    // Apply pagination to the deduplicated articles
    const startIndex = (page - 1) * pageSize
    const paginatedArticles = uniqueArticles.slice(startIndex, startIndex + pageSize)

    return NextResponse.json({
      articles: paginatedArticles,
      errors,
      totalArticles: uniqueArticles.length,
      hasMore: startIndex + pageSize < uniqueArticles.length,
    })
  } catch (error) {
    console.error("Error fetching articles:", error)
    return NextResponse.json(
      { error: `Failed to fetch articles: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    )
  }
}
