import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sparkles, MessageSquare, Activity, CalendarCheck, ShieldCheck,
  ArrowRight, Check, Zap, Globe2, Image as ImageIcon, Brain, Lock,
  Star,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Seo from "@/components/Seo";
import { PLANS, PLAN_ORDER, formatBDT } from "@/lib/plans";

const PROVIDERS = ["Gemini 2.5", "Claude 3.5", "DeepSeek", "Groq", "GPT-5"];

const FEATURES = [
  { icon: Brain, t: "Multi-model routing", d: "Gemini, Claude, DeepSeek and Groq — picked per query for best quality and cost." },
  { icon: ImageIcon, t: "Vision & image gen", d: "Upload lab reports, food photos, or screenshots. Generate diagrams on demand." },
  { icon: CalendarCheck, t: "Daily wellness plan", d: "Personalized morning brief built from your tracking, sleep and goals." },
  { icon: Activity, t: "Symptom & cycle tracking", d: "Mood, energy, sleep, cycle and weight in one timeline the AI can read." },
  { icon: Globe2, t: "Bangla aware", d: "Understands Bangla medical terms and local food, climate and lifestyle context." },
  { icon: Lock, t: "Private by default", d: "Row-level security on every record. You own your data, exportable any time." },
];

const FAQ = [
  ["How is this different from ChatGPT?", "Hormulse is tuned for Bangladeshi wellness — local foods, climate, Bangla terms — and costs 12× less. ChatGPT Plus is ৳2,400/mo; Pro is ৳199."],
  ["Can I pay with bKash?", "Yes. Manual bKash activation today (approval in 2–6 hours). Automatic SSLCommerz checkout rolls out next month."],
  ["Will my health data stay private?", "Every record is protected by row-level security. Only you see your data. We never sell or share it."],
  ["What if I just want to try it?", "Free tier gives you 15 messages a day — enough for daily hormone, sleep and nutrition questions. No card required."],
  ["What if I exceed my daily limit?", "Free users see an upgrade prompt at the limit. Lite and above users get higher or unlimited daily caps."],
];

