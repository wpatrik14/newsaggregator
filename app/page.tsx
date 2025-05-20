import { Suspense } from "react"
import ArticleList from "@/components/article-list"
import { ArticleListSkeleton } from "@/components/skeletons"
import DashboardHeader from "@/components/dashboard-header"
import FilterSidebar from "@/components/filter-sidebar"
import FilterStatus from "@/components/filter-status"
import { FilterProvider } from "@/contexts/filter-context"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <DashboardHeader />
      <FilterProvider>
        <div className="flex flex-1 flex-col md:flex-row">
          <FilterSidebar />
          <div className="flex-1 p-4 md:p-6">
            <h1 className="mb-6 text-3xl font-bold">News Analysis Dashboard</h1>
            <FilterStatus />
            <Suspense fallback={<ArticleListSkeleton />}>
              <ArticleList />
            </Suspense>
          </div>
        </div>
      </FilterProvider>
    </main>
  )
}
