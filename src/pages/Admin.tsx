import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Pin, Plus, ShieldCheck, Users, MessageSquare, BookOpen, Settings, Megaphone } from "lucide-react";

export default function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ users: 0, messages: 0, sessions: 0, logs: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [aiCfg, setAiCfg] = useState<any>({ default_provider: "lovable", default_model: "google/gemini-3-flash-preview", temperature: 0.7, max_tokens: 2048, system_prompt: "", welcome_message: "" });
  const [siteCfg, setSiteCfg] = useState<any>({ name: "", tagline: "", portfolio_url: "" });
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({ openai: "", anthropic: "", deepseek: "", groq: "" });
  const [maintenance, setMaintenance] = useState({ enabled: false, message: "" });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnn, setNewAnn] = useState("");
  const [articles, setArticles] = useState<any[]>([]);
  const [newArticle, setNewArticle] = useState({ title: "", slug: "", category: "", excerpt: "", content: "" });
  const [faq, setFaq] = useState<any[]>([]);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [{ count: m }, { count: s }, { count: l }, { data: prof }, { data: settings }, { data: ann }, { data: arts }, { data: f }] = await Promise.all([
      supabase.from("chat_messages").select("*", { count: "exact", head: true }),
      supabase.from("chat_sessions").select("*", { count: "exact", head: true }),
      supabase.from("tracking_logs").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("app_settings").select("*"),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
      supabase.from("education_articles").select("*").order("created_at", { ascending: false }),
      supabase.from("faq_items").select("*").order("sort_order"),
    ]);
    setStats({ users: prof?.length ?? 0, messages: m ?? 0, sessions: s ?? 0, logs: l ?? 0 });
    setUsers(prof ?? []);
    const ai = settings?.find((x) => x.key === "ai")?.value;
    if (ai) setAiCfg(ai);
    const site = settings?.find((x) => x.key === "site")?.value;
    if (site) setSiteCfg(site);
    const maint = settings?.find((x) => x.key === "maintenance")?.value;
    if (maint) setMaintenance(maint as any);
    setAnnouncements(ann ?? []);
    setArticles(arts ?? []);
    setFaq(f ?? []);

    // Fetch user roles to display
    const { data: roles } = await supabase.from("user_roles").select("user_id,role");
    setUsers((u) => u.map((x) => ({ ...x, roles: (roles ?? []).filter((r) => r.user_id === x.id).map((r) => r.role) })));
  };

  const saveSetting = async (key: string, value: any, isSecret = false) => {
    const { error } = await supabase.from("app_settings").upsert({ key, value, is_secret: isSecret });
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const toggleAdmin = async (userId: string, makeAdmin: boolean) => {
    if (makeAdmin) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) return toast.error(error.message);
    }
    toast.success("Updated"); loadAll();
  };

  const addAnn = async () => {
    if (!newAnn.trim()) return;
    await supabase.from("announcements").insert({ message: newAnn, active: true });
    setNewAnn(""); loadAll();
  };

  const toggleAnn = async (id: string, active: boolean) => {
    await supabase.from("announcements").update({ active }).eq("id", id); loadAll();
  };

  const deleteAnn = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id); loadAll();
  };

  const saveArticle = async () => {
    if (!newArticle.title || !newArticle.slug || !newArticle.content) return toast.error("Title, slug and content required");
    const { error } = await supabase.from("education_articles").insert({ ...newArticle, published: true });
    if (error) return toast.error(error.message);
    setNewArticle({ title: "", slug: "", category: "", excerpt: "", content: "" });
    loadAll(); toast.success("Article published");
  };

  const togglePublish = async (a: any) => {
    await supabase.from("education_articles").update({ published: !a.published }).eq("id", a.id); loadAll();
  };

  const deleteArticle = async (id: string) => {
    await supabase.from("education_articles").delete().eq("id", id); loadAll();
  };

  const addFaq = async () => {
    if (!newFaq.question || !newFaq.answer) return;
    await supabase.from("faq_items").insert({ ...newFaq, sort_order: faq.length });
    setNewFaq({ question: "", answer: "" }); loadAll();
  };

  const deleteFaq = async (id: string) => {
    await supabase.from("faq_items").delete().eq("id", id); loadAll();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground text-sm">Signed in as {user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Users} label="Users" value={stats.users} />
        <Stat icon={MessageSquare} label="Messages" value={stats.messages} />
        <Stat icon={Settings} label="Sessions" value={stats.sessions} />
        <Stat icon={BookOpen} label="Tracking logs" value={stats.logs} />
      </div>

      <Tabs defaultValue="ai">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="site">Site</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="ai">
          <Card><CardHeader><CardTitle>AI configuration</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Default provider</Label>
                <Select value={aiCfg.default_provider} onValueChange={(v) => setAiCfg({ ...aiCfg, default_provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lovable">Lovable AI Gateway (default)</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                    <SelectItem value="groq">Groq</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Model</Label>
                <Input value={aiCfg.default_model ?? ""} onChange={(e) => setAiCfg({ ...aiCfg, default_model: e.target.value })} />
              </div>
              <div>
                <Label>Temperature</Label>
                <Input type="number" step="0.1" min="0" max="2" value={aiCfg.temperature ?? 0.7} onChange={(e) => setAiCfg({ ...aiCfg, temperature: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Max tokens</Label>
                <Input type="number" value={aiCfg.max_tokens ?? 2048} onChange={(e) => setAiCfg({ ...aiCfg, max_tokens: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>System prompt</Label>
              <Textarea rows={4} value={aiCfg.system_prompt ?? ""} onChange={(e) => setAiCfg({ ...aiCfg, system_prompt: e.target.value })} />
            </div>
            <div>
              <Label>Welcome message</Label>
              <Input value={aiCfg.welcome_message ?? ""} onChange={(e) => setAiCfg({ ...aiCfg, welcome_message: e.target.value })} />
            </div>
            <Button onClick={() => saveSetting("ai", aiCfg)}>Save AI settings</Button>

            <div className="border-t border-border pt-4 mt-4">
              <h3 className="font-semibold mb-2">Provider API keys (optional)</h3>
              <p className="text-xs text-muted-foreground mb-3">Stored encrypted in DB and never returned to browsers. If empty, Lovable AI is used.</p>
              {(["openai","anthropic","deepseek","groq"] as const).map((p) => (
                <div key={p} className="grid grid-cols-[120px_1fr_auto] gap-2 mb-2 items-center">
                  <Label className="capitalize">{p}</Label>
                  <Input type="password" placeholder="(leave blank to keep current)" value={providerKeys[p]} onChange={(e) => setProviderKeys({ ...providerKeys, [p]: e.target.value })} />
                  <Button size="sm" variant="outline" onClick={async () => {
                    const { data } = await supabase.from("app_settings").select("value").eq("key", "provider_keys").maybeSingle();
                    const cur = (data?.value as any) ?? {};
                    if (providerKeys[p]) cur[p] = providerKeys[p];
                    await saveSetting("provider_keys", cur, true);
                    setProviderKeys({ ...providerKeys, [p]: "" });
                  }}>Save</Button>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="site">
          <Card><CardHeader><CardTitle>Site settings</CardTitle></CardHeader><CardContent className="space-y-3">
            <div><Label>App name</Label><Input value={siteCfg.name ?? ""} onChange={(e) => setSiteCfg({ ...siteCfg, name: e.target.value })} /></div>
            <div><Label>Tagline</Label><Input value={siteCfg.tagline ?? ""} onChange={(e) => setSiteCfg({ ...siteCfg, tagline: e.target.value })} /></div>
            <div><Label>Portfolio URL (About page)</Label><Input value={siteCfg.portfolio_url ?? ""} onChange={(e) => setSiteCfg({ ...siteCfg, portfolio_url: e.target.value })} /></div>
            <Button onClick={() => saveSetting("site", siteCfg)}>Save</Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="users">
          <Card><CardHeader><CardTitle>Users ({users.length})</CardTitle></CardHeader><CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="font-medium">{u.display_name || u.email}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                    <div className="flex gap-1 mt-1">{u.roles?.map((r: string) => <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>)}</div>
                  </div>
                  <Button size="sm" variant={u.roles?.includes("admin") ? "destructive" : "default"}
                    onClick={() => toggleAdmin(u.id, !u.roles?.includes("admin"))}>
                    {u.roles?.includes("admin") ? "Remove admin" : "Make admin"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="announcements">
          <Card><CardHeader><CardTitle>Announcements</CardTitle></CardHeader><CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="New announcement…" value={newAnn} onChange={(e) => setNewAnn(e.target.value)} />
              <Button onClick={addAnn}><Plus className="h-4 w-4 mr-1" />Add</Button>
            </div>
            {announcements.map((a) => (
              <div key={a.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-muted-foreground" />
                  <span className={a.active ? "" : "line-through text-muted-foreground"}>{a.message}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={a.active} onCheckedChange={(v) => toggleAnn(a.id, v)} />
                  <Button size="icon" variant="ghost" onClick={() => deleteAnn(a.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="education">
          <Card><CardHeader><CardTitle>Articles</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="space-y-2 border border-border rounded-lg p-4">
              <h3 className="font-semibold">New article</h3>
              <div className="grid md:grid-cols-2 gap-2">
                <Input placeholder="Title" value={newArticle.title} onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} />
                <Input placeholder="Slug" value={newArticle.slug} onChange={(e) => setNewArticle({ ...newArticle, slug: e.target.value })} />
                <Input placeholder="Category" value={newArticle.category} onChange={(e) => setNewArticle({ ...newArticle, category: e.target.value })} />
                <Input placeholder="Excerpt" value={newArticle.excerpt} onChange={(e) => setNewArticle({ ...newArticle, excerpt: e.target.value })} />
              </div>
              <Textarea rows={5} placeholder="Content (markdown supported)" value={newArticle.content} onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })} />
              <Button onClick={saveArticle}><Plus className="h-4 w-4 mr-1" />Publish</Button>
            </div>
            {articles.map((a) => (
              <div key={a.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                <div>
                  <div className="font-medium">{a.title} {a.published ? <Badge variant="secondary" className="ml-1">published</Badge> : <Badge variant="outline" className="ml-1">draft</Badge>}</div>
                  <div className="text-xs text-muted-foreground">{a.slug} • {a.category}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => togglePublish(a)}><Pin className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteArticle(a.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="faq">
          <Card><CardHeader><CardTitle>FAQ</CardTitle></CardHeader><CardContent className="space-y-3">
            <div className="space-y-2 border border-border rounded-lg p-4">
              <Input placeholder="Question" value={newFaq.question} onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })} />
              <Textarea rows={3} placeholder="Answer" value={newFaq.answer} onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })} />
              <Button onClick={addFaq}><Plus className="h-4 w-4 mr-1" />Add</Button>
            </div>
            {faq.map((f) => (
              <div key={f.id} className="flex items-start justify-between border border-border rounded-lg p-3">
                <div>
                  <div className="font-medium">{f.question}</div>
                  <div className="text-sm text-muted-foreground">{f.answer}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteFaq(f.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card><CardHeader><CardTitle>Maintenance mode</CardTitle></CardHeader><CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Enable maintenance page</Label>
              <Switch checked={maintenance.enabled} onCheckedChange={(v) => setMaintenance({ ...maintenance, enabled: v })} />
            </div>
            <Textarea rows={3} placeholder="Message" value={maintenance.message} onChange={(e) => setMaintenance({ ...maintenance, message: e.target.value })} />
            <Button onClick={() => saveSetting("maintenance", maintenance)}>Save</Button>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <Card className="shadow-soft"><CardContent className="p-5 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
      <div>
        <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
        <div className="text-xl font-semibold">{value}</div>
      </div>
    </CardContent></Card>
  );
}
