import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { entry_id } = await req.json();
    if (!entry_id) return new Response(JSON.stringify({ error: "entry_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: entry, error: getErr } = await admin
      .from("journal_entries").select("*").eq("id", entry_id).eq("user_id", user.id).maybeSingle();
    if (getErr || !entry) return new Response(JSON.stringify({ error: "entry not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const system = `You are Hormulse AI, a warm Bangladeshi wellness companion. Read the user's journal entry (Bangla or English) and respond ONLY with strict JSON of shape:
{"mood":"<one of: Joyful, Calm, Neutral, Anxious, Sad, Angry, Exhausted>","summary":"<2-3 sentence reflective summary in the SAME language as the entry, gentle and validating, no medical diagnosis>"}
No code fences. No prose outside the JSON.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Language: ${entry.language}\nMood score (1-10): ${entry.mood_score}\nEntry:\n${entry.content}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("ai error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: { mood?: string; summary?: string } = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { summary: raw }; }

    await admin.from("journal_entries").update({
      ai_mood: parsed.mood ?? null,
      ai_summary: parsed.summary ?? null,
    }).eq("id", entry_id);

    return new Response(JSON.stringify({ ok: true, ...parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
