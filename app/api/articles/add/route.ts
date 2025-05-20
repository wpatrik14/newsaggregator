import { NextResponse } from "next/server"
import { storeArticle } from "@/lib/blob-storage"
import { analyzeArticle } from "@/lib/ai"
import { v4 as uuidv4 } from "uuid"
import type { Article } from "@/types/article"

export async function POST(request: Request) {
  try {
    const { title, content, summary, url, source } = await request.json()

    if (!title || !content) {
      return NextResponse.json({ error: "Missing required fields: title, content" }, { status: 400 })
    }

    // Analyze the article with AI
    const metrics = await analyzeArticle(title, content)

    // Create a unique ID for the article
    const id = uuidv4()

    // Create the article object
    const article: Article = {
      id,
      title,
      summary: summary || content.substring(0, 150) + "...",
      content,
      url: url || "",
      imageUrl: "/placeholder.svg?height=400&width=600",
      source: source || "Manual Entry",
      publishedAt: new Date().toISOString(),
      metrics,
    }

    // Store the article in Blob storage
    await storeArticle(article)

    return NextResponse.json({ success: true, article })
  } catch (error) {
    console.error("Error adding article:", error)
    return NextResponse.json({ error: "Failed to add article" }, { status: 500 })
  }
}
