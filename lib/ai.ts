import type { ArticleMetrics } from "@/types/article"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function generateSummary(content: string, maxLength: number = 2000): Promise<string> {
  try {
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: `Please provide a detailed summary of the following content in ${maxLength} characters or less. Use bullet points to highlight key information and main points. Include the most important facts, figures, and conclusions.\n\nContent: ${content.substring(0, 4000)}`,
      temperature: 0.3,
      maxTokens: 500,
    });
    
    // Format the response to ensure bullet points
    let formattedText = text.trim();
    
    // Ensure proper bullet point formatting
    if (!formattedText.includes('•') && !formattedText.includes('-') && !formattedText.includes('*')) {
      // Split into sentences and add bullet points
      const sentences = formattedText.split('. ');
      formattedText = sentences.map(sentence => 
        sentence.trim() ? `• ${sentence.trim()}${sentence.endsWith('.') ? '' : '.'}` : ''
      ).filter(Boolean).join('\n');
    }
    
    // Ensure the summary doesn't exceed maxLength
    if (formattedText.length > maxLength) {
      formattedText = formattedText.substring(0, maxLength - 3) + '...';
    }
    
    return formattedText;
  } catch (error) {
    console.error('Error generating summary:', error);
    // Fallback to a simple truncation if AI summary fails
    const fallback = content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
    return `• ${fallback.replace(/\. /g, '.\n• ')}`;
  }
}

import { ArticleCategory } from "@/types/article"

export async function analyzeArticle(title: string, content: string): Promise<{metrics: ArticleMetrics, summary: string, aiSummary: string, categories: ArticleCategory[]}> {
  try {
    // Check if OpenAI API key is available
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      throw new Error("OpenAI API key is missing. Please add OPENAI_API_KEY to your environment variables.")
    }

    console.log(`Starting AI analysis for article: "${title.substring(0, 30)}..."`)

    const prompt = `
      Analyze the following news article and provide metrics and categories. Respond with a JSON object containing the following fields:
      {
        "clickbaitScore": number (0-100), // How sensational or misleading the headline/content is
        "biasScore": number (0-100), // Political or ideological bias in the article
        "targetGeneration": string, // One of: "Baby Boomers", "Generation X", "Millennials", "Generation Z", "Generation Alpha"
        "politicalLeaning": string, // One of: "Left", "Center-left", "Neutral", "Center-right", "Right"
        "sentimentScore": number (0-100), // Overall sentiment of the article
        "sentimentTone": string, // e.g., "Positive", "Negative", "Neutral", "Alarming", "Hopeful"
        "readabilityScore": number (0-100), // How easy the article is to read
        "readingLevel": string, // e.g., "Elementary", "Middle School", "High School", "College", "Graduate"
        "emotionalTone": string, // Primary emotion evoked by the article
        "categories": string[] // Array of categories from this list: ["sport", "economy", "politics", "war", "technology", "religion", "work", "travel", "health", "entertainment", "science", "education", "environment", "fashion", "food", "lifestyle"]
      }

      Article to analyze:
      Title: ${title}
      Content: ${content}
      
      Respond with only the JSON object, no additional text or markdown formatting.
    `

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
      temperature: 0.3,
      maxTokens: 500,
    })

    console.log(`Received AI response for "${title.substring(0, 30)}...":`, text.substring(0, 200) + (text.length > 200 ? '...' : ''))

    // Clean the response to handle markdown formatting
    let cleanedResponse = cleanJsonResponse(text)
    
    // Parse the response as JSON
    let metrics: any
    try {
      metrics = JSON.parse(cleanedResponse)
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', cleanedResponse)
      throw new Error('Failed to parse AI response as JSON')
    }

    // Log the parsed metrics for debugging
    console.log('Parsed metrics:', JSON.stringify(metrics, null, 2))

    // Validate and normalize the metrics
    const result: ArticleMetrics = {
      clickbaitScore: validateNumber(metrics.clickbaitScore, 0, 100, 50),
      biasScore: validateNumber(metrics.biasScore, 0, 100, 50),
      targetGeneration: validateString(metrics.targetGeneration, [
        'Baby Boomers', 'Generation X', 'Millennials', 'Generation Z', 'Generation Alpha'
      ], 'Millennials'),
      politicalLeaning: validateString(metrics.politicalLeaning, [
        'Left', 'Center-left', 'Neutral', 'Center-right', 'Right'
      ], 'Neutral'),
      sentimentScore: validateNumber(metrics.sentimentScore, 0, 100, 50),
      sentimentTone: validateString(metrics.sentimentTone, [
        'Positive', 'Negative', 'Neutral', 'Alarming', 'Hopeful', 'Mixed'
      ], 'Neutral'),
      readabilityScore: validateNumber(metrics.readabilityScore, 0, 100, 70),
      readingLevel: validateString(metrics.readingLevel, [
        'Elementary', 'Middle School', 'High School', 'College', 'Graduate'
      ], 'High School'),
      emotionalTone: validateString(metrics.emotionalTone || metrics.emotionTone, [
        'Neutral', 'Happy', 'Sad', 'Angry', 'Fearful', 'Surprised', 'Disgusted'
      ], 'Neutral')
    }

    // Generate AI summary
    const aiSummary = await generateSummary(content, 500)
    
    // Extract and validate categories from AI response
    let categories: ArticleCategory[] = []
    if (Array.isArray(metrics.categories)) {
      const validCategories: ArticleCategory[] = ["sport", "economy", "politics", "war", "technology", 
        "religion", "work", "travel", "health", "entertainment", "science", 
        "education", "environment", "fashion", "food", "lifestyle", "other"]
      
      categories = metrics.categories
        .map((c: string) => c.toLowerCase() as ArticleCategory)
        .filter((c: string): c is ArticleCategory => 
          validCategories.includes(c as ArticleCategory)
        )
        .slice(0, 3) // Limit to 3 categories
    }

    // If no valid categories from AI, fallback to other
    if (categories.length === 0) {
      categories = ['other']
    }

    return {
      metrics: result,
      summary: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
      aiSummary,
      categories
    }
  } catch (error) {
    console.error("Error analyzing article with AI:", error)
    // Log the full error for debugging
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack
      })
    }
    // Re-throw the error to be handled by the caller
    throw error
  }
}

// Helper function to validate and normalize numbers
function validateNumber(value: any, min: number, max: number, defaultValue: number): number {
  const num = Number(value)
  if (isNaN(num)) return defaultValue
  return Math.min(max, Math.max(min, num))
}

// Helper function to validate and normalize strings
function validateString(value: any, allowedValues: string[], defaultValue: string): string {
  const str = String(value || '').trim()
  if (!str) return defaultValue
  // Try to find a case-insensitive match
  const match = allowedValues.find(v => v.toLowerCase() === str.toLowerCase())
  return match || defaultValue
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
