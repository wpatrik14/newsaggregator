import { NextResponse } from "next/server"
import { getArticleFromBlob } from "@/lib/blob-storage"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const article = await getArticleFromBlob(params.id)

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 })
    }

    // Check if the article has been analyzed
    if (!article.analyzed) {
      return NextResponse.json({ error: "Article analysis not complete" }, { status: 400 })
    }

    return NextResponse.json({ article })
  } catch (error) {
    console.error(`Error fetching article ${params.id}:`, error)
    return NextResponse.json({ error: "Failed to fetch article" }, { status: 500 })
  }
}
