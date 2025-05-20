import { NextResponse } from "next/server"
import { fetchArticlesFromSources } from "@/lib/rss"

export async function GET() {
  try {
    const articles = await fetchArticlesFromSources()
    return NextResponse.json({ articles })
  } catch (error) {
    console.error("Error fetching articles:", error)
    return NextResponse.json({ error: "Failed to fetch articles" }, { status: 500 })
  }
}
