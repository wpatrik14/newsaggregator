import { NextResponse } from "next/server"
import { list, del } from "@vercel/blob"

export async function DELETE() {
  try {
    console.log("Deleting all articles...")

    // List all article blobs
    const { blobs } = await list({ prefix: "articles/" })
    console.log(`Found ${blobs.length} articles to delete`)

    // Delete each blob
    const deletePromises = blobs.map(async (blob) => {
      try {
        await del(blob.url)
        console.log(`Deleted article: ${blob.url}`)
        return true
      } catch (error) {
        console.error(`Failed to delete article ${blob.url}:`, error)
        return false
      }
    })

    const results = await Promise.all(deletePromises)
    const deletedCount = results.filter(Boolean).length

    console.log(`Successfully deleted ${deletedCount} articles`)

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} articles`,
      deletedCount,
      totalCount: blobs.length,
    })
  } catch (error) {
    console.error("Error deleting all articles:", error)
    return NextResponse.json(
      {
        error: `Failed to delete articles: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
