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
    const includeUnanalyzed = searchParams.get("includeUnanalyzed") === "true"

    let articles: Article[] = [];
    let errors: string[] = [];

    // Verify OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is missing. Please add OPENAI_API_KEY to your environment variables." },
        { status: 500 },
      )
    }

    // Always try to get articles from Blob storage first
    const storedArticles = await listArticlesFromBlob()

    // Filter articles based on includeUnanalyzed parameter
    if (includeUnanalyzed) {
      articles = storedArticles // Include all articles
    } else {
      // Only return articles that have been analyzed
      articles = storedArticles.filter((article) => article.analyzed === true)
    }

    // If no articles in Blob storage or refresh is requested, fetch from News API
    if (refresh || articles.length === 0) {
      // Pass only the expected parameters to fetchTopHeadlines
      const result = await fetchTopHeadlines(country, category, pageSize);
      
      // Create a map of existing article URLs and IDs for faster lookup
      const existingArticlesMap = new Map(
        articles.map((article: Article) => [article.url.toLowerCase(), article])
      );
      
      if (refresh) {
        // When refreshing, only add new articles that don't already exist
        const newArticles = result.articles.filter((article: Article) => {
          const normalizedUrl = article.url.toLowerCase();
          return !existingArticlesMap.has(normalizedUrl) && 
                 !articles.some((a: Article) => a.title === article.title && a.source === article.source);
        });
        
        // Add new articles to the beginning of the array
        articles = [...newArticles, ...articles] as Article[];
      } else {
        // When no articles exist, use the fetched ones
        articles = result.articles as Article[];
      }
      
      // Ensure we don't have any duplicates by URL or title+source
      const uniqueArticles: Article[] = [];
      const seenUrls = new Set<string>();
      const seenTitles = new Set<string>();
      
      for (const article of articles) {
        const normalizedUrl = article.url.toLowerCase();
        const titleSourceKey = `${article.title.toLowerCase()}-${article.source.toLowerCase()}`;
        
        if (!seenUrls.has(normalizedUrl) && !seenTitles.has(titleSourceKey)) {
          seenUrls.add(normalizedUrl);
          seenTitles.add(titleSourceKey);
          uniqueArticles.push(article);
        }
      }
      
      // Apply pagination to the deduplicated articles
      const startIndex = (page - 1) * pageSize;
      articles = uniqueArticles.slice(startIndex, startIndex + pageSize);
      
      // Combine errors
      errors = [...(errors || []), ...(result.errors || [])];
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
