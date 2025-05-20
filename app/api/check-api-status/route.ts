import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    openAiKeyAvailable: !!process.env.OPENAI_API_KEY,
    newsApiKeyAvailable: !!process.env.NEWS_ORG_API_KEY,
  })
}
