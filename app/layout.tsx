import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { FilterProvider } from "@/contexts/filter-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "News Analyzer - AI-Powered News Analysis",
  description: "Analyze news articles for bias, clickbait, and target audience",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <FilterProvider>
            {children}
          </FilterProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
