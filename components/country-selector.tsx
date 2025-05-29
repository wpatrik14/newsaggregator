"use client"

import { useFilters } from "@/contexts/filter-context"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Globe } from "lucide-react"

// Countries supported by NewsAPI.org
const COUNTRIES = [
  { code: "us", name: "United States", flag: "🇺🇸" },
  { code: "gb", name: "United Kingdom", flag: "🇬🇧" },
  { code: "ca", name: "Canada", flag: "🇨🇦" },
  { code: "au", name: "Australia", flag: "🇦🇺" },
  { code: "de", name: "Germany", flag: "🇩🇪" },
  { code: "fr", name: "France", flag: "🇫🇷" },
  { code: "it", name: "Italy", flag: "🇮🇹" },
  { code: "es", name: "Spain", flag: "🇪🇸" },
  { code: "nl", name: "Netherlands", flag: "🇳🇱" },
  { code: "be", name: "Belgium", flag: "🇧🇪" },
  { code: "ch", name: "Switzerland", flag: "🇨🇭" },
  { code: "at", name: "Austria", flag: "🇦🇹" },
  { code: "ie", name: "Ireland", flag: "🇮🇪" },
  { code: "jp", name: "Japan", flag: "🇯🇵" },
  { code: "kr", name: "South Korea", flag: "🇰🇷" },
  { code: "cn", name: "China", flag: "🇨🇳" },
  { code: "in", name: "India", flag: "🇮🇳" },
  { code: "br", name: "Brazil", flag: "🇧🇷" },
  { code: "mx", name: "Mexico", flag: "🇲🇽" },
  { code: "ar", name: "Argentina", flag: "🇦🇷" },
  { code: "za", name: "South Africa", flag: "🇿🇦" },
  { code: "eg", name: "Egypt", flag: "🇪🇬" },
  { code: "il", name: "Israel", flag: "🇮🇱" },
  { code: "ae", name: "UAE", flag: "🇦🇪" },
  { code: "sa", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "tr", name: "Turkey", flag: "🇹🇷" },
  { code: "ru", name: "Russia", flag: "🇷🇺" },
  { code: "pl", name: "Poland", flag: "🇵🇱" },
  { code: "cz", name: "Czech Republic", flag: "🇨🇿" },
  { code: "hu", name: "Hungary", flag: "🇭🇺" },
  { code: "ro", name: "Romania", flag: "🇷🇴" },
  { code: "bg", name: "Bulgaria", flag: "🇧🇬" },
  { code: "hr", name: "Croatia", flag: "🇭🇷" },
  { code: "sk", name: "Slovakia", flag: "🇸🇰" },
  { code: "si", name: "Slovenia", flag: "🇸🇮" },
  { code: "lt", name: "Lithuania", flag: "🇱🇹" },
  { code: "lv", name: "Latvia", flag: "🇱🇻" },
  { code: "ee", name: "Estonia", flag: "🇪🇪" },
  { code: "fi", name: "Finland", flag: "🇫🇮" },
  { code: "se", name: "Sweden", flag: "🇸🇪" },
  { code: "no", name: "Norway", flag: "🇳🇴" },
  { code: "dk", name: "Denmark", flag: "🇩🇰" },
]

export function CountrySelector() {
  const { filters, setFilters } = useFilters()
  const currentCountry = COUNTRIES.find((c) => c.code === filters.country) || COUNTRIES[0]

  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Globe className="h-4 w-4" />
            <span>
              {currentCountry.flag} {currentCountry.name}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-96 overflow-y-auto">
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
