import { NextResponse } from "next/server"
import { analyzeArticle } from "@/lib/ai"

export async function POST(request: Request) {
  try {
    const { url, title, content } = await request.json()

    if (!url || !title || !content) {
      return NextResponse.json({ error: "Missing required fields: url, title, content" }, { status: 400 })
    }

    const metrics = await analyzeArticle(title, content)

    return NextResponse.json({ metrics })
  } catch (error) {
    console.error("Error analyzing article:", error)
    return NextResponse.json({ error: "Failed to analyze article" }, { status: 500 })
  }
}
