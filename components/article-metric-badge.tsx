import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type ColorScale = "high-good" | "high-bad" | "neutral"

interface ArticleMetricBadgeProps {
  icon: ReactNode
  label: string
  value?: number
  text?: string
  colorScale?: ColorScale
}

export default function ArticleMetricBadge({
  icon,
  label,
  value,
  text,
  colorScale = "neutral",
}: ArticleMetricBadgeProps) {
  // Determine color based on value and colorScale
  const getColor = () => {
    if (text || value === undefined) return "bg-secondary text-secondary-foreground"

    if (colorScale === "high-good") {
      if (value >= 70) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      if (value >= 40) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
    }

    if (colorScale === "high-bad") {
      if (value >= 70) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      if (value >= 40) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
    }

    return "bg-secondary text-secondary-foreground"
  }

  return (
    <div className={cn("flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium", getColor())}>
      {icon}
      <span>{label}:</span>
      {text ? <span>{text}</span> : <span>{value}%</span>}
    </div>
  )
}
