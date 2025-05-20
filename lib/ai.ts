import type { ArticleMetrics } from "@/types/article"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function analyzeArticle(title: string, content: string): Promise<ArticleMetrics> {
  try {
    // Check if OpenAI API key is available
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      throw new Error("OpenAI API key is missing. Please add OPENAI_API_KEY to your environment variables.")
    }

    console.log(`Starting AI analysis for article: "${title.substring(0, 30)}..."`)

    const prompt = `
      Analyze the following news article and provide metrics:
      
      Title: ${title}
      
      Content: ${content}
      
      Please provide the following metrics:
      1. Clickbait Score (0-100): Rate how sensational or misleading the headline/content is
      2. Bias Score (0-100): Detect political or ideological bias in the article
      3. Target Generation: Predict which generation the article is primarily targeting from these options:
         - Baby Boomers (1946-1964)
         - Generation X (1965-1980)
         - Millennials (1981-1996)
         - Generation Z (1997-2012)
         - Generation Alpha (2013-2025)
      4. Political Leaning: Identify the political leaning (Left, Center-left, Neutral, Center-right, Right)
      5. Sentiment Score (0-100): Measure the overall sentiment of the article
      6. Sentiment Tone: Describe the tone (e.g., Positive, Negative, Neutral, Alarming, Hopeful)
      7. Readability Score (0-100): Assess how easy the article is to read
      8. Reading Level: Identify the education level needed to understand the content
      9. Emotional Tone: Describe the primary emotion evoked by the article
      
      Return ONLY a JSON object with these metrics as properties. Do not include any markdown formatting, code blocks, or explanations. The response should be a valid JSON object that can be directly parsed.
    `

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.3,
      maxTokens: 500,
    })

    console.log(`Received AI response for "${title.substring(0, 30)}...": ${text.substring(0, 100)}...`)

    // Clean the response to handle markdown formatting
    const cleanedResponse = cleanJsonResponse(text)

    // Parse the response as JSON
    const metrics = JSON.parse(cleanedResponse)

    console.log(`Successfully parsed metrics for "${title.substring(0, 30)}..."`)

    return {
      clickbaitScore: metrics.clickbaitScore || 50,
      biasScore: metrics.biasScore || 50,
      targetGeneration: metrics.targetGeneration || "Millennials",
      politicalLeaning: metrics.politicalLeaning || "Neutral",
      sentimentScore: metrics.sentimentScore || 50,
      sentimentTone: metrics.sentimentTone || "Neutral",
      readabilityScore: metrics.readabilityScore || 70,
      readingLevel: metrics.readingLevel || "High School",
      emotionalTone: metrics.emotionalTone || "Neutral",
    }
  } catch (error) {
    console.error("Error analyzing article with AI:", error)
    throw error // Re-throw the error instead of falling back to mock data
  }
}

// Function to clean JSON response from markdown formatting
function cleanJsonResponse(response: string): string {
  // Remove markdown code blocks if present
  let cleaned = response.replace(/```(json|javascript)?\s*/g, "").replace(/\s*```\s*$/g, "")

  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim()

  // If the response starts with a curly brace, assume it's JSON
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
    return cleaned
  }

  // Try to extract JSON from the response
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return jsonMatch[0]
  }

  // If we can't find valid JSON, throw an error
  throw new Error("Could not extract valid JSON from the AI response")
}
