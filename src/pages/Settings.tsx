import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Bell, Users, Globe2, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlan } from "@/hooks/usePlan";
import Seo from "@/components/Seo";

export default function Settings() {
  const { user } = useAuth();
  const { plan } = usePlan();
  const [prefs, setPrefs] = useState({
    reminder_morning: true, reminder_evening: false, reminder_cycle: false, locale: "bn" as "bn" | "en",
  });
  const [shares, setShares] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [shareCycle, setShareCycle] = useState(false);
  const [shareJournal, setShareJournal] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: p } = await supabase.from("profiles")
      .select("reminder_morning,reminder_evening,reminder_cycle,locale")
      .eq("id", user.id).maybeSingle();
    if (p) setPrefs(p as any);
    const { data: s } = await supabase.from("family_shares")
      .select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
    setShares(s ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const update = async (patch: Partial<typeof prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    const { error } = await supabase.from("profiles").update(patch).eq("id", user!.id);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const invite = async () => {
    if (!user || !email.trim()) return;
    if (plan !== "pro_plus") {
      return toast.error("Family sharing is a Pro+ feature");
    }
    const { error } = await supabase.from("family_shares").insert({
      owner_id: user.id, invitee_email: email.trim().toLowerCase(),
      share_cycle: shareCycle, share_journal: shareJournal, share_plan: true,
    });
    if (error) return toast.error(error.message);
    setEmail(""); setShareCycle(false); setShareJournal(false);
    toast.success("Invite sent");
    load();
  };

  const revoke = async (id: string) => {
    await supabase.from("family_shares").update({ status: "revoked" }).eq("id", id);
    load();
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Seo title="Settings — Hormulse AI" description="Reminders, language, and family sharing." path="/settings" />
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe2 className="h-5 w-5" /> Language</CardTitle>
          <CardDescription>Hormulse responds and reminds you in your preferred language.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant={prefs.locale === "bn" ? "default" : "outline"} onClick={() => update({ locale: "bn" })}>বাংলা</Button>
          <Button variant={prefs.locale === "en" ? "default" : "outline"} onClick={() => update({ locale: "en" })}>English</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Daily reminders</CardTitle>
          <CardDescription>Bangla-first nudges so you actually build the habit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { k: "reminder_morning", t: "Morning brief", d: "8:00 AM — today's plan + a question to reflect on." },
            { k: "reminder_evening", t: "Evening check-in", d: "9:30 PM — quick mood, sleep, energy log." },
            { k: "reminder_cycle", t: "Cycle reminders", d: "Predicted period + ovulation window." },
          ].map((r) => (
            <div key={r.k} className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor={r.k} className="text-sm font-medium">{r.t}</Label>
                <p className="text-xs text-muted-foreground">{r.d}</p>
              </div>
              <Switch
                id={r.k}
                checked={(prefs as any)[r.k]}
                onCheckedChange={(v) => update({ [r.k]: v } as any)}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground border-t border-border pt-3">
            Reminders are stored now and will be delivered once email/push delivery is enabled.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Family & couple sharing</CardTitle>
          <CardDescription>Share your plan (and optionally cycle/journal) with a partner or family member.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {plan !== "pro_plus" && (
            <div className="rounded-lg bg-gradient-primary/10 border border-primary/30 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Crown className="h-4 w-4 text-primary" />
                Family sharing is a Pro+ feature.
              </div>
              <Button asChild size="sm" className="bg-gradient-primary">
                <Link to="/pricing">Upgrade</Link>
              </Button>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Invite by email</Label>
            <div className="flex gap-2">
              <Input id="email" type="email" placeholder="partner@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} disabled={plan !== "pro_plus"} />
              <Button onClick={invite} disabled={plan !== "pro_plus" || !email.trim()}>Invite</Button>
            </div>
            <div className="flex gap-4 text-sm pt-1">
              <label className="flex items-center gap-2"><input type="checkbox" checked={shareCycle} onChange={(e) => setShareCycle(e.target.checked)} disabled={plan !== "pro_plus"} /> Cycle</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={shareJournal} onChange={(e) => setShareJournal(e.target.checked)} disabled={plan !== "pro_plus"} /> Journal</label>
            </div>
          </div>

          {shares.length > 0 && (
            <ul className="divide-y divide-border text-sm pt-2">
              {shares.map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.invitee_email}</div>
                    <div className="text-xs text-muted-foreground">{s.status}</div>
                  </div>
                  {s.status !== "revoked" && (
                    <Button size="sm" variant="ghost" onClick={() => revoke(s.id)}>Revoke</Button>
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
