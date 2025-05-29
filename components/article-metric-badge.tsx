import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type ColorScale = "high-good" | "high-bad" | "neutral" | "tone" | "emotion"

interface ArticleMetricBadgeProps {
  icon: ReactNode
  label: string
  value?: number
  text?: string
  colorScale?: ColorScale
}

const metricDescriptions = {
  "Overall Score":
    "A weighted score (0-100) based on multiple factors including clickbait, sentiment, and engagement. Higher is better.",
  Clickbait: "Measures how sensational or misleading the headline/content is (0-100). Lower is better.",
  Bias: "Indicates political or ideological bias in the article (0-100). Closer to 50 is more neutral.",
  Sentiment: "The emotional tone of the article (0-100). Higher is more positive.",
  Engagement: "Estimated reader engagement level (0-100). Higher means more engaging.",
  Readability: "How easy the article is to read (0-100). Higher is easier to read.",
  Emotion: "Primary emotion conveyed by the article's tone.",
  "Target Audience": "The generation most likely to engage with this content.",
  "Political Leaning": "The political orientation suggested by the article's content and tone.",
  "Reading Level": "The education level required to understand the article.",
  Tone: "The overall sentiment and emotional approach of the article.",
}

export default function ArticleMetricBadge({
  icon,
  label,
  value,
  text,
  colorScale = "neutral",
}: ArticleMetricBadgeProps) {
  // Get description for the tooltip
  const description = metricDescriptions[label as keyof typeof metricDescriptions] || `Information about ${label}`

  // Determine color based on value and colorScale
  const getColor = () => {
    if (value === undefined && !text) return "bg-secondary text-secondary-foreground"

    // For numeric values with high-good or high-bad scales
    if (colorScale === "high-good") {
      if (value! >= 70) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      if (value! >= 40) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
    }

    if (colorScale === "high-bad") {
      if (value! >= 70) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      if (value! >= 40) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
    }

    // For tone values (positive/neutral/negative)
    if (colorScale === "tone" && text) {
      const tone = text.toLowerCase()
      if (tone.includes("positive") || tone.includes("hopeful") || tone.includes("optimistic"))
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      if (tone.includes("negative") || tone.includes("alarming") || tone.includes("pessimistic"))
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
    }

    // For emotion values
    if (colorScale === "emotion" && text) {
      const emotion = text.toLowerCase()

      // Positive emotions
      if (
        ["joy", "love", "trust", "happy", "optimistic", "exciting", "motivational", "inspiring"].some((e) =>
          emotion.includes(e),
        )
      )
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"

      // Negative emotions
      if (
        ["anger", "disgust", "fear", "sadness", "sad", "angry", "fearful", "concerning", "pessimistic", "urgent"].some(
          (e) => emotion.includes(e),
        )
      )
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"

      // Professional/neutral emotions
      if (["informative", "analytical", "professional", "factual", "calm", "serious"].some((e) => emotion.includes(e)))
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"

      // Neutral/mixed emotions
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }

    return "bg-secondary text-secondary-foreground"
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn("flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium cursor-help", getColor())}
          >
            {icon}
            <span>{label}:</span>
            {text ? <span>{text}</span> : <span>{value}%</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
