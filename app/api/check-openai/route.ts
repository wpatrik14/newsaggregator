import { NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: "OpenAI API key is missing. Please add OPENAI_API_KEY to your environment variables.",
        available: false,
      })
    }

    // Test the API key with a simple request
    try {
      console.log("Testing OpenAI API key with a simple request...")

      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: "Analyze this short text: 'Breaking news: Scientists discover revolutionary treatment.'",
        temperature: 0.3,
        maxTokens: 100,
      })

      console.log("OpenAI API response:", text.substring(0, 100) + "...")

      return NextResponse.json({
        success: true,
        message: "OpenAI API key is valid and working correctly.",
        available: true,
        response: text.substring(0, 100) + "...",
      })
    } catch (error) {
      console.error("Error testing OpenAI API key:", error)

      // Extract more detailed error information
      let errorMessage = "Unknown error occurred while testing OpenAI API key."

      if (error instanceof Error) {
        errorMessage = error.message

        // Check for common error patterns
        if (error.message.includes("401")) {
          errorMessage = "Authentication error: Invalid API key or unauthorized access."
        } else if (error.message.includes("429")) {
          errorMessage = "Rate limit exceeded: Too many requests to the OpenAI API."
        } else if (error.message.includes("500")) {
          errorMessage = "OpenAI API server error. Please try again later."
        } else if (error.message.includes("timeout")) {
          errorMessage = "Request to OpenAI API timed out. Please try again."
        }
      }

      return NextResponse.json({
        success: false,
        message: errorMessage,
        available: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  } catch (error) {
    console.error("Error checking OpenAI API key:", error)

    return NextResponse.json({
      success: false,
      message: "Error checking OpenAI API key",
      available: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
