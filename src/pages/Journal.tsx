import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Notebook, Sparkles, Loader2 } from "lucide-react";
import Seo from "@/components/Seo";

type Entry = {
  id: string;
  content: string;
  language: string;
  mood_score: number | null;
  ai_summary: string | null;
  ai_mood: string | null;
  created_at: string;
};

export default function Journal() {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState<"bn" | "en">("bn");
  const [mood, setMood] = useState<number>(6);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("journal_entries").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
    setEntries((data ?? []) as Entry[]);
  };
  useEffect(() => { load(); }, [user]);

  const save = async () => {
    if (!user || !content.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("journal_entries")
      .insert({ user_id: user.id, content: content.trim(), language, mood_score: mood })
      .select().single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setContent("");
    toast.success("Saved. Analyzing…");
    if (data) analyze(data.id);
    load();
  };

  const analyze = async (id: string) => {
    setAnalyzing(id);
    try {
      const { data, error } = await supabase.functions.invoke("journal-mood-summary", { body: { entry_id: id } });
      if (error) throw error;
      toast.success("Mood summary ready");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Could not analyze");
    } finally {
      setAnalyzing(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Seo title="Journal — Hormulse AI" description="Bangla-first private journal with AI mood summary." path="/journal" />
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Notebook className="h-6 w-6 text-primary" /> Journal
        </h1>
        <p className="text-muted-foreground mt-1">Write in Bangla or English. AI summarizes your mood — privately.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>New entry</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button size="sm" variant={language === "bn" ? "default" : "outline"} onClick={() => setLanguage("bn")}>বাংলা</Button>
            <Button size="sm" variant={language === "en" ? "default" : "outline"} onClick={() => setLanguage("en")}>English</Button>
          </div>
          <Textarea
            rows={6}
            placeholder={language === "bn" ? "আজ কেমন লাগছে? কী হলো আজ…" : "How are you feeling today?"}
            value={content} onChange={(e) => setContent(e.target.value)}
          />
          <div>
            <Label className="flex justify-between">
              <span>Mood (1–10)</span><span className="text-muted-foreground">{mood}</span>
            </Label>
            <Slider value={[mood]} min={1} max={10} step={1} className="mt-2"
              onValueChange={(v) => setMood(v[0])} />
          </div>
          <Button onClick={save} disabled={saving || !content.trim()} className="bg-gradient-primary">
            {saving ? "Saving…" : "Save & analyze"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent entries</CardTitle></CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet. Your first entry is the hardest.</p>
          ) : (
            <ul className="space-y-4">
              {entries.map((e) => (
                <li key={e.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()} · mood {e.mood_score}/10
                    </div>
                    {e.ai_mood ? (
                      <Badge variant="secondary">{e.ai_mood}</Badge>
                    ) : (
                      <Button size="sm" variant="outline" disabled={analyzing === e.id} onClick={() => analyze(e.id)}>
                        {analyzing === e.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                        Analyze
                      </Button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{e.content}</p>
                  {e.ai_summary && (
                    <p className="mt-3 text-sm text-muted-foreground italic border-l-2 border-primary pl-3">
                      {e.ai_summary}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
