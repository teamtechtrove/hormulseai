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
    <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
      <Card className="shadow-soft">
        <CardHeader><CardTitle>Log for {date}</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </div>
          <RangeField label="Mood" value={mood} onChange={setMood} />
          <RangeField label="Energy" value={energy} onChange={setEnergy} />
          <RangeField label="Sleep quality" value={sleepQuality} onChange={setSleepQuality} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sleep hours</Label>
              <Input type="number" step="0.1" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} />
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Symptoms, observations…" />
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
  );
}

function RangeField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>{label}</Label>
        <span className="text-sm font-medium text-primary">{value}/10</span>
      </div>
      <Slider min={1} max={10} step={1} value={[value]} onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}
