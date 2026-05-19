import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Copy, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { PLANS, PlanId, BKASH, formatBDT } from "@/lib/plans";
import Seo from "@/components/Seo";

export default function Checkout() {
  const { plan: planParam } = useParams<{ plan: string }>();
  const { user } = useAuth();
  const nav = useNavigate();
  const [trxId, setTrxId] = useState("");
  const [msisdn, setMsisdn] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return <Navigate to="/auth" replace />;
  if (!planParam || !(planParam in PLANS) || planParam === "free") {
    return <Navigate to="/pricing" replace />;
  }
  const plan = PLANS[planParam as PlanId];
  const ref = BKASH.reference(user.id);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  const submit = async () => {
    if (!trxId.trim()) return toast.error("Enter your bKash transaction ID");
    setBusy(true);
    try {
      let screenshotPath: string | null = null;
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Screenshot must be under 5MB");
        const path = `${user.id}/payments/${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage.from("uploads").upload(path, file, {
          contentType: file.type,
        });
        if (error) throw error;
        screenshotPath = path;
      }
      const { error } = await supabase.from("payment_requests").insert({
        user_id: user.id,
        user_email: user.email,
        plan: plan.id,
        amount_bdt: plan.price,
        trx_id: trxId.trim(),
        sender_msisdn: msisdn.trim() || null,
        screenshot_path: screenshotPath,
      });
      if (error) throw error;
      toast.success("Submitted — we'll activate within a few hours");
      nav("/dashboard");
    } catch (e: any) {
      toast.error(e.message ?? "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo title={`Checkout · ${plan.name} — Hormulse AI`} description="Activate your Hormulse plan via bKash." path={`/checkout/${plan.id}`} />
      <header className="container mx-auto flex items-center justify-between py-5">
        <Link to="/pricing" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to pricing
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary"><Sparkles className="h-4 w-4 text-primary-foreground" /></div>
          <span className="font-semibold">Hormulse AI</span>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Checkout — {plan.name}</h1>
        <p className="text-muted-foreground mb-8">{formatBDT(plan.price)}/month · 30 days from approval</p>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>1. Send the payment</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Open bKash → <span className="font-medium text-foreground">Payment</span> ({BKASH.type}).
              </p>
              <Field label="Merchant number" value={BKASH.merchant} onCopy={copy} />
              <Field label="Amount (BDT)" value={String(plan.price)} onCopy={copy} />
              <Field label="Reference (paste in message)" value={ref} onCopy={copy} />
              <div className="rounded-md bg-muted/50 border border-border p-3 text-xs text-muted-foreground">
                Use your own bKash number — we use it to verify if needed.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>2. Confirm the payment</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="trxid">bKash transaction ID</Label>
                <Input id="trxid" placeholder="e.g. 9F4K7P2X3M" value={trxId} onChange={(e) => setTrxId(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="msisdn">Your bKash number (optional)</Label>
                <Input id="msisdn" placeholder="01XXXXXXXXX" value={msisdn} onChange={(e) => setMsisdn(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="receipt">Receipt screenshot (optional, ≤5MB)</Label>
                <Input id="receipt" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <Button onClick={submit} disabled={busy} className="w-full bg-gradient-primary shadow-glow">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit for activation</>}
              </Button>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Manual activation within 2–6 hours, max 24h.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onCopy }: { label: string; value: string; onCopy: (v: string) => void }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
        <span className="font-mono text-sm">{value}</span>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onCopy(value)} aria-label={`Copy ${label}`}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
