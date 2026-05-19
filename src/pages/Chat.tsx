import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send, Image as ImageIcon, Loader2, Plus, MessageSquare, Menu,
  MoreHorizontal, Pencil, Trash2, Copy, RefreshCw, Sparkles, Bot, User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import Seo from "@/components/Seo";
import { Link } from "react-router-dom";
import { usePlan } from "@/hooks/usePlan";
import { PLANS } from "@/lib/plans";

type Msg = { id?: string; role: "user" | "assistant"; content: string; image_url?: string };
type Session = { id: string; title: string; updated_at: string };
type Provider = "lovable" | "deepseek" | "anthropic" | "groq";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const VISION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vision-analyze`;

const SUGGESTIONS = [
  { icon: "🌙", title: "Improve my sleep", prompt: "Give me 5 evidence-based ways to improve deep sleep tonight." },
  { icon: "🥗", title: "Hormone-friendly meals", prompt: "Suggest 3 hormone-friendly breakfast ideas with macros." },
  { icon: "🏃", title: "Energy slump fix", prompt: "I crash at 3pm every day. What should I change?" },
  { icon: "🧘", title: "Lower cortisol", prompt: "How can I lower cortisol naturally without supplements?" },
];

export default function Chat() {
  const { user, session } = useAuth();
  const { plan, messagesToday, refresh: refreshPlan } = usePlan();
  const planDef = PLANS[plan];
  const isFree = plan === "free";
  const dailyCap = planDef.dailyMessages;
  const remaining = Number.isFinite(dailyCap) ? Math.max(0, dailyCap - messagesToday) : Infinity;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [welcome, setWelcome] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [provider, setProvider] = useState<Provider>("lovable");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Welcome
  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "ai").maybeSingle()
      .then(({ data }) => setWelcome((data?.value as any)?.welcome_message ?? "What can I help with?"));
  }, []);

  // Admin?
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  // Sessions
  useEffect(() => {
    if (!user) return;
    refreshSessions();
  }, [user]);

  // Messages for active session
  useEffect(() => {
    if (!activeSession) { setMessages([]); return; }
    supabase.from("chat_messages").select("*").eq("session_id", activeSession).order("created_at")
      .then(({ data }) => setMessages((data ?? []) as Msg[]));
  }, [activeSession]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = taRef.current; if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  const refreshSessions = async () => {
    const { data } = await supabase.from("chat_sessions")
      .select("id,title,updated_at").order("updated_at", { ascending: false });
    setSessions((data ?? []) as Session[]);
    if (data?.length && !activeSession) setActiveSession(data[0].id);
  };

  const newSession = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("chat_sessions")
      .insert({ user_id: user.id, title: "New chat" }).select("id,title,updated_at").single();
    if (error) return toast.error(error.message);
    setSessions((s) => [data as Session, ...s]);
    setActiveSession(data.id);
    setMessages([]);
    setSidebarOpen(false);
    taRef.current?.focus();
  };

  const renameSession = async (id: string) => {
    const current = sessions.find((s) => s.id === id);
    const next = window.prompt("Rename chat", current?.title ?? "");
    if (!next || !next.trim()) return;
    const title = next.trim().slice(0, 80);
    const { error } = await supabase.from("chat_sessions").update({ title }).eq("id", id);
    if (error) return toast.error(error.message);
    setSessions((s) => s.map((x) => (x.id === id ? { ...x, title } : x)));
  };

  const deleteSession = async (id: string) => {
    if (!window.confirm("Delete this chat? This can't be undone.")) return;
    await supabase.from("chat_messages").delete().eq("session_id", id);
    const { error } = await supabase.from("chat_sessions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setSessions((s) => s.filter((x) => x.id !== id));
    if (activeSession === id) {
      setActiveSession(null);
      setMessages([]);
    }
    toast.success("Chat deleted");
  };

  const ensureSession = async (): Promise<string | null> => {
    if (activeSession) return activeSession;
    if (!user) return null;
    const { data, error } = await supabase.from("chat_sessions")
      .insert({ user_id: user.id, title: "New chat" }).select("id,title,updated_at").single();
    if (error) { toast.error(error.message); return null; }
    setSessions((s) => [data as Session, ...s]);
    setActiveSession(data.id);
    return data.id;
  };

  const send = async (textOverride?: string) => {
    const userText = (textOverride ?? input).trim();
    if (!userText || loading || !user) return;
    const sessionId = await ensureSession();
    if (!sessionId) return;

    if (!textOverride) setInput("");
    setLoading(true);

    const userMsg: Msg = { role: "user", content: userText };
    const baseHistory = messages;
    setMessages((m) => [...m, userMsg, { role: "assistant", content: "" }]);

    await supabase.from("chat_messages").insert({
      session_id: sessionId, user_id: user.id, role: "user", content: userText,
    });

    if (baseHistory.length === 0) {
      const title = userText.slice(0, 60);
      await supabase.from("chat_sessions").update({ title }).eq("id", sessionId);
      setSessions((s) => s.map((x) => (x.id === sessionId ? { ...x, title } : x)));
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
          provider: isAdmin ? provider : undefined,
          messages: [...baseHistory, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok) {
        let msg = `AI error (${resp.status})`;
        let isLimit = false;
        try { const j = await resp.json(); if (j?.error) msg = j.error; if (j?.code === "plan_limit") isLimit = true; } catch { /* ignore */ }
        if (isLimit) {
          toast.error(msg, { action: { label: "Upgrade", onClick: () => (window.location.href = "/pricing") } });
        } else {
          toast.error(msg);
        }
        setMessages((m) => m.slice(0, -1));
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
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") { done = true; break; }
          try {
            const obj = JSON.parse(payload);
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
        await supabase.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to reach AI");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
      refreshPlan();
      taRef.current?.focus();
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const regenerate = async () => {
    // re-send last user message
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser || loading) return;
    // Drop trailing assistant
    setMessages((m) => {
      const copy = [...m];
      while (copy.length && copy[copy.length - 1].role === "assistant") copy.pop();
      return copy;
    });
    await send(lastUser.content);
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!planDef.limits.uploads) {
      toast.error("Image uploads require the Lite plan or higher.", {
        action: { label: "Upgrade", onClick: () => (window.location.href = "/pricing") },
      });
      return;
    }
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
      const { data: signed } = await supabase.storage.from("uploads").createSignedUrl(path, 60 * 60);
      const displayUrl = signed?.signedUrl ?? "";
      const userMsg: Msg = { role: "user", content: "📷 Analyze this image", image_url: displayUrl };
      setMessages((m) => [...m, userMsg, { role: "assistant", content: "" }]);
      await supabase.from("chat_messages").insert({
        session_id: sessionId, user_id: user.id, role: "user", content: userMsg.content, image_url: path,
      });
      await supabase.from("uploads").insert({ user_id: user.id, file_path: path, mime: file.type, size: file.size });

      const resp = await fetch(VISION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
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

  const Sidebar = (
    <div className="flex flex-col h-full">
      <Button onClick={newSession} className="mb-3 w-full justify-start" variant="outline">
        <Plus className="h-4 w-4 mr-2" /> New chat
      </Button>
      <div className="text-xs uppercase tracking-wide text-muted-foreground px-2 mb-2">Recent</div>
      <div className="flex-1 overflow-y-auto space-y-1 -mx-1 px-1">
        {sessions.length === 0 && (
          <div className="text-xs text-muted-foreground px-2 py-4">No chats yet.</div>
        )}
        {sessions.map((s) => (
          <div key={s.id}
            className={`group flex items-center gap-1 rounded-lg pr-1 hover:bg-muted ${activeSession === s.id ? "bg-muted" : ""}`}>
            <button
              onClick={() => { setActiveSession(s.id); setSidebarOpen(false); }}
              className="flex-1 text-left px-3 py-2 text-sm truncate min-w-0"
            >
              <MessageSquare className="h-3 w-3 inline mr-2 opacity-60 shrink-0" />
              {s.title}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label="Chat options">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => renameSession(s.id)}>
                  <Pencil className="h-4 w-4 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => deleteSession(s.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-8rem)] max-w-6xl mx-auto">
      <Seo
        title="AI Chat — Hormulse AI"
        description="Chat with the Hormulse AI wellness assistant. Streaming answers, image analysis, and personalized hormone guidance."
        path="/chat"
      />
      <h1 className="sr-only">AI Chat with Hormulse</h1>
      <Card className="hidden lg:flex flex-col p-3 shadow-soft">{Sidebar}</Card>

      {/* Chat panel */}
      <Card className="flex flex-col shadow-soft overflow-hidden">
        {/* Top bar (mobile + admin model selector) */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open chat list">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-3">
              <SheetHeader className="mb-3"><SheetTitle>Chats</SheetTitle></SheetHeader>
              {Sidebar}
            </SheetContent>
          </Sheet>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={newSession} aria-label="New chat" title="New chat">
            <Plus className="h-5 w-5" />
          </Button>
          <div className="flex-1 truncate text-sm font-medium">
            {sessions.find((s) => s.id === activeSession)?.title ?? "New chat"}
          </div>
          {isAdmin && (
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              className="bg-background border border-border rounded-md px-2 py-1 text-xs"
              disabled={loading}
              title="Model (admin only)"
            >
              <option value="lovable">Gemini</option>
              <option value="deepseek">DeepSeek</option>
              <option value="anthropic">Claude</option>
              <option value="groq">Groq</option>
            </select>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-6 md:px-8">
          {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto text-center pt-8">
              <div className="h-12 w-12 rounded-2xl bg-gradient-primary text-primary-foreground mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">{welcome}</h2>
              <p className="text-muted-foreground mb-8">Ask anything about hormones, sleep, nutrition, energy, or stress.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => send(s.prompt)}
                    className="text-left rounded-xl border border-border p-4 hover:bg-muted transition-colors"
                  >
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="font-medium text-sm">{s.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.prompt}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((m, i) => (
                <div key={i} className="group flex gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    m.role === "user" ? "bg-muted" : "bg-gradient-primary text-primary-foreground"
                  }`}>
                    {m.role === "user" ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium mb-1 text-muted-foreground">
                      {m.role === "user" ? "You" : "Hormulse AI"}
                    </div>
                    {m.image_url && (
                      <img src={m.image_url} className="rounded-lg mb-2 max-h-60" alt="Photo uploaded for AI analysis" />
                    )}
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                        {m.content
                          ? <ReactMarkdown>{m.content}</ReactMarkdown>
                          : <div className="flex gap-1 py-2">
                              <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "120ms" }} />
                              <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "240ms" }} />
                            </div>}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words text-sm">{m.content}</div>
                    )}
                    {m.role === "assistant" && m.content && !loading && (
                      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                          onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Copied"); }}>
                          <Copy className="h-3 w-3 mr-1" /> Copy
                        </Button>
                        {i === messages.length - 1 && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={regenerate}>
                            <RefreshCw className="h-3 w-3 mr-1" /> Regenerate
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border p-3">
          <form onSubmit={(e) => { e.preventDefault(); send(); }}
            className="max-w-3xl mx-auto flex items-end gap-2 rounded-2xl border border-border bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
            <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
            <Button type="button" variant="ghost" size="icon" onClick={() => fileRef.current?.click()} disabled={loading} aria-label="Upload image" title="Upload image">
              <ImageIcon className="h-4 w-4" />
            </Button>
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder="Message Hormulse AI…"
              disabled={loading}
              className="flex-1 resize-none bg-transparent outline-none px-2 py-2 text-sm max-h-[200px]"
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()} className="rounded-xl" aria-label="Send message">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <div className="text-[10px] text-muted-foreground text-center mt-2">
            Hormulse AI can make mistakes. Not medical advice.
          </div>
        </div>
      </Card>
    </div>
  );
}
