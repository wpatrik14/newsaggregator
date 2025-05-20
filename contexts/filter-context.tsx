"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export interface FilterState {
  clickbaitRange: [number, number]
  biasRange: [number, number]
  targetGeneration: string
  source: string
  category: string
}

interface FilterContextType {
  filters: FilterState
  setFilters: (filters: Partial<FilterState>) => void
  resetFilters: () => void
}

const defaultFilters: FilterState = {
  clickbaitRange: [0, 100],
  biasRange: [0, 100],
  targetGeneration: "all",
  source: "all",
  category: "all",
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<FilterState>(defaultFilters)

  const setFilters = (newFilters: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }))
  }

  const resetFilters = () => {
    setFiltersState(defaultFilters)
  }

  return <FilterContext.Provider value={{ filters, setFilters, resetFilters }}>{children}</FilterContext.Provider>
}

export function useFilters() {
  const context = useContext(FilterContext)
  if (context === undefined) {
    throw new Error("useFilters must be used within a FilterProvider")
  }
  return context
}
