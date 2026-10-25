import { useEffect, useMemo, useState, type ClipboardEvent } from "react";
import { BookOpen, Check, Clock3, FileText, LoaderCircle, PenLine, Plus, Send, Trash2 } from "lucide-react";
import { getTrovaSessionToken, readApiError, TROVA_API_BASE_URL } from "@/lib/trova-api";

type ArticleStatus = "draft" | "published";
type Article = { id: string; slug: string; title: string; excerpt: string; content: string; status: ArticleStatus; updatedAt: string; author: string; preview?: boolean };
const storageKey = "trova_blog_articles";

function readPreviewArticles(): Article[] {
  try {
    const value = localStorage.getItem(storageKey);
    return value ? JSON.parse(value) as Article[] : [];
  } catch { return []; }
}

function articleFromApi(raw: Record<string, unknown>): Article {
  return {
    id: String(raw.id), slug: String(raw.slug), title: String(raw.title), excerpt: String(raw.excerpt ?? ""),
    content: String(raw.content_text ?? ""), status: raw.status === "published" ? "published" : "draft",
    updatedAt: String(raw.updated_at ?? new Date().toISOString()), author: String(raw.author ?? "TrovaLabs"),
  };
}

export function AdminBlogPanel({ onToast }: { onToast: (message: string) => void }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selected, setSelected] = useState<Article | null>(null);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<ArticleStatus>("draft");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const wordCount = useMemo(() => content.trim() ? content.trim().split(/\s+/).length : 0, [content]);

  useEffect(() => {
    let active = true;
    const sessionToken = getTrovaSessionToken();
    const preview = () => {
      if (!active) return;
      setArticles(readPreviewArticles());
      setNotice(import.meta.env.DEV ? "Local preview: posts are saved in this browser until the API service is connected." : "The article service is currently unavailable.");
      setLoading(false);
    };
    if (!sessionToken || sessionToken.startsWith("dev_preview_")) { preview(); return () => { active = false; }; }
    void fetch(`${TROVA_API_BASE_URL}/v1/admin/blog`, { headers: { Authorization: `Bearer ${sessionToken}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error(await readApiError(response));
        return response.json() as Promise<{ articles: Array<Record<string, unknown>> }>;
      })
      .then((result) => { if (active) setArticles(result.articles.map(articleFromApi)); })
      .catch(() => { if (active) preview(); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const resetForm = () => { setSelected(null); setTitle(""); setExcerpt(""); setContent(""); setStatus("draft"); };
  const editArticle = (article: Article) => { setSelected(article); setTitle(article.title); setExcerpt(article.excerpt); setContent(article.content); setStatus(article.status); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const saveArticle = async (nextStatus: ArticleStatus) => {
    if (!title.trim() || content.trim().length < 20) return setNotice("Add a title and at least 20 characters of article text.");
    setSaving(true); setNotice("");
    const fields = { title: title.trim(), excerpt: excerpt.trim(), content: content.trim(), status: nextStatus };
    const sessionToken = getTrovaSessionToken();
    try {
      if (!selected?.preview && sessionToken && !sessionToken.startsWith("dev_preview_")) {
        const response = await fetch(selected ? `${TROVA_API_BASE_URL}/v1/admin/blog/${encodeURIComponent(selected.id)}` : `${TROVA_API_BASE_URL}/v1/admin/blog`, {
          method: selected ? "PUT" : "POST",
          headers: { Authorization: `Bearer ${sessionToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        if (!response.ok) throw new Error(await readApiError(response));
        const result = await response.json() as { article: Record<string, unknown> };
        const savedArticle = articleFromApi(result.article);
        setArticles((current) => [savedArticle, ...current.filter((article) => article.id !== savedArticle.id)]);
        setSelected(savedArticle); setStatus(nextStatus);
        setNotice(nextStatus === "published" ? "Published and indexed for MCP context search." : "Draft saved to the TrovaLabs API.");
      } else {
        const savedArticle: Article = { id: selected?.id ?? `preview-${crypto.randomUUID()}`, slug: slugify(title), ...fields, updatedAt: new Date().toISOString(), author: "Shadrack Mark", preview: true };
        const nextArticles = [savedArticle, ...articles.filter((article) => article.id !== savedArticle.id)];
        localStorage.setItem(storageKey, JSON.stringify(nextArticles));
        setArticles(nextArticles); setSelected(savedArticle); setStatus(nextStatus);
        setNotice(nextStatus === "published" ? "Published to this browser’s public blog preview. Configure the API to index it for MCP." : "Draft saved in this browser’s preview.");
      }
      onToast(nextStatus === "published" ? "Blog post published" : "Draft saved");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save article.");
    } finally { setSaving(false); }
  };

  const removeArticle = async (article: Article) => {
    if (!window.confirm(`Delete “${article.title}”?`)) return;
    try {
      if (!article.preview) {
        const sessionToken = getTrovaSessionToken();
        const response = await fetch(`${TROVA_API_BASE_URL}/v1/admin/blog/${encodeURIComponent(article.id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${sessionToken}` } });
        if (!response.ok) throw new Error(await readApiError(response));
      } else {
        const next = articles.filter((item) => item.id !== article.id);
        localStorage.setItem(storageKey, JSON.stringify(next)); setArticles(next);
      }
      if (selected?.id === article.id) resetForm();
      onToast("Article deleted");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not delete article."); }
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    const clipboard = event.clipboardData;
    const html = clipboard.getData("text/html");
    let plainText = clipboard.getData("text/plain");
    if (!plainText && html) {
      const document = new DOMParser().parseFromString(html, "text/html");
      document.querySelectorAll("br").forEach((node) => node.replaceWith(document.createTextNode("\n")));
      document.querySelectorAll("p, div, li, h1, h2, h3, h4, tr").forEach((node) => node.append(document.createTextNode("\n")));
      plainText = document.body.textContent ?? "";
    }
    const clean = plainText.replaceAll("\u0000", "").replace(/\r\n?/g, "\n");
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const next = content.slice(0, start) + clean + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => { target.focus(); target.setSelectionRange(start + clean.length, start + clean.length); });
  };

  return <div className="grid gap-5 xl:grid-cols-[1.35fr_.8fr]">
    <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-50 text-orange-600"><PenLine className="h-5 w-5" /></span><h2 className="mt-4 text-lg font-extrabold">{selected ? "Edit article" : "Write a blog article"}</h2><p className="mt-1 text-xs text-slate-500">Paste from Word or write directly. Formatting is cleaned to searchable text.</p></div>{selected && <button onClick={resetForm} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><Plus className="mr-1 inline h-3.5 w-3.5" />New article</button>}</div>
      <label className="mt-6 block text-xs font-bold text-slate-700">Article title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} placeholder="Building High-Throughput MCP Servers" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400" /></label>
      <label className="mt-4 block text-xs font-bold text-slate-700">Short summary<input value={excerpt} onChange={(event) => setExcerpt(event.target.value)} maxLength={500} placeholder="A short introduction shown in the public blog." className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-orange-400" /><span className="mt-1 block text-right text-[10px] font-normal text-slate-400">{excerpt.length}/500</span></label>
      <label className="mt-2 block text-xs font-bold text-slate-700">Article body<textarea value={content} onChange={(event) => setContent(event.target.value)} onPaste={handlePaste} rows={15} placeholder="Paste the text from a Word document here, or start writing…" className="mt-2 w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm font-normal leading-6 text-slate-700 outline-none placeholder:text-slate-300 focus:border-orange-400" /><span className="mt-1 flex justify-between text-[10px] font-normal text-slate-400"><span>Word formatting is removed; headings and paragraphs remain readable.</span><span>{wordCount} words</span></span></label>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-400"><BookOpen className="h-3.5 w-3.5" />{status === "published" ? "Published article" : "Draft article"}</span><div className="flex gap-2"><button disabled={saving} onClick={() => void saveArticle("draft")} className="rounded-full border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60">Save draft</button><button disabled={saving} onClick={() => void saveArticle("published")} className="inline-flex items-center gap-2 rounded-full bg-[#f97316] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#ea580c] disabled:opacity-60">{saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}{saving ? "Saving…" : "Publish & index"}</button></div></div>
      {notice && <p role="status" className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{notice}</p>}
      <p className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-[11px] leading-5 text-orange-900"><b>Search indexing:</b> Published content is embedded and added to MCP context search when the API service and embedding provider are configured.</p>
    </section>

    <aside className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-sm font-extrabold">Your articles</h2><p className="mt-1 text-xs text-slate-400">Published posts appear on the public Blog page.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{articles.length}</span></div>
      {loading ? <p className="mt-6 flex items-center gap-2 text-xs text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin" />Loading articles…</p> : articles.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-7 text-center"><FileText className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-xs font-semibold text-slate-500">No articles yet</p><p className="mt-1 text-[10px] text-slate-400">Write your first post to get started.</p></div> : <div className="mt-5 space-y-2">{articles.map((article) => <article key={article.id} className="rounded-2xl border border-slate-100 p-4"><div className="flex items-start gap-2"><button onClick={() => editArticle(article)} className="min-w-0 flex-1 text-left"><span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">{article.status === "published" ? <Check className="h-3 w-3 text-emerald-600" /> : <Clock3 className="h-3 w-3" />}{article.status}{article.preview ? " · preview" : ""}</span><b className="mt-2 block text-xs leading-5 text-slate-800">{article.title}</b><span className="mt-1 line-clamp-2 block text-[10px] leading-4 text-slate-400">{article.excerpt || article.content.slice(0, 110)}</span></button><button onClick={() => void removeArticle(article)} aria-label={`Delete ${article.title}`} className="rounded-lg p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button></div><p className="mt-3 text-[9px] text-slate-400">Updated {new Date(article.updatedAt).toLocaleDateString()}</p></article>)}</div>}
    </aside>
  </div>;
}

function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120); }
