# Fix: AI not responding

## What's broken

The `chat` edge function has several reliability issues introduced by the recent upgrade. The AI gateway itself works fine (verified directly), but the function around it is fragile:

1. **Aggressive Pro-model routing** — words like "explain", "why", "image" send every request to `google/gemini-2.5-pro` with full tool definitions. That's slow (often 10–20s per round) and combined with up to 4 tool rounds it can exceed the edge function CPU/wall-clock budget, leaving the client hanging with no response.
2. **DuckDuckGo HTML scraping** frequently returns empty/CAPTCHA from datacenter IPs, so `web_search` silently degrades.
3. **No streaming during tool use** — the current code does non-streaming gateway calls and only "fakes" a stream at the end, so any slowness looks like a frozen UI.
4. **Errors aren't visible** — the function prints "AI provider error (xxx)" but the body of the upstream error is dropped, so we can't see why it failed.
5. **Function may not be redeployed** since the last migration.

## Plan

### 1. Simplify and harden `supabase/functions/chat/index.ts`

- **Default to Flash** for everything; only escalate to Pro when the user's last message is very long (>800 chars) or explicitly asks for deep reasoning ("step by step", "deep analysis"). Image / search intent does NOT need Pro — Flash handles tool calls fine.
- **Stream the final answer directly** from the gateway (set `stream: true` on the last round) instead of buffering and re-chunking. The user sees tokens immediately.
- **Cap tool rounds at 2** (was 4) to keep latency bounded.
- **Return real upstream error bodies** in the JSON error so the client toast is informative.
- **Make `web_search` resilient**: try DuckDuckGo, fall back to a clear "no results — answer from training" tool result so the model still replies.
- **Skip tools when not needed**: only attach the `tools` array on the first round; if the model replies without calling tools, stream immediately.
- **Trim conversation history** to the last 20 messages before sending — long sessions were inflating prompt size and latency.
- Keep all existing safety: ban check, injection scan + abuse log, 30 req/min rate limit, `<user>` wrapping, system-prompt hardening.

### 2. Improve client error surfacing in `src/pages/Chat.tsx`

- When `resp.ok` is false, read the JSON body and show the actual error message in the toast (e.g. "AI credits exhausted", "Account suspended: …") instead of a generic "AI error".
- Remove the empty assistant placeholder on error so the chat doesn't show a blank bubble.

### 3. Redeploy the function

After edits, deploy `chat` so the live version matches the source.

### 4. Verify

- Direct `curl` test of the deployed function with a real auth token (via the curl_edge_functions tool) for "hi", a long question, and an image-generation request.
- Check edge function logs to confirm no errors.

## Files to change

- `supabase/functions/chat/index.ts` — rewrite tool loop + streaming + routing
- `src/pages/Chat.tsx` — better error surfacing

No database migrations required — schema is correct.
