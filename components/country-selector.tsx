"use client"

import { useFilters } from "@/contexts/filter-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Globe } from "lucide-react"

const COUNTRIES = [
  { code: "hu", name: "Hungary", flag: "🇭🇺" },
  { code: "us", name: "United States", flag: "🇺🇸" },
  { code: "gb", name: "United Kingdom", flag: "🇬🇧" },
  { code: "de", name: "Germany", flag: "🇩🇪" },
  { code: "fr", name: "France", flag: "🇫🇷" },
  { code: "it", name: "Italy", flag: "🇮🇹" },
  { code: "es", name: "Spain", flag: "🇪🇸" },
]

export function CountrySelector() {
  const { filters, setFilters } = useFilters()
  const currentCountry = COUNTRIES.find(c => c.code === filters.country) || COUNTRIES[0]

  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Globe className="h-4 w-4" />
            <span>{currentCountry.flag} {currentCountry.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {COUNTRIES.map((country) => (
            <DropdownMenuItem
              key={country.code}
              onClick={() => setFilters({ country: country.code })}
              className="gap-2"
            >
              <span>{country.flag}</span>
              <span>{country.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