export default function Index() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Hormulse AI — premium wellness AI for Bangladesh"
        description="Enterprise-grade AI for hormone, sleep and nutrition. Free 15 msg/day. Pro ৳199/mo — 12× cheaper than ChatGPT Plus. Pay with bKash."
        path="/"
      />

      {/* ===== Nav ===== */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/60">
        <div className="container mx-auto flex items-center justify-between py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg tracking-tight">Hormulse AI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <Button asChild variant="ghost" size="sm"><a href="#features">Features</a></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/pricing">Pricing</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/about">About</Link></Button>
            <Button asChild variant="ghost" size="sm"><a href="#faq">FAQ</a></Button>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm"><Link to="/dashboard">Open app <ArrowRight className="h-4 w-4" /></Link></Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
                <Button asChild size="sm" className="bg-gradient-primary shadow-glow"><Link to="/auth">Get started</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-[0.08]" />
        <div className="absolute inset-0 -z-10 [background-image:radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.18),transparent_50%),radial-gradient(circle_at_80%_60%,hsl(var(--secondary)/0.15),transparent_55%)]" />
        <div className="container mx-auto px-4 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 backdrop-blur px-3 py-1 text-xs text-muted-foreground mb-6">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            🇧🇩 Built for Bangladesh — pay with bKash
          </div>
          <h1 className="text-4xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
            AI that costs <span className="text-gradient-primary">less than lunch</span>
            <br className="hidden md:block" />
            <span className="text-muted-foreground font-medium md:text-5xl">for your hormones, sleep & energy.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-muted-foreground mb-8">
            Hormulse Pro is <span className="text-foreground font-medium">৳199/mo</span> — that's 12× cheaper than ChatGPT Plus, with multi-model routing, vision, and a personalized daily plan.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-primary shadow-glow hover:opacity-95">
              <Link to={user ? "/dashboard" : "/auth"}>
                {user ? "Open dashboard" : "Start free — 15 msgs/day"} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/pricing">See pricing</Link>
            </Button>
          </div>
          <div className="mt-10 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Private by default</span>
            <span className="h-3 w-px bg-border" />
            <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Streaming responses</span>
            <span className="h-3 w-px bg-border" />
            <span className="flex items-center gap-1"><Star className="h-3 w-3" /> No card to start</span>
          </div>
        </div>

        {/* Model strip */}
        <div className="border-y border-border/60 bg-muted/30">
          <div className="container mx-auto px-4 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-muted-foreground">
            <span className="text-xs uppercase tracking-wider">Routed automatically across</span>
            {PROVIDERS.map((p) => (
              <span key={p} className="font-mono font-medium text-foreground/80 tracking-tight">{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <div className="text-xs uppercase tracking-wider text-primary mb-3">What's inside</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Built like an AI operating system — not a wrapper.</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.t} className="group rounded-2xl border border-border bg-gradient-card p-6 shadow-soft hover:shadow-elevated transition-shadow">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="font-semibold mb-1">{f.t}</div>
              <div className="text-sm text-muted-foreground">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Cost comparison ===== */}
      <section className="container mx-auto px-4 py-16">
        <div className="rounded-3xl border border-border bg-gradient-card p-8 md:p-12 shadow-elevated">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="text-xs uppercase tracking-wider text-primary mb-3">The real math</div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">For a junior dev earning ৳35,000/month</h2>
              <p className="text-muted-foreground mb-6">
                ChatGPT Plus eats <span className="text-foreground font-semibold">6.9%</span> of monthly salary.
                Hormulse Pro takes just <span className="text-foreground font-semibold">0.57%</span>. That's the "don't think twice" threshold.
              </p>
              <Button asChild className="bg-gradient-primary shadow-glow">
                <Link to="/pricing">Compare plans <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="space-y-3">
              {[
                { name: "ChatGPT Plus", price: 2400, pct: 6.9, bad: true },
                { name: "Claude Pro", price: 2400, pct: 6.9, bad: true },
                { name: "Perplexity Pro", price: 2400, pct: 6.9, bad: true },
                { name: "Hormulse Lite", price: 99, pct: 0.28 },
                { name: "Hormulse Pro", price: 199, pct: 0.57, highlight: true },
              ].map((row) => (
                <div key={row.name} className={`flex items-center justify-between rounded-xl border p-3 ${
                  row.highlight ? "border-primary bg-primary/5" : "border-border bg-background"
                }`}>
                  <span className={`text-sm ${row.bad ? "text-muted-foreground line-through" : "font-medium"}`}>
                    {row.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">৳{row.price.toLocaleString("en-BD")}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      row.bad ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"
                    }`}>{row.pct}% of salary</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Pricing preview ===== */}
      <section id="pricing" className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <div className="text-xs uppercase tracking-wider text-primary mb-3">Pricing</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Don't think twice.</h2>
          <p className="text-muted-foreground mt-3">Free to start. Upgrade when you outgrow it.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLAN_ORDER.map((id) => {
            const p = PLANS[id];
            return (
              <div key={id} className={`relative rounded-2xl border bg-gradient-card p-6 shadow-soft flex flex-col ${
                p.highlight ? "border-primary shadow-glow ring-1 ring-primary/30" : "border-border"
              }`}>
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full shadow-glow">
                    Most popular
                  </div>
                )}
                <div className="font-semibold">{p.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{formatBDT(p.price)}</span>
                  {p.price > 0 && <span className="text-muted-foreground text-xs">/mo</span>}
                </div>
                <ul className="mt-4 space-y-1.5 text-xs flex-1">
                  {p.features.slice(0, 4).map((f) => (
                    <li key={f} className="flex gap-1.5"><Check className="h-3 w-3 text-primary shrink-0 mt-0.5" /><span>{f}</span></li>
                  ))}
                </ul>
                <Button asChild className={`mt-5 w-full ${p.highlight ? "bg-gradient-primary shadow-glow" : ""}`} variant={p.highlight ? "default" : "outline"} size="sm">
                  <Link to={id === "free" ? (user ? "/dashboard" : "/auth") : (user ? `/checkout/${id}` : "/auth")}>
                    {p.cta}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="container mx-auto px-4 py-20 max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-10">Questions, answered.</h2>
        <div className="space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-xl border border-border bg-card p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between cursor-pointer font-medium">
                {q}
                <span className="text-muted-foreground group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-sm text-muted-foreground mt-3">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="container mx-auto px-4 pb-24">
        <div className="rounded-3xl bg-gradient-hero p-10 md:p-16 text-center text-white shadow-glow">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Your daily wellness companion is one click away.</h2>
          <p className="opacity-90 max-w-xl mx-auto mb-6">Free forever for the basics. Upgrade for ৳99 when you want more.</p>
          <Button asChild size="lg" variant="secondary" className="bg-white text-foreground hover:bg-white/90">
            <Link to={user ? "/dashboard" : "/auth"}>
              {user ? "Open dashboard" : "Get started — it's free"} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-border/60">
        <div className="container mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-medium text-foreground">Hormulse AI</span>
            <span>· © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/about" className="hover:text-foreground">About</Link>
            <a href="https://portfolioofarman.netlify.app/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              Built by Arman Rafi ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
