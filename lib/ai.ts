import type { ArticleMetrics } from "@/types/article"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function generateSummary(content: string, maxLength = 2000): Promise<string> {
  try {
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: `Please provide a detailed summary of the following content in ${maxLength} characters or less. Use bullet points to highlight key information and main points. Include the most important facts, figures, and conclusions.\n\nContent: ${content.substring(0, 4000)}`,
      temperature: 0.3,
      maxTokens: 500,
    })

    let formattedText = text.trim()

    if (!formattedText.includes("•") && !formattedText.includes("-") && !formattedText.includes("*")) {
      const sentences = formattedText.split(". ")
      formattedText = sentences
        .map((sentence) => (sentence.trim() ? `• ${sentence.trim()}${sentence.endsWith(".") ? "" : "."}` : ""))
        .filter(Boolean)
        .join("\n")
    }

    if (formattedText.length > maxLength) {
      formattedText = formattedText.substring(0, maxLength - 3) + "..."
    }

    return formattedText
  } catch (error) {
    console.error("Error generating summary:", error)
    throw error // Don't provide fallback, let the caller handle the error
  }
}

import type { ArticleCategory } from "@/types/article"

export async function analyzeArticle(
  title: string,
  content: string,
): Promise<{ metrics: ArticleMetrics; summary: string; aiSummary: string; categories: ArticleCategory[] }> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error("OpenAI API key is missing. Please add OPENAI_API_KEY to your environment variables.")
  }

  console.log(`Starting AI analysis for article: "${title.substring(0, 50)}..."`)

  const prompt = `
    Analyze the following news article and provide metrics and categories. Respond with a JSON object containing the following fields:
    {
      "clickbaitScore": number (0-100), // How sensational or misleading the headline/content is
      "biasScore": number (0-100), // Political or ideological bias in the article
      "targetGeneration": string, // One of: "Baby Boomers", "Generation X", "Millennials", "Generation Z", "Generation Alpha"
      "politicalLeaning": string, // One of: "Left", "Center-left", "Neutral", "Center-right", "Right"
      "sentimentScore": number (0-100), // Overall sentiment of the article
      "sentimentTone": string, // One of: "Positive", "Negative", "Neutral", "Alarming", "Hopeful", "Mixed"
      "readabilityScore": number (0-100), // How easy the article is to read
      "readingLevel": string, // One of: "Elementary", "Middle School", "High School", "College", "Graduate"
      "emotionalTone": string, // One of: "Neutral", "Informative", "Urgent", "Calm", "Exciting", "Concerning", "Optimistic", "Pessimistic", "Analytical", "Emotional", "Professional", "Casual"
      "engagementScore": number (0-100), // How engaging the content is
      "categories": string[] // Array of categories from this list: ["sport", "economy", "politics", "war", "technology", "religion", "work", "travel", "health", "entertainment", "science", "education", "environment", "fashion", "food", "lifestyle"]
    }

    Article to analyze:
    Title: ${title}
    Content: ${content.substring(0, 3000)}
    
    Respond with only the JSON object, no additional text or markdown formatting.
  `

  const { text } = await generateText({
    model: openai("gpt-4o"),
    prompt,
    temperature: 0.3,
    maxTokens: 800,
  })

  console.log(`Received AI response for "${title.substring(0, 30)}...":`, text.substring(0, 200))

  const cleanedResponse = cleanJsonResponse(text)

  let metrics: any
  try {
    metrics = JSON.parse(cleanedResponse)
  } catch (e) {
    console.error("Failed to parse AI response as JSON:", cleanedResponse)
    throw new Error("Failed to parse AI response as JSON")
  }

  console.log("Parsed metrics:", JSON.stringify(metrics, null, 2))

  // Validate and normalize the metrics - throw error if invalid
  const result: ArticleMetrics = {
    clickbaitScore: validateNumber(metrics.clickbaitScore, 0, 100),
    biasScore: validateNumber(metrics.biasScore, 0, 100),
    targetGeneration: validateString(metrics.targetGeneration, [
      "Baby Boomers",
      "Generation X",
      "Millennials",
      "Generation Z",
      "Generation Alpha",
    ]),
    politicalLeaning: validateString(metrics.politicalLeaning, [
      "Left",
      "Center-left",
      "Neutral",
      "Center-right",
      "Right",
    ]),
    sentimentScore: validateNumber(metrics.sentimentScore, 0, 100),
    sentimentTone: validateString(metrics.sentimentTone, [
      "Positive",
      "Negative",
      "Neutral",
      "Alarming",
      "Hopeful",
      "Mixed",
    ]),
    readabilityScore: validateNumber(metrics.readabilityScore, 0, 100),
    readingLevel: validateString(metrics.readingLevel, [
      "Elementary",
      "Middle School",
      "High School",
      "College",
      "Graduate",
    ]),
    emotionalTone: validateString(metrics.emotionalTone || metrics.emotionTone, [
      "Neutral",
      "Informative",
      "Urgent",
      "Calm",
      "Exciting",
      "Concerning",
      "Optimistic",
      "Pessimistic",
      "Analytical",
      "Emotional",
      "Professional",
      "Casual",
      "Happy",
      "Sad",
      "Angry",
      "Fearful",
      "Surprised",
      "Disgusted",
      "Joy",
      "Love",
      "Trust",
      "Motivational",
      "Inspiring",
      "Serious",
      "Humorous",
      "Dramatic",
      "Factual",
      "Opinion-based",
    ]),
    engagementScore: validateNumber(metrics.engagementScore, 0, 100),
    bias: validateNumber(metrics.biasScore, 0, 100), // Copy biasScore to bias field
  }

  // Generate AI summary
  const aiSummary = await generateSummary(content, 500)

  // Extract and validate categories from AI response
  let categories: ArticleCategory[] = []
  if (Array.isArray(metrics.categories)) {
    const validCategories: ArticleCategory[] = [
      "sport",
      "economy",
      "politics",
      "war",
      "technology",
      "religion",
      "work",
      "travel",
      "health",
      "entertainment",
      "science",
      "education",
      "environment",
      "fashion",
      "food",
      "lifestyle",
      "other",
    ]

    categories = metrics.categories
      .map((c: string) => c.toLowerCase() as ArticleCategory)
      .filter((c: string): c is ArticleCategory => validCategories.includes(c as ArticleCategory))
      .slice(0, 3)
  }

  if (categories.length === 0) {
    categories = ["other"]
  }

  console.log(`Analysis complete for "${title.substring(0, 30)}...". Metrics:`, result)

  return {
    metrics: result,
    summary: content.substring(0, 200) + (content.length > 200 ? "..." : ""),
    aiSummary,
    categories,
  }
}

