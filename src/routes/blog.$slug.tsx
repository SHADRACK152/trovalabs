import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TROVA_API_BASE_URL } from "@/lib/trova-api";

export const Route = createFileRoute("/blog/$slug")({ component: BlogArticlePage });

type Article = { slug: string; title: string; excerpt: string; content_text?: string; content?: string; author: string; published_at?: string; updatedAt?: string; status?: string; preview?: boolean };

function BlogArticlePage() {
  const { slug } = Route.useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void fetch(`${TROVA_API_BASE_URL}/v1/blog/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Article unavailable");
        return response.json() as Promise<{ article: Article }>;
      })
      .then(({ article: result }) => { if (active) setArticle(result); })
      .catch(() => {
        try {
          const local = JSON.parse(localStorage.getItem("trova_blog_articles") ?? "[]") as Article[];
          if (active) setArticle(local.find((item) => item.slug === slug && item.status === "published") ?? null);
        } catch { if (active) setArticle(null); }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  return <div className="min-h-screen bg-[#e9ecef] px-4 py-6 md:px-8 md:py-10">
    <main className="mx-auto max-w-4xl rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm sm:p-10 md:p-14">
      <Link to="/info/$slug" params={{ slug: "blog" }} className="text-sm font-semibold text-slate-500 hover:text-[#f97316]">← Engineering Notes</Link>
      {loading ? <p className="mt-10 text-sm text-slate-500">Loading article…</p> : article ? <article className="mt-10">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#f97316]">TrovaLabs Journal{article.preview ? " · Local preview" : ""}</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0f172a] md:text-5xl">{article.title}</h1>
        {article.excerpt && <p className="mt-4 text-lg leading-relaxed text-slate-500">{article.excerpt}</p>}
        <p className="mt-6 border-b border-slate-100 pb-5 text-xs text-slate-400">By {article.author}{(article.published_at || article.updatedAt) ? ` · ${new Date(article.published_at ?? article.updatedAt!).toLocaleDateString()}` : ""}</p>
        <div className="mt-8 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 md:text-base">{article.content_text ?? article.content}</div>
      </article> : <div className="py-16 text-center"><p className="text-sm font-semibold uppercase tracking-wide text-[#f97316]">Article not found</p><h1 className="mt-3 text-2xl font-extrabold text-[#0f172a]">This post may have been unpublished.</h1><p className="mt-2 text-sm text-slate-500">Return to the journal to see published articles.</p></div>}
    </main>
  </div>;
}
