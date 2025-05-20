import { NextResponse } from "next/server"
import { fetchArticlesFromSources } from "@/lib/rss"

// This route would be called by a cron job to regularly fetch and analyze articles
export async function GET() {
  try {
    // Fetch articles from RSS feeds and store them in Blob storage
    const articles = await fetchArticlesFromSources()

    return NextResponse.json({
      success: true,
      message: `Successfully fetched, analyzed, and stored ${articles.length} articles`,
    })
  } catch (error) {
    console.error("Error in cron job:", error)
    return NextResponse.json({ error: "Failed to process articles" }, { status: 500 })
  }
}
