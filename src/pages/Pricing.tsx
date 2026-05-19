import { Link } from "react-router-dom";
import { Check, Sparkles, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, PLAN_ORDER, formatBDT } from "@/lib/plans";
import { useAuth } from "@/context/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import Seo from "@/components/Seo";

export default function Pricing() {
  const { user } = useAuth();
  const { plan: currentPlan } = usePlan();

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Pricing — Hormulse AI"
        description="Bangladesh-first AI pricing. Free 15 messages/day, Lite ৳99, Pro ৳199, Pro+ ৳399. Pay by bKash."
        path="/pricing"
      />

      <header className="container mx-auto flex items-center justify-between py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">Hormulse AI</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost"><Link to="/about">About</Link></Button>
          {user ? (
            <Button asChild><Link to="/dashboard">Open app</Link></Button>
          ) : (
            <Button asChild><Link to="/auth">Sign in</Link></Button>
          )}
        </nav>
      </header>

      <section className="container mx-auto px-4 pt-10 pb-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground mb-4">
          🇧🇩 Bangladesh-first pricing · Pay with bKash
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          AI that costs <span className="text-gradient-primary">less than lunch</span>
        </h1>
        <p className="max-w-2xl mx-auto text-muted-foreground text-lg">
          ChatGPT Plus is ৳2,400/mo — 6.9% of a junior dev salary. Hormulse Pro is ৳199. Same intelligence, 12× cheaper.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-16 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const isCurrent = currentPlan === id;
          return (
            <div
              key={id}
              className={`relative rounded-2xl border bg-gradient-card p-6 shadow-soft flex flex-col ${
                p.highlight ? "border-primary shadow-glow ring-1 ring-primary/30" : "border-border"
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full shadow-glow">
                  Most popular
                </div>
              )}
              <div className="font-semibold text-lg">{p.name}</div>
              <div className="text-xs text-muted-foreground min-h-[2.5rem]">{p.tagline}</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{formatBDT(p.price)}</span>
                {p.price > 0 && <span className="text-muted-foreground text-sm">/month</span>}
              </div>
              <ul className="mt-5 space-y-2 text-sm flex-1">
                {p.features.map((f) => {
                  const negative = /no |not saved/i.test(f);
                  return (
                    <li key={f} className="flex gap-2">
                      {negative
                        ? <X className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        : <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                      <span className={negative ? "text-muted-foreground" : ""}>{f}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <Button disabled className="w-full" variant="outline">Current plan</Button>
                ) : id === "free" ? (
                  <Button asChild variant="outline" className="w-full">
                    <Link to={user ? "/dashboard" : "/auth"}>{p.cta}</Link>
                  </Button>
                ) : (
                  <Button asChild className={`w-full ${p.highlight ? "bg-gradient-primary shadow-glow" : ""}`}>
                    <Link to={user ? `/checkout/${id}` : "/auth"}>
                      {p.cta} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="container mx-auto px-4 pb-20">
        <div className="rounded-2xl border border-border bg-card p-6 md:p-10">
          <h2 className="text-2xl font-semibold mb-2">How payment works</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            We use manual bKash activation while SSLCommerz integration is in review. Activation is typically within 2–6 hours, max 24h.
          </p>
          <ol className="grid md:grid-cols-3 gap-4 text-sm">
            {[
              ["Choose a plan", "Pick Lite, Pro or Pro+ above and you'll get the bKash merchant number and a unique reference code."],
              ["Send via bKash", "Open bKash → Payment → enter the amount and our merchant number. Note your reference code in the message."],
              ["Submit + activate", "Paste the bKash trx id and upload your receipt screenshot. We approve within hours and your plan goes live."],
            ].map(([t, d], i) => (
              <li key={t} className="rounded-xl border border-border p-4">
                <div className="text-xs font-medium text-primary mb-1">Step {i + 1}</div>
                <div className="font-semibold mb-1">{t}</div>
                <div className="text-muted-foreground">{d}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
