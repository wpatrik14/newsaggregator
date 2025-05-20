import { formatDistanceToNow } from "date-fns"
import type { Article } from "@/types/article"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, BarChart3, Target, ThumbsUp, BookOpen, Heart, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import ArticleMetricCard from "./article-metric-card"

interface ArticleDetailProps {
  article: Article
}

export default function ArticleDetail({ article }: ArticleDetailProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{article.source}</Badge>
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
          </span>
        </div>
        <h1 className="text-3xl font-bold">{article.title}</h1>
        <p className="text-lg text-muted-foreground">{article.summary}</p>
      </div>

      <div
        className="aspect-video w-full overflow-hidden rounded-lg bg-cover bg-center"
        style={{ backgroundImage: `url(${article.imageUrl})` }}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ArticleMetricCard
          title="Clickbait Score"
          value={article.metrics.clickbaitScore}
          icon={<AlertTriangle className="h-5 w-5" />}
          description="How sensational or misleading the headline/content is"
          colorScale="high-bad"
        />
        <ArticleMetricCard
          title="Bias Detection"
          value={article.metrics.biasScore}
          icon={<BarChart3 className="h-5 w-5" />}
          description={`Political leaning: ${article.metrics.politicalLeaning}`}
          colorScale="high-bad"
        />
        <ArticleMetricCard
          title="Target Generation"
          text={article.metrics.targetGeneration}
          icon={<Target className="h-5 w-5" />}
          description="The generation this article primarily targets"
        />
        <ArticleMetricCard
          title="Sentiment"
          value={article.metrics.sentimentScore}
          icon={<ThumbsUp className="h-5 w-5" />}
          description={`Tone: ${article.metrics.sentimentTone}`}
          colorScale="high-good"
        />
        <ArticleMetricCard
          title="Readability"
          value={article.metrics.readabilityScore}
          icon={<BookOpen className="h-5 w-5" />}
          description={`Reading level: ${article.metrics.readingLevel}`}
          colorScale="high-good"
        />
        <ArticleMetricCard
          title="Emotional Tone"
          text={article.metrics.emotionalTone}
          icon={<Heart className="h-5 w-5" />}
          description="The primary emotion evoked by the article"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Article Content</CardTitle>
          <CardDescription>AI-analyzed content with key insights highlighted</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button asChild>
          <a href={article.url} target="_blank" rel="noopener noreferrer">
            Read Original Article
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  )
}
