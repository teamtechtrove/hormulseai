import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Droplet, CalendarDays } from "lucide-react";
import Seo from "@/components/Seo";

const FLOW = [
  { v: 0, l: "None" },
  { v: 1, l: "Spotting" },
  { v: 2, l: "Light" },
  { v: 3, l: "Medium" },
  { v: 4, l: "Heavy" },
];

const SYMPTOM_OPTS = [
  "Cramps", "Bloating", "Headache", "Fatigue", "Mood swings",
  "Acne", "Back pain", "Tender breasts", "Insomnia", "Cravings",
];

const MOODS = ["😊 Good", "😐 Okay", "😣 Low", "😢 Sad", "😡 Irritable"];

type Row = {
  id: string;
  date: string;
  flow_level: number | null;
  symptoms: string[] | null;
  mood: string | null;
  notes: string | null;
};

export default function Cycle() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [flow, setFlow] = useState<number>(0);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [mood, setMood] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("cycle_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(60);
    setRows((data ?? []) as Row[]);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    const found = rows.find((r) => r.date === date);
    setFlow(found?.flow_level ?? 0);
    setSymptoms(found?.symptoms ?? []);
    setMood(found?.mood ?? "");
    setNotes(found?.notes ?? "");
  }, [date, rows]);

  const toggle = (s: string) =>
    setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("cycle_logs")
      .upsert({ user_id: user.id, date, flow_level: flow, symptoms, mood, notes }, { onConflict: "user_id,date" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    load();
  };

  // Simple cycle stats: avg gap between bleeding starts (flow >=2)
  const bleedDays = rows.filter((r) => (r.flow_level ?? 0) >= 2).map((r) => r.date).sort();
  const starts: string[] = [];
  let prev: string | null = null;
  for (const d of bleedDays) {
    if (!prev || (new Date(d).getTime() - new Date(prev).getTime()) / 86400000 > 5) starts.push(d);
    prev = d;
  }
  const gaps = starts.slice(1).map((d, i) => Math.round((new Date(d).getTime() - new Date(starts[i]).getTime()) / 86400000));
  const avgCycle = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Seo title="Cycle tracker — Hormulse AI" description="Private hormone cycle and symptom tracking." path="/cycle" />
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Droplet className="h-6 w-6 text-primary" /> Cycle tracker
        </h1>
        <p className="text-muted-foreground mt-1">Private. Your data never leaves your account.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Avg cycle length</div>
          <div className="text-2xl font-semibold mt-1">{avgCycle ? `${avgCycle} days` : "—"}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Logged days (60d)</div>
          <div className="text-2xl font-semibold mt-1">{rows.length}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Last period</div>
          <div className="text-2xl font-semibold mt-1">{starts[starts.length - 1] ?? "—"}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Log day
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="date">Date</Label>
            <input
              id="date" type="date" value={date} max={today}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <Label>Flow</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {FLOW.map((f) => (
                <Button key={f.v} type="button" size="sm"
                  variant={flow === f.v ? "default" : "outline"}
                  onClick={() => setFlow(f.v)}>
                  {f.l}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Mood</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <Button key={m} type="button" size="sm"
                  variant={mood === m ? "default" : "outline"}
                  onClick={() => setMood(m === mood ? "" : m)}>
                  {m}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Symptoms</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SYMPTOM_OPTS.map((s) => (
                <Badge key={s} variant={symptoms.includes(s) ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() => toggle(s)}>
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else worth remembering…" rows={3} className="mt-1" />
          </div>

          <Button onClick={save} disabled={saving} className="bg-gradient-primary">
            {saving ? "Saving…" : "Save day"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {rows.slice(0, 14).map((r) => (
                <li key={r.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{r.date}</div>
                    <div className="text-xs text-muted-foreground">
                      {FLOW.find((f) => f.v === (r.flow_level ?? 0))?.l}
                      {r.mood ? ` · ${r.mood}` : ""}
                      {(r.symptoms?.length ?? 0) > 0 ? ` · ${r.symptoms!.join(", ")}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
