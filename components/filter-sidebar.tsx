"use client"

import { useState } from "react"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, RotateCcw, Target, AlertTriangle, BarChart3, Users, Newspaper } from "lucide-react"
import { useFilters } from "@/contexts/filter-context"

export default function FilterSidebar() {
  const [isOpen, setIsOpen] = useState(true)
  const { filters, setFilters, resetFilters } = useFilters()

  return (
    <div className="border-r bg-muted/40 md:w-72 lg:w-80">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Filters</h2>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent>
            <div className="mt-4 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Newspaper size={16} />
                  <h3 className="font-medium">News Category</h3>
                </div>
                <Select value={filters.category} onValueChange={(value) => setFilters({ category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="science">Science</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <h3 className="font-medium">Clickbait Score</h3>
                </div>
                <Slider
                  defaultValue={[0, 100]}
                  max={100}
                  step={1}
                  value={filters.clickbaitRange}
                  onValueChange={(value) => setFilters({ clickbaitRange: value as [number, number] })}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{filters.clickbaitRange[0]}%</span>
                  <span>{filters.clickbaitRange[1]}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} />
                  <h3 className="font-medium">Bias Level</h3>
                </div>
                <Slider
                  defaultValue={[0, 100]}
                  max={100}
                  step={1}
                  value={filters.biasRange}
                  onValueChange={(value) => setFilters({ biasRange: value as [number, number] })}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{filters.biasRange[0]}%</span>
                  <span>{filters.biasRange[1]}%</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target size={16} />
                  <h3 className="font-medium">Target Generation</h3>
                </div>
                <Select
                  value={filters.targetGeneration}
                  onValueChange={(value) => setFilters({ targetGeneration: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Generations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Generations</SelectItem>
                    <SelectItem value="baby-boomers">Baby Boomers (1946-1964)</SelectItem>
                    <SelectItem value="gen-x">Generation X (1965-1980)</SelectItem>
                    <SelectItem value="millennials">Millennials (1981-1996)</SelectItem>
                    <SelectItem value="gen-z">Generation Z (1997-2012)</SelectItem>
                    <SelectItem value="gen-alpha">Generation Alpha (2013-2025)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  <h3 className="font-medium">Source</h3>
                </div>
                <Select value={filters.source} onValueChange={(value) => setFilters({ source: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="cnn">CNN</SelectItem>
                    <SelectItem value="bbc-news">BBC News</SelectItem>
                    <SelectItem value="fox-news">Fox News</SelectItem>
                    <SelectItem value="reuters">Reuters</SelectItem>
                    <SelectItem value="the-washington-post">Washington Post</SelectItem>
                    <SelectItem value="the-wall-street-journal">Wall Street Journal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" className="w-full" size="sm" onClick={resetFilters}>
                <RotateCcw size={14} className="mr-2" />
                Reset Filters
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}
