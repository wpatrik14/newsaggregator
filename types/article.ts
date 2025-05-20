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
}
