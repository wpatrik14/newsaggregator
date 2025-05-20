import type { Article } from "@/types/article"
import { listArticlesFromBlob, getArticleFromBlob, storeArticles } from "./blob-storage"

// Get all articles from Blob storage or use mock data if none exist
export async function getArticles(): Promise<Article[]> {
  try {
    // Try to get articles from Blob storage
    const articles = await listArticlesFromBlob()

    // If we have articles in Blob storage, return them
    if (articles.length > 0) {
      return articles
    }

    // Otherwise, use mock data and store it in Blob for future use
    const mockArticles = getMockArticles()

    try {
      await storeArticles(mockArticles)
    } catch (storageError) {
      console.error("Error storing mock articles in Blob storage:", storageError)
      // Continue even if storage fails - we'll return the mock data anyway
    }

    return mockArticles
  } catch (error) {
    console.error("Error getting articles:", error)
    // Fallback to mock data if there's an error
    return getMockArticles()
  }
}

export async function getArticleById(id: string): Promise<Article | null> {
  try {
    // Try to get the article from Blob storage
    const article = await getArticleFromBlob(id)

    if (article) {
      return article
    }

    // Fallback to mock data if not found
    const mockArticles = getMockArticles()
    const mockArticle = mockArticles.find((article) => article.id === id)

    return mockArticle || null
  } catch (error) {
    console.error(`Error getting article ${id}:`, error)

    // Fallback to mock data if there's an error
    const mockArticles = getMockArticles()
    const mockArticle = mockArticles.find((article) => article.id === id)

    return mockArticle || null
  }
}

