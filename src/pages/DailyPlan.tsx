import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import Seo from "@/components/Seo";

const URL_GEN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-plan`;

export default function DailyPlan() {
  const { user, session } = useAuth();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!user) return;
    supabase.from("daily_plans").select("*").eq("user_id", user.id).eq("date", today).maybeSingle()
      .then(({ data }) => setPlan(data));
  }, [user, today]);

  const generate = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const resp = await fetch(URL_GEN, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed");
      setPlan(data);
      toast.success("Plan ready");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  const sections = ["morning", "afternoon", "evening", "nutrition", "movement", "mindfulness"];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Seo
        title="Daily plan — Hormulse AI"
        description="Generate your AI-personalized daily wellness plan based on your recent mood, sleep, and energy logs."
        path="/plan"
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily plan</h1>
          <p className="text-muted-foreground">{today}</p>
        </div>
        <Button onClick={generate} disabled={loading} className="bg-gradient-primary">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {plan ? "Regenerate" : "Generate today's plan"}
        </Button>
      </div>

      {!plan && (
        <Card className="shadow-soft"><CardContent className="py-16 text-center text-muted-foreground">
          No plan yet. Tap <strong>Generate</strong> — Hormulse will use your recent logs to craft one.
        </CardContent></Card>
      )}

      {plan && (
        <>
          {plan.summary && (
            <Card className="shadow-soft bg-gradient-card">
              <CardHeader><CardTitle>Today's focus</CardTitle></CardHeader>
              <CardContent><p>{plan.plan?.summary ?? plan.summary}</p></CardContent>
            </Card>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {sections.map((s) => {
              const items: string[] = plan.plan?.[s] ?? [];
              if (!items.length) return null;
              return (
                <Card key={s} className="shadow-soft">
                  <CardHeader><CardTitle className="capitalize text-base">{s}</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {items.map((it, i) => (
                        <li key={i} className="flex gap-2"><span className="text-primary">•</span>{it}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
