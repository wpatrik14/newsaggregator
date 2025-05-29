import { NextResponse } from "next/server"
import { analyzeArticle } from "@/lib/ai"

export async function POST(request: Request) {
  try {
    const { title, content } = await request.json()

    if (!title || !content) {
      return NextResponse.json({ error: "Missing title or content" }, { status: 400 })
    }

    console.log("Testing AI analysis with:", { title: title.substring(0, 50), contentLength: content.length })

    const result = await analyzeArticle(title, content)

    console.log("AI analysis result:", result)

    return NextResponse.json({
      success: true,
      result,
      message: "Analysis completed successfully",
    })
  } catch (error) {
    console.error("Error in test analysis:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      { status: 500 },
    )
  }
}