// Mock data function for initial data or fallback
function getMockArticles(): Article[] {
  return [
    {
      id: "1",
      title: "Scientists Discover Revolutionary Treatment That Could End Cancer Forever",
      summary:
        "A groundbreaking new treatment shows promising results in early trials, but researchers caution that more testing is needed before widespread use.",
      content:
        '<p>Scientists at the National Institute of Health have announced a potential breakthrough in cancer treatment that shows remarkable efficacy in early trials. The treatment, which combines immunotherapy with a novel delivery mechanism, has shown complete remission in 85% of test subjects with late-stage cancers that had previously been considered untreatable.</p><p>However, researchers are quick to caution that these results, while promising, are preliminary. "We\'re seeing unprecedented response rates," said Dr. Sarah Chen, lead researcher on the project, "but we need to conduct larger trials before we can make definitive claims about its effectiveness across different cancer types."</p>',
      url: "https://example.com/article1",
      imageUrl: "/placeholder.svg?height=400&width=600",
      source: "Health Journal",
      publishedAt: "2023-05-15T14:30:00Z",
      metrics: {
        clickbaitScore: 75,
        biasScore: 30,
        targetGeneration: "Generation X",
        politicalLeaning: "Neutral",
        sentimentScore: 65,
        sentimentTone: "Hopeful",
        readabilityScore: 70,
        readingLevel: "College",
        emotionalTone: "Optimistic",
      },
      analyzed: true,
    },
    {
      id: "2",
      title: "Tech Giants Secretly Collecting Your Data Even When You're Offline",
      summary:
        "Investigation reveals major tech companies have been gathering user data even when devices are disconnected from the internet.",
      content:
        "<p>An explosive investigation by privacy watchdog DigitalRights has uncovered evidence that several major technology companies continue to collect user data even when devices are in airplane mode or otherwise disconnected from the internet.</p><p>According to the report, these companies store the data locally and then upload it when connectivity is restored, often without clear disclosure to users. \"This practice fundamentally undermines what users understand as being 'offline,'\" said Marcus Wong, lead investigator at DigitalRights.</p>",
      url: "https://example.com/article2",
      imageUrl: "/placeholder.svg?height=400&width=600",
      source: "Tech Insider",
      publishedAt: "2023-05-14T09:15:00Z",
      metrics: {
        clickbaitScore: 85,
        biasScore: 60,
        targetGeneration: "Millennials",
        politicalLeaning: "Left-leaning",
        sentimentScore: 25,
        sentimentTone: "Alarming",
        readabilityScore: 65,
        readingLevel: "High School",
        emotionalTone: "Fearful",
      },
      analyzed: true,
    },
    {
      id: "3",
      title: "Market Analysis: Steady Growth Expected in Q3 Despite Inflation Concerns",
      summary:
        "Economic experts predict continued market growth through the third quarter, though inflation remains a concern for long-term outlook.",
      content:
        '<p>Despite ongoing inflation concerns, financial analysts are projecting steady growth across major market indices through the third quarter of 2023. The projection comes after a stronger-than-expected jobs report and resilient consumer spending data.</p><p>"We\'re seeing remarkable resilience in key economic indicators," said Janet Morris, chief economist at Global Financial Partners. "While inflation remains a concern, the underlying fundamentals suggest continued expansion through at least the next two quarters."</p>',
      url: "https://example.com/article3",
      imageUrl: "/placeholder.svg?height=400&width=600",
      source: "Financial Times",
      publishedAt: "2023-05-13T11:45:00Z",
      metrics: {
        clickbaitScore: 20,
        biasScore: 35,
        targetGeneration: "Baby Boomers",
        politicalLeaning: "Center-right",
        sentimentScore: 60,
        sentimentTone: "Neutral",
        readabilityScore: 80,
        readingLevel: "College",
        emotionalTone: "Analytical",
      },
      analyzed: true,
    },
    {
      id: "4",
      title: "You Won't Believe What This Child Prodigy Accomplished Before Turning 10",
      summary:
        "A young musical genius has taken the classical world by storm, performing at prestigious venues worldwide before reaching double digits.",
      content:
        '<p>Ten-year-old Sophia Liu has accomplished more in her first decade than most musicians do in a lifetime. The piano prodigy has performed at Carnegie Hall, Royal Albert Hall, and with the Vienna Philharmonic—all before her tenth birthday.</p><p>Sophia began playing piano at age three and was composing original pieces by five. Her parents, both amateur musicians, say they noticed her extraordinary talent early but were still surprised by her rapid development. "We knew she was special, but the rate at which she progressed was astonishing," said her father, Michael Liu.</p>',
      url: "https://example.com/article4",
      imageUrl: "/placeholder.svg?height=400&width=600",
      source: "Culture Today",
      publishedAt: "2023-05-12T16:20:00Z",
      metrics: {
        clickbaitScore: 90,
        biasScore: 25,
        targetGeneration: "Millennials",
        politicalLeaning: "Neutral",
        sentimentScore: 85,
        sentimentTone: "Inspiring",
        readabilityScore: 60,
        readingLevel: "Middle School",
        emotionalTone: "Amazement",
      },
      analyzed: true,
    },
    {
      id: "5",
      title: "New Study Links Social Media Use to Decreased Attention Span in Teens",
      summary:
        "Research indicates excessive social media consumption may be contributing to attention difficulties among adolescents.",
      content:
        '<p>A comprehensive study conducted by researchers at Stanford University has found a significant correlation between heavy social media use and decreased attention spans among teenagers. The study, which followed 2,500 adolescents over three years, found that those who used social media for more than three hours daily showed measurable decreases in sustained attention capabilities.</p><p>"What we\'re seeing is concerning," said Dr. Robert Chen, lead author of the study. "The constant stream of short-form content appears to be training the brain to expect quick dopamine hits rather than sustaining focus on longer, more complex tasks."</p>',
      url: "https://example.com/article5",
      imageUrl: "/placeholder.svg?height=400&width=600",
      source: "Science Daily",
      publishedAt: "2023-05-11T13:10:00Z",
      metrics: {
        clickbaitScore: 45,
        biasScore: 40,
        targetGeneration: "Generation X",
        politicalLeaning: "Center-left",
        sentimentScore: 35,
        sentimentTone: "Concerned",
        readabilityScore: 75,
        readingLevel: "College",
        emotionalTone: "Worried",
      },
      analyzed: true,
    },
    {
      id: "6",
      title: "How This Gen Z Entrepreneur Built a Billion-Dollar Company from Her Dorm Room",
      summary:
        "The inspiring story of a college student who turned a simple idea into a unicorn startup while still completing her degree.",
      content:
        '<p>At just 23 years old, Maya Johnson has become one of the youngest self-made billionaires in history. Her company, EcoPackage, which creates biodegradable packaging materials from agricultural waste, recently reached a valuation of $1.2 billion after its latest funding round.</p><p>What makes Johnson\'s story remarkable is that she launched the company from her college dorm room just four years ago while pursuing a degree in chemical engineering. "I was just trying to solve a problem I cared about," Johnson said in a recent interview. "I never imagined it would grow this quickly."</p>',
      url: "https://example.com/article6",
      imageUrl: "/placeholder.svg?height=400&width=600",
      source: "Entrepreneur Weekly",
      publishedAt: "2023-05-10T10:05:00Z",
      metrics: {
        clickbaitScore: 70,
        biasScore: 30,
        targetGeneration: "Generation Z",
        politicalLeaning: "Neutral",
        sentimentScore: 90,
        sentimentTone: "Inspiring",
        readabilityScore: 65,
        readingLevel: "High School",
        emotionalTone: "Motivated",
      },
      analyzed: true,
    },
  ]
}
