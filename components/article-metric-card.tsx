import type { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type ColorScale = "high-good" | "high-bad" | "neutral"

interface ArticleMetricCardProps {
  title: string
  value?: number
  text?: string
  icon: ReactNode
  description: string
  colorScale?: ColorScale
}

export default function ArticleMetricCard({
  title,
  value,
  text,
  icon,
  description,
  colorScale = "neutral",
}: ArticleMetricCardProps) {
  // Determine color based on value and colorScale
  const getProgressColor = () => {
    if (text || value === undefined) return "bg-primary"

    if (colorScale === "high-good") {
      if (value >= 70) return "bg-green-500"
      if (value >= 40) return "bg-blue-500"
      return "bg-red-500"
    }

    if (colorScale === "high-bad") {
      if (value >= 70) return "bg-red-500"
      if (value >= 40) return "bg-yellow-500"
      return "bg-green-500"
    }

    return "bg-primary"
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          <div className="flex items-center gap-2">
            {icon}
            {title}
          </div>
        </CardTitle>
        {value !== undefined && (
          <span
            className={cn(
              "text-sm font-bold",
              colorScale === "high-good" && value >= 70 && "text-green-500",
              colorScale === "high-good" && value < 40 && "text-red-500",
              colorScale === "high-bad" && value >= 70 && "text-red-500",
              colorScale === "high-bad" && value < 40 && "text-green-500",
            )}
          >
            {value}%
          </span>
        )}
        {text && <span className="text-sm font-bold">{text}</span>}
      </CardHeader>
      <CardContent>
        {value !== undefined && <Progress value={value} className="h-2" indicatorClassName={getProgressColor()} />}
        <CardDescription className="mt-2 text-xs">{description}</CardDescription>
      </CardContent>
    </Card>
  )
}
