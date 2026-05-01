import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Image as ImageIcon, Loader2, Plus, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Msg = { id?: string; role: "user" | "assistant"; content: string; image_url?: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const VISION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vision-analyze`;

export default function Chat() {
  const { user, session } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [welcome, setWelcome] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [provider, setProvider] = useState<"lovable" | "deepseek" | "anthropic" | "groq">("lovable");
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "ai").maybeSingle()
      .then(({ data }) => setWelcome((data?.value as any)?.welcome_message ?? "Hi! How can I help today?"));
  }, []);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refreshSessions();
  }, [user]);

  useEffect(() => {
    if (!activeSession) { setMessages([]); return; }
    supabase.from("chat_messages").select("*").eq("session_id", activeSession).order("created_at")
      .then(({ data }) => setMessages((data ?? []) as Msg[]));
  }, [activeSession]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const refreshSessions = async () => {
    const { data } = await supabase.from("chat_sessions").select("*").order("updated_at", { ascending: false });
    setSessions(data ?? []);
    if (data?.length && !activeSession) setActiveSession(data[0].id);
  };

  const newSession = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("chat_sessions")
      .insert({ user_id: user.id, title: "New chat" }).select().single();
    if (error) return toast.error(error.message);
    setSessions((s) => [data, ...s]);
    setActiveSession(data.id);
    setMessages([]);
  };

  const ensureSession = async (): Promise<string | null> => {
    if (activeSession) return activeSession;
    if (!user) return null;
    const { data, error } = await supabase.from("chat_sessions")
      .insert({ user_id: user.id, title: "New chat" }).select().single();
    if (error) { toast.error(error.message); return null; }
    setSessions((s) => [data, ...s]);
    setActiveSession(data.id);
    return data.id;
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading || !user) return;
    const sessionId = await ensureSession();
    if (!sessionId) return;

    const userText = input.trim();
    setInput("");
    setLoading(true);

    const userMsg: Msg = { role: "user", content: userText };
    setMessages((m) => [...m, userMsg, { role: "assistant", content: "" }]);

    // Persist user message
    await supabase.from("chat_messages").insert({
      session_id: sessionId, user_id: user.id, role: "user", content: userText,
    });

    // Auto-title for first message
    if (messages.length === 0) {
      await supabase.from("chat_sessions").update({ title: userText.slice(0, 60) }).eq("id", sessionId);
      refreshSessions();
    }

    let assistantText = "";
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          sessionId,
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok) {
        let msg = `AI error (${resp.status})`;
        try {
          const errJson = await resp.json();
          if (errJson?.error) msg = errJson.error;
        } catch { /* ignore */ }
        toast.error(msg);
        setMessages((m) => m.slice(0, -1)); // remove empty assistant placeholder
        return;
      }

      const reader = resp.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const obj = JSON.parse(json);
            const delta = obj.choices?.[0]?.delta?.content;
            if (delta) {
              assistantText += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: assistantText };
                return copy;
              });
            }
          } catch {
            buf = line + "\n" + buf; break;
          }
        }
      }

      if (assistantText) {
        await supabase.from("chat_messages").insert({
          session_id: sessionId, user_id: user.id, role: "assistant", content: assistantText,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to reach AI");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Max 10MB");
    const sessionId = await ensureSession();
    if (!sessionId) return;
    setLoading(true);
    try {
      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, file, {
        contentType: file.type, upsert: false,
      });
      if (upErr) throw upErr;
      // Bucket is private — use a short-lived signed URL for display only.
      const { data: signed } = await supabase.storage
        .from("uploads")
        .createSignedUrl(path, 60 * 60); // 1 hour
      const displayUrl = signed?.signedUrl ?? "";
      const userMsg: Msg = { role: "user", content: "📷 Analyze this image", image_url: displayUrl };
      setMessages((m) => [...m, userMsg, { role: "assistant", content: "" }]);
      // Store the storage path (not a signed URL) so we can re-sign later.
      await supabase.from("chat_messages").insert({
        session_id: sessionId, user_id: user.id, role: "user", content: userMsg.content, image_url: path,
      });
      await supabase.from("uploads").insert({ user_id: user.id, file_path: path, mime: file.type, size: file.size });

      const resp = await fetch(VISION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ storagePath: path }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Vision failed");
      const analysis = data.analysis ?? "";
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: analysis };
        return copy;
      });
      await supabase.from("chat_messages").insert({
        session_id: sessionId, user_id: user.id, role: "assistant", content: analysis,
      });
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-8rem)] max-w-6xl mx-auto">
      <Card className="hidden lg:flex flex-col p-3 shadow-soft">
        <Button onClick={newSession} className="mb-3"><Plus className="h-4 w-4 mr-2" /> New chat</Button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {sessions.map((s) => (
            <button key={s.id} onClick={() => setActiveSession(s.id)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm truncate hover:bg-muted ${activeSession === s.id ? "bg-muted font-medium" : ""}`}>
              <MessageSquare className="h-3 w-3 inline mr-2 opacity-60" />
              {s.title}
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col shadow-soft overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>{welcome}</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                m.role === "user" ? "bg-gradient-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}>
                {m.image_url && <img src={m.image_url} className="rounded-lg mb-2 max-h-60" alt="upload" />}
                {m.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} className="border-t border-border p-3 flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
          <Button type="button" variant="outline" size="icon" onClick={() => fileRef.current?.click()} disabled={loading}>
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask Hormulse anything…" disabled={loading} />
          <Button type="submit" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </Card>
    </div>
  );
}