function validateNumber(value: any, min: number, max: number): number {
  const num = Number(value)
  if (isNaN(num)) {
    throw new Error(`Invalid number value: ${value}`)
  }
  const result = Math.min(max, Math.max(min, num))
  console.log(`Validated number: ${value} -> ${result}`)
  return result
}

function validateString(value: any, allowedValues: string[]): string {
  const str = String(value || "").trim()
  if (!str) {
    throw new Error(`Empty string value, expected one of: ${allowedValues.join(", ")}`)
  }

  // Try exact match first
  const exactMatch = allowedValues.find((v) => v.toLowerCase() === str.toLowerCase())
  if (exactMatch) {
    console.log(`Validated string: ${value} -> ${exactMatch}`)
    return exactMatch
  }

  // If no exact match, try partial matching for common variations
  const partialMatch = allowedValues.find((v) => {
    const lowerV = v.toLowerCase()
    const lowerStr = str.toLowerCase()
    return lowerV.includes(lowerStr) || lowerStr.includes(lowerV)
  })

  if (partialMatch) {
    console.log(`Validated string (partial match): ${value} -> ${partialMatch}`)
    return partialMatch
  }

  // If still no match, map common variations
  const commonMappings: Record<string, string> = {
    informative: "Informative",
    urgent: "Urgent",
    calm: "Calm",
    exciting: "Exciting",
    concerning: "Concerning",
    optimistic: "Optimistic",
    pessimistic: "Pessimistic",
    analytical: "Analytical",
    emotional: "Emotional",
    professional: "Professional",
    casual: "Casual",
    motivational: "Motivational",
    inspiring: "Inspiring",
    serious: "Serious",
    humorous: "Humorous",
    dramatic: "Dramatic",
    factual: "Factual",
    "opinion-based": "Opinion-based",
    opinionated: "Opinion-based",
    balanced: "Neutral",
    unbiased: "Neutral",
    biased: "Emotional",
    sensational: "Exciting",
    boring: "Neutral",
    interesting: "Engaging",
    engaging: "Exciting",
  }

  const mappedValue = commonMappings[str.toLowerCase()]
  if (mappedValue && allowedValues.includes(mappedValue)) {
    console.log(`Validated string (mapped): ${value} -> ${mappedValue}`)
    return mappedValue
  }

  // If all else fails, use the first allowed value as fallback
  console.warn(`Could not validate string: ${str}, using fallback: ${allowedValues[0]}`)
  return allowedValues[0]
}

function cleanJsonResponse(response: string): string {
  let cleaned = response.replace(/```(json|javascript)?\s*/g, "").replace(/\s*```\s*$/g, "")
  cleaned = cleaned.trim()

  if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
    return cleaned
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    return jsonMatch[0]
  }

  throw new Error("Could not extract valid JSON from the AI response")
}
