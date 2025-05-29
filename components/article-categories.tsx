import { cn } from "@/lib/utils"
import { ArticleCategory } from "@/types/article"

const categoryColors: Record<ArticleCategory, string> = {
  sport: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  economy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  politics: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  war: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  technology: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  religion: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  work: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  travel: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  health: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  entertainment: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200",
  science: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  education: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  environment: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  fashion: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  food: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  lifestyle: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
}

interface ArticleCategoriesProps {
  categories: ArticleCategory[]
  className?: string
  maxItems?: number
}

export function ArticleCategories({ 
  categories, 
  className,
  maxItems = 3 
}: ArticleCategoriesProps) {
  if (!categories || categories.length === 0) {
    return null
  }

  const displayedCategories = categories.slice(0, maxItems)
  const remainingCount = categories.length - displayedCategories.length

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {displayedCategories.map((category) => (
        <span
          key={category}
          className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
            categoryColors[category] || categoryColors.other
          )}
        >
          {category.charAt(0).toUpperCase() + category.slice(1)}
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
          +{remainingCount}
        </span>
      )}
    </div>
  )
}

export default ArticleCategories
