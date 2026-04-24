// Generates a personalized daily plan from recent tracking logs using AI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const supa = createClient(SUPABASE_URL, SERVICE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Last 7 tracking logs
    const { data: logs } = await supa
      .from("tracking_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(7);

    const today = new Date().toISOString().slice(0, 10);

    const prompt = `You are Hormulse AI. Build a personalized daily plan for today (${today}) based on the user's recent wellness logs.\n\nLogs:\n${JSON.stringify(logs ?? [], null, 2)}\n\nReturn ONLY valid JSON with shape: {"summary": string, "morning": string[], "afternoon": string[], "evening": string[], "nutrition": string[], "movement": string[], "mindfulness": string[]}. Each array contains 2-4 short actionable items.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You output strict JSON only — no prose, no markdown fences." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("plan ai error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    let text: string = data.choices?.[0]?.message?.content ?? "{}";
    text = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    let plan: any = {};
    try { plan = JSON.parse(text); } catch { plan = { summary: text }; }

    const { data: saved, error } = await supa
      .from("daily_plans")
      .upsert(
        { user_id: user.id, date: today, plan, summary: plan.summary ?? null },
        { onConflict: "user_id,date" },
      )
      .select()
      .single();
    if (error) throw error;

    return new Response(JSON.stringify(saved), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-plan error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
