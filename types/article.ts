export interface ArticleMetrics {
  clickbaitScore: number
  biasScore: number
  targetGeneration: string
  politicalLeaning: string
  sentimentScore: number
  sentimentTone: string
  readabilityScore: number
  readingLevel: string
  emotionalTone: string
  engagementScore?: number  // Added missing property
  bias?: number            // Added missing property
}

export interface Article {
  id: string
  title: string
  summary: string
  content: string
  url: string
  imageUrl: string
  source: string
  publishedAt: string
  metrics: ArticleMetrics
  storedAt?: string // Timestamp when the article was stored
  analyzed: boolean // Flag to indicate if the article has been analyzed
  aiSummary?: string // AI-generated summary (500 chars)
}
