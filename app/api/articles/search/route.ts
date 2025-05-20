import { NextResponse } from "next/server"
import { searchArticles } from "@/lib/news-api"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query) {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 })
    }

    const from = searchParams.get("from") || undefined
    const to = searchParams.get("to") || undefined
    const sortBy = (searchParams.get("sortBy") as "relevancy" | "popularity" | "publishedAt") || "publishedAt"
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "20", 10)

    const articles = await searchArticles(query, from, to, sortBy, pageSize, page)

    return NextResponse.json({ articles })
  } catch (error) {
    console.error("Error searching articles:", error)
    return NextResponse.json({ error: "Failed to search articles" }, { status: 500 })
  }
}
