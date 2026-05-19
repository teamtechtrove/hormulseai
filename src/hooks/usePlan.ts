import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { PLANS, PlanId } from "@/lib/plans";

interface PlanState {
  plan: PlanId;
  expiresAt: string | null;
  messagesToday: number;
  loading: boolean;
  refresh: () => void;
}

export function usePlan(): PlanState {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanId>("free");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [messagesToday, setMessagesToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: sub }, { data: usage }] = await Promise.all([
        supabase.from("user_subscriptions")
          .select("plan,expires_at,status")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("usage_counters")
          .select("message_count")
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      let active: PlanId = "free";
      if (sub && sub.status === "active" &&
          (!sub.expires_at || new Date(sub.expires_at) > new Date())) {
        active = sub.plan as PlanId;
      }
      setPlan(active);
      setExpiresAt(sub?.expires_at ?? null);
      setMessagesToday(usage?.message_count ?? 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, tick]);

  return {
    plan,
    expiresAt,
    messagesToday,
    loading,
    refresh: () => setTick((t) => t + 1),
  };
}

export const planDef = (id: PlanId) => PLANS[id];
