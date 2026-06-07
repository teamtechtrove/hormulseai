import { Globe, ExternalLink, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import founderAsset from "@/assets/founder-arman.jpeg.asset.json";

const PORTFOLIO = "https://portfolioofarman.netlify.app/";

export default function FounderSection({ compact = false }: { compact?: boolean }) {
  return (
    <section id="founder" className="container mx-auto px-4 py-20">
      <div className="grid md:grid-cols-[auto,1fr] gap-8 md:gap-12 items-center max-w-5xl mx-auto">
        <div className="relative mx-auto md:mx-0">
          <div className="absolute -inset-3 rounded-3xl bg-gradient-primary opacity-30 blur-2xl" aria-hidden />
          <div className="relative h-56 w-56 md:h-72 md:w-72 rounded-3xl overflow-hidden ring-1 ring-border bg-gradient-to-b from-card to-background shadow-glow">
            <img
              src={founderAsset.url}
              alt="Arman Rafi — founder of Hormulse AI"
              className="h-full w-full object-cover object-top"
              loading="lazy"
            />
          </div>
        </div>

        <div className="space-y-5 text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Built in Bangladesh
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Meet the founder — <span className="bg-gradient-primary bg-clip-text text-transparent">Arman Rafi</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            I built Hormulse AI because wellness apps in Bangladesh are either too expensive,
            too foreign, or don't understand our food, climate and Bangla terms.
            Hormulse is the AI companion I wished existed — affordable enough that anyone
            can afford it, smart enough to actually help.
          </p>

          {!compact && (
            <div className="rounded-2xl border border-border bg-card/60 p-5 text-left">
              <Quote className="h-5 w-5 text-primary mb-2" />
              <p className="text-sm text-muted-foreground italic">
                "Premium AI shouldn't cost a day's wage. If a rickshaw puller's daughter
                in Sylhet can ask her hormones a question in Bangla and get a real answer
                for ৳99, that's the win."
              </p>
              <p className="text-xs text-muted-foreground mt-3">— Arman, founder</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            <Button asChild className="bg-gradient-primary shadow-glow">
              <a href={PORTFOLIO} target="_blank" rel="noopener noreferrer">
                <Globe className="h-4 w-4 mr-2" /> Visit portfolio
                <ExternalLink className="h-3 w-3 ml-2 opacity-70" />
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="mailto:hello@hormulseai.com">Partner with me</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
