// Analyzes an uploaded image (storage path) using a vision-capable model.
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

    const { storagePath, prompt } = await req.json();
    if (!storagePath) return new Response(JSON.stringify({ error: "storagePath required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Ensure path belongs to this user (folder = userId)
    if (!storagePath.startsWith(`${user.id}/`)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: file, error: dlErr } = await admin.storage.from("uploads").download(storagePath);
    if (dlErr || !file) throw dlErr ?? new Error("download failed");
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    const mime = file.type || "image/png";

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are Hormulse AI. Provide thoughtful wellness-focused observations from images. Never give medical diagnoses; always recommend consulting a clinician." },
          { role: "user", content: [
            { type: "text", text: prompt || "What wellness or hormonal insights can you observe from this image?" },
            { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
          ] },
        ],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("vision ai error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const analysis = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ analysis }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("vision-analyze error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
