// Streaming chat for Hormulse AI. Uses provider keys from app_settings.provider_keys
// (admin-managed) when set, else falls back to Lovable AI Gateway.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Provider = "lovable" | "openai" | "anthropic" | "deepseek" | "groq";

function endpointFor(provider: Provider) {
  switch (provider) {
    case "openai":
      return "https://api.openai.com/v1/chat/completions";
    case "deepseek":
      return "https://api.deepseek.com/chat/completions";
    case "groq":
      return "https://api.groq.com/openai/v1/chat/completions";
    case "anthropic":
      return "https://api.anthropic.com/v1/messages";
    default:
      return LOVABLE_GATEWAY;
  }
}

function defaultModelFor(provider: Provider) {
  switch (provider) {
    case "openai":
      return "gpt-4o-mini";
    case "deepseek":
      return "deepseek-chat";
    case "groq":
      return "llama-3.3-70b-versatile";
    case "anthropic":
      return "claude-3-5-sonnet-latest";
    default:
      return "google/gemini-3-flash-preview";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Require authenticated caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, sessionId } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load AI settings + provider keys
    const { data: settingsRows } = await admin
      .from("app_settings")
      .select("key,value")
      .in("key", ["ai", "provider_keys"]);
    const aiCfg =
      (settingsRows?.find((r) => r.key === "ai")?.value as any) ?? {};
    const keys =
      (settingsRows?.find((r) => r.key === "provider_keys")?.value as any) ?? {};

    const provider = (aiCfg.default_provider ?? "lovable") as Provider;
    const model = aiCfg.default_model ?? defaultModelFor(provider);
    const temperature = aiCfg.temperature ?? 0.7;
    const systemPrompt =
      aiCfg.system_prompt ??
      "You are Hormulse AI, a helpful wellness assistant.";

    // Resolve API key
    let apiKey: string | undefined;
    let usedProvider: Provider = provider;
    if (provider !== "lovable" && keys[provider]) {
      apiKey = keys[provider];
    } else if (LOVABLE_API_KEY) {
      apiKey = LOVABLE_API_KEY;
      usedProvider = "lovable";
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "No AI provider configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const finalModel = usedProvider === provider ? model : defaultModelFor(usedProvider);

    // Anthropic uses a different request shape — convert if needed
    let upstream: Response;
    if (usedProvider === "anthropic") {
      upstream = await fetch(endpointFor("anthropic"), {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: finalModel,
          max_tokens: aiCfg.max_tokens ?? 2048,
          system: systemPrompt,
          stream: true,
          messages: messages.map((m: any) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          })),
        }),
      });

      // Anthropic SSE differs — convert to OpenAI-style data: chunks
      const stream = new ReadableStream({
        async start(controller) {
          const reader = upstream.body!.getReader();
          const dec = new TextDecoder();
          const enc = new TextEncoder();
          let buf = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            let idx;
            while ((idx = buf.indexOf("\n")) !== -1) {
              const line = buf.slice(0, idx).trim();
              buf = buf.slice(idx + 1);
              if (!line.startsWith("data:")) continue;
              const json = line.slice(5).trim();
              if (!json || json === "[DONE]") continue;
              try {
                const obj = JSON.parse(json);
                const text = obj.delta?.text;
                if (text) {
                  const chunk = {
                    choices: [{ delta: { content: text } }],
                  };
                  controller.enqueue(
                    enc.encode(`data: ${JSON.stringify(chunk)}\n\n`),
                  );
                }
              } catch (_e) { /* ignore */ }
            }
          }
          controller.enqueue(enc.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    upstream = await fetch(endpointFor(usedProvider), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: finalModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature,
        stream: true,
      }),
    });

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Try again shortly." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (upstream.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Add credits in workspace settings.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const t = await upstream.text();
      console.error("upstream error", upstream.status, t);
      return new Response(JSON.stringify({ error: "AI provider error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat fn error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
