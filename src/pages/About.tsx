import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Sparkles, ExternalLink, LogIn, LayoutDashboard } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Seo from "@/components/Seo";

export default function About() {
  const { user } = useAuth();
  const [site, setSite] = useState<any>({});
  const [faq, setFaq] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "site").maybeSingle()
      .then(({ data }) => setSite((data?.value as any) ?? {}));
    supabase.from("faq_items").select("*").order("sort_order")
      .then(({ data }) => setFaq(data ?? []));
  }, []);

  const portfolio = site.portfolio_url ?? "https://portfolioofarman.netlify.app/";

  const faqJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  }), [faq]);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="About — Hormulse AI"
        description="About Hormulse AI: an AI-powered wellness companion built by Arman to track mood, sleep, energy, and craft daily plans."
        path="/about"
        jsonLd={faq.length ? faqJsonLd : undefined}
      />
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">{site.name ?? "Hormulse AI"}</span>
          </Link>
          {user ? (
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard"><LayoutDashboard className="h-4 w-4 mr-1" />Dashboard</Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="bg-gradient-primary">
              <Link to="/auth"><LogIn className="h-4 w-4 mr-1" />Sign in</Link>
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in">
      <Card className="shadow-soft bg-gradient-card overflow-hidden">
        <div className="bg-gradient-hero p-8 text-primary-foreground">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/20 backdrop-blur">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{site.name ?? "Hormulse AI"}</h1>
              <p className="opacity-90">{site.tagline ?? "AI-powered hormone wellness"}</p>
            </div>
          </div>
        </div>
        <CardContent className="pt-6 space-y-3">
          <p className="text-muted-foreground">
            Hormulse AI is a personal wellness assistant. Track your daily signals — mood, sleep,
            energy, weight, symptoms — and let AI generate personalized daily plans, answer
            questions, and analyze images. Your data is private and protected by row-level
            security.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader><CardTitle>The maker</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p>
            Built by <strong>Arman</strong>. See more of my work at:
          </p>
          <Button asChild className="bg-gradient-primary">
            <a href={portfolio} target="_blank" rel="noreferrer">
              <Globe className="h-4 w-4 mr-2" />
              Visit portfolio
              <ExternalLink className="h-3 w-3 ml-2 opacity-70" />
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader><CardTitle>FAQ</CardTitle></CardHeader>
        <CardContent>
          <Accordion type="single" collapsible>
            {faq.map((f) => (
              <AccordionItem key={f.id} value={f.id}>
                <AccordionTrigger>{f.question}</AccordionTrigger>
                <AccordionContent>{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      </main>
    </div>
  );
}

