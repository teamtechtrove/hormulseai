import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageSquare, Activity, CalendarCheck, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Seo from "@/components/Seo";

const Index = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Hormulse AI — Your wellness companion"
        description="Track mood, sleep & energy. Chat with an AI that knows your patterns and get a personalized plan every day."
        path="/"
      />
      <header className="container mx-auto flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">Hormulse AI</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost"><Link to="/about">About</Link></Button>
          {user ? (
            <Button asChild><Link to="/dashboard">Open app</Link></Button>
          ) : (
            <Button asChild><Link to="/auth">Sign in</Link></Button>
          )}
        </nav>
      </header>

      <section className="container mx-auto px-4 py-16 md:py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground mb-6">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
          Hormone wellness, powered by AI
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Your daily <span className="text-gradient-primary">wellness companion</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-muted-foreground mb-8">
          Track mood, sleep and energy. Chat with an AI that knows your patterns.
          Get a personalized plan every morning.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="bg-gradient-primary shadow-glow hover:opacity-90">
            <Link to={user ? "/dashboard" : "/auth"}>{user ? "Open dashboard" : "Get started — it's free"}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/about">Learn about our wellness approach</Link>
          </Button>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-24 grid md:grid-cols-4 gap-4">
        {[
          { icon: MessageSquare, t: "AI Chat", d: "Streaming responses, image analysis." },
          { icon: Activity, t: "Tracking", d: "Mood, sleep, energy, symptoms." },
          { icon: CalendarCheck, t: "Daily Plan", d: "AI-generated, personalized." },
          { icon: ShieldCheck, t: "Private", d: "Row-level security, your data." },
        ].map((f) => (
          <div key={f.t} className="rounded-2xl border border-border bg-gradient-card p-6 shadow-soft">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
              <f.icon className="h-5 w-5" />
            </div>
            <div className="font-semibold mb-1">{f.t}</div>
            <div className="text-sm text-muted-foreground">{f.d}</div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default Index;
