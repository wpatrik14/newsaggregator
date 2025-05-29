import { NextResponse } from "next/server"
import { deleteAllArticlesFromBlob } from "@/lib/blob-storage"

export async function DELETE() {
  try {
    console.log("Starting to delete all articles...")

    const deletedCount = await deleteAllArticlesFromBlob()

    console.log(`Successfully deleted ${deletedCount} articles`)

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} articles`,
    })
  } catch (error) {
    console.error("Error deleting all articles:", error)
    return NextResponse.json(
      {
        success: false,
        error: `Failed to delete articles: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
