import { NextResponse } from "next/server"
import { cleanupOldArticles } from "@/lib/blob-storage"

export async function GET() {
  try {
    const deletedCount = await cleanupOldArticles()

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${deletedCount} old articles`,
      deletedCount,
    })
  } catch (error) {
    console.error("Error in cleanup job:", error)
    return NextResponse.json({ error: "Failed to clean up old articles" }, { status: 500 })
  }
}
