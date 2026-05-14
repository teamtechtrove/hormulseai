import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import Seo from "@/components/Seo";

export default function Education() {
  const [articles, setArticles] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);

  useEffect(() => {
    supabase.from("education_articles").select("*").eq("published", true).order("created_at", { ascending: false })
      .then(({ data }) => { setArticles(data ?? []); setActive((data ?? [])[0] ?? null); });
  }, []);

  const articleJsonLd = useMemo(() => active ? ({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: active.title,
    articleSection: active.category ?? undefined,
    articleBody: active.content,
  }) : undefined, [active]);

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-6 max-w-6xl mx-auto">
      <Seo
        title="Education — Hormulse AI"
        description="Hormone wellness articles: sleep, nutrition, energy, stress, and movement — curated to help you understand your body."
        path="/education"
        jsonLd={articleJsonLd}
      />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold mb-3">Education</h1>
        {articles.map((a) => (
          <button key={a.id} onClick={() => setActive(a)}
            className={`w-full text-left rounded-lg border p-3 transition-colors ${
              active?.id === a.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
            }`}>
            <div className="font-medium">{a.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{a.excerpt}</div>
            {a.category && <Badge variant="secondary" className="mt-2">{a.category}</Badge>}
          </button>
        ))}
      </div>
      <Card className="shadow-soft">
        {active ? (
          <>
            <CardHeader>
              <CardTitle>{active.title}</CardTitle>
              {active.category && <Badge variant="outline">{active.category}</Badge>}
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{active.content}</ReactMarkdown>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="py-16 text-center text-muted-foreground">No articles yet.</CardContent>
        )}
      </Card>
    </div>
  );
}
