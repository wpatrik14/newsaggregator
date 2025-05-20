import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getArticleById } from "@/lib/articles"
import ArticleDetail from "@/components/article-detail"
import { ArticleDetailSkeleton } from "@/components/skeletons"
import BackButton from "@/components/back-button"
import { Loader2 } from "lucide-react"

export default async function ArticlePage({ params }: { params: { id: string } }) {
  const article = await getArticleById(params.id)

  if (!article) {
    notFound()
  }

  // If the article is not analyzed yet, show a loading state
  if (!article.analyzed) {
    return (
      <main className="container mx-auto px-4 py-8">
        <BackButton />
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin mb-4" />
          <h2 className="text-2xl font-bold mb-2">Analyzing Article</h2>
          <p className="text-muted-foreground text-center max-w-md">
            This article is currently being analyzed by our AI. Please check back in a few moments.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <BackButton />
      <Suspense fallback={<ArticleDetailSkeleton />}>
        <ArticleDetail article={article} />
      </Suspense>
    </main>
  )
}
