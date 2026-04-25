import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Sparkles, ExternalLink, LogIn, LayoutDashboard } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

  return (
    <div className="min-h-screen bg-background">
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
        <CardHeader><CardTitle>How it works under the hood</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Item label="Frontend" value="React + Vite + Tailwind + shadcn/ui" />
          <Item label="Backend" value="Lovable Cloud (Postgres + Auth + Edge Functions + Storage)" />
          <Item label="AI" value="Lovable AI Gateway by default; admin can plug OpenAI / Anthropic / DeepSeek / Groq keys per provider." />
          <Item label="Security" value="Row-level security, separate user_roles table, JWT-validated edge functions, signed-in-only uploads scoped to your folder." />
          <Item label="Privacy" value="Each user sees only their own logs, chats and plans. Admins can read aggregate data through the admin panel." />
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

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 border-b border-border last:border-0 py-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:w-32 shrink-0">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
