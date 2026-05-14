import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import Seo from "@/components/Seo";

export default function Tracking() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today);
  const [mood, setMood] = useState(7);
  const [energy, setEnergy] = useState(7);
  const [sleepHours, setSleepHours] = useState("7.5");
  const [sleepQuality, setSleepQuality] = useState(7);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.from("tracking_logs").select("*").eq("user_id", user.id).eq("date", date).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setMood(data.mood ?? 7);
          setEnergy(data.energy ?? 7);
          setSleepHours(String(data.sleep_hours ?? "7.5"));
          setSleepQuality(data.sleep_quality ?? 7);
          setWeight(data.weight ? String(data.weight) : "");
          setNotes(data.notes ?? "");
        }
      });
  }, [date, user]);

  const refresh = async () => {
    const { data } = await supabase.from("tracking_logs").select("*").order("date", { ascending: false }).limit(30);
    setLogs(data ?? []);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("tracking_logs").upsert({
      user_id: user.id, date, mood, energy,
      sleep_hours: Number(sleepHours) || null,
      sleep_quality: sleepQuality,
      weight: weight ? Number(weight) : null,
      notes: notes || null,
    }, { onConflict: "user_id,date" });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Saved"); refresh(); }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Seo
        title="Daily tracking — Hormulse AI"
        description="Log your daily mood, sleep, energy, weight, and notes to power personalized insights and AI plans."
        path="/tracking"
      />
      <div>
        <h1 className="text-3xl font-bold">Daily tracking</h1>
        <p className="text-muted-foreground">Log how you feel — Hormulse uses it to personalize your plan.</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
      <Card className="shadow-soft">
        <CardHeader><CardTitle>Log for {date}</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="tr-date">Date</Label>
            <Input id="tr-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </div>
          <RangeField id="tr-mood" label="Mood" value={mood} onChange={setMood} />
          <RangeField id="tr-energy" label="Energy" value={energy} onChange={setEnergy} />
          <RangeField id="tr-sq" label="Sleep quality" value={sleepQuality} onChange={setSleepQuality} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tr-sh">Sleep hours</Label>
              <Input id="tr-sh" type="number" step="0.1" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tr-w">Weight (kg)</Label>
              <Input id="tr-w" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="tr-notes">Notes</Label>
            <Textarea id="tr-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Symptoms, observations…" />
          </div>
          <Button onClick={save} disabled={saving} className="w-full bg-gradient-primary">{saving ? "Saving…" : "Save log"}</Button>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader><CardTitle>Recent logs</CardTitle></CardHeader>
        <CardContent>
          {logs.length === 0 && <p className="text-sm text-muted-foreground">No logs yet.</p>}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <div>
                  <div className="font-medium">{l.date}</div>
                  <div className="text-muted-foreground text-xs">
                    Mood {l.mood} • Energy {l.energy} • Sleep {l.sleep_hours ?? "—"}h
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setDate(l.date)}>Edit</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

function RangeField({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-sm font-medium text-primary">{value}/10</span>
      </div>
      <Slider id={id} min={1} max={10} step={1} value={[value]} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}
