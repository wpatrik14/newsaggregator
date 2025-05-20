"use client"

import { Badge } from "@/components/ui/badge"
import { useFilters } from "@/contexts/filter-context"
import { X } from "lucide-react"

export default function FilterStatus() {
  const { filters, setFilters, resetFilters } = useFilters()

  // Check if any filters are active
  const hasActiveFilters =
    filters.clickbaitRange[0] > 0 ||
    filters.clickbaitRange[1] < 100 ||
    filters.biasRange[0] > 0 ||
    filters.biasRange[1] < 100 ||
    filters.targetGeneration !== "all" ||
    filters.source !== "all" ||
    filters.category !== "all"

  if (!hasActiveFilters) {
    return null
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">Active filters:</span>

      {filters.category !== "all" && (
        <Badge variant="outline" className="flex items-center gap-1">
          <span>Category: {filters.category}</span>
          <X size={14} className="cursor-pointer" onClick={() => setFilters({ category: "all" })} />
        </Badge>
      )}

      {(filters.clickbaitRange[0] > 0 || filters.clickbaitRange[1] < 100) && (
        <Badge variant="outline" className="flex items-center gap-1">
          <span>
            Clickbait: {filters.clickbaitRange[0]}%-{filters.clickbaitRange[1]}%
          </span>
          <X size={14} className="cursor-pointer" onClick={() => setFilters({ clickbaitRange: [0, 100] })} />
        </Badge>
      )}

      {(filters.biasRange[0] > 0 || filters.biasRange[1] < 100) && (
        <Badge variant="outline" className="flex items-center gap-1">
          <span>
            Bias: {filters.biasRange[0]}%-{filters.biasRange[1]}%
          </span>
          <X size={14} className="cursor-pointer" onClick={() => setFilters({ biasRange: [0, 100] })} />
        </Badge>
      )}

      {filters.targetGeneration !== "all" && (
        <Badge variant="outline" className="flex items-center gap-1">
          <span>Generation: {filters.targetGeneration}</span>
          <X size={14} className="cursor-pointer" onClick={() => setFilters({ targetGeneration: "all" })} />
        </Badge>
      )}

      {filters.source !== "all" && (
        <Badge variant="outline" className="flex items-center gap-1">
          <span>Source: {filters.source}</span>
          <X size={14} className="cursor-pointer" onClick={() => setFilters({ source: "all" })} />
        </Badge>
      )}

      <Badge variant="secondary" className="cursor-pointer" onClick={resetFilters}>
        Clear all
      </Badge>
    </div>
  )
}
