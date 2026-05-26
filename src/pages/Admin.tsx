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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Trash2, Pin, Plus, ShieldCheck, Users, MessageSquare, BookOpen, Settings,
  Megaphone, Ban, KeyRound, ShieldAlert, Activity, Send, History, UserX, CreditCard, Check, X,
} from "lucide-react";

type AdminAction =
  | "list_users" | "delete_user" | "ban_user" | "unban_user"
  | "send_password_reset" | "set_role" | "broadcast" | "get_analytics";

export default function Admin() {
  const { user } = useAuth();

  // ============ STATE ============
  const [stats, setStats] = useState({ users: 0, messages: 0, sessions: 0, logs: 0, dau: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [authUsers, setAuthUsers] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<Record<string, any>>({});
  const [aiCfg, setAiCfg] = useState<any>({ default_provider: "lovable", default_model: "google/gemini-3-flash-preview", temperature: 0.7, max_tokens: 2048, system_prompt: "", welcome_message: "" });
  const [siteCfg, setSiteCfg] = useState<any>({ name: "", tagline: "", portfolio_url: "" });
  const [maintenance, setMaintenance] = useState({ enabled: false, message: "" });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnn, setNewAnn] = useState("");
  const [articles, setArticles] = useState<any[]>([]);
  const [newArticle, setNewArticle] = useState({ title: "", slug: "", category: "", excerpt: "", content: "" });
  const [faq, setFaq] = useState<any[]>([]);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });
  const [audit, setAudit] = useState<any[]>([]);
  const [abuse, setAbuse] = useState<any[]>([]);
  const [broadcast, setBroadcast] = useState({ title: "", body: "", level: "info", target: "all" });
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const callAdmin = async (action: AdminAction, body: any = {}) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        body: { action, ...body },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    } catch (e: any) {
      toast.error(e.message ?? "Action failed");
      throw e;
    } finally { setBusy(false); }
  };

  const loadAll = async () => {
    const [
      { data: prof }, { data: settings }, { data: ann }, { data: arts },
      { data: f }, { data: roles }, { data: status }, { data: au },
    ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("app_settings").select("*"),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
      supabase.from("education_articles").select("*").order("created_at", { ascending: false }),
      supabase.from("faq_items").select("*").order("sort_order"),
      supabase.from("user_roles").select("user_id,role"),
      supabase.from("user_status").select("*"),
      supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    supabase.from("ai_abuse_log").select("*").order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setAbuse(data ?? []));

    const sMap: Record<string, any> = {};
    (status ?? []).forEach((s: any) => { sMap[s.user_id] = s; });
    setStatuses(sMap);

    setUsers((prof ?? []).map((p) => ({
      ...p,
      roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
      status: sMap[p.id],
    })));

    if (settings) {
      const ai = settings.find((x) => x.key === "ai")?.value; if (ai) setAiCfg(ai);
      const site = settings.find((x) => x.key === "site")?.value; if (site) setSiteCfg(site);
      const maint = settings.find((x) => x.key === "maintenance")?.value; if (maint) setMaintenance(maint as any);
    }
    setAnnouncements(ann ?? []);
    setArticles(arts ?? []);
    setFaq(f ?? []);
    setAudit(au ?? []);

    // analytics
    callAdmin("get_analytics").then((d) => {
      setStats({
        users: d.totalUsers ?? 0, messages: d.totalMsgs ?? 0,
        sessions: d.totalSessions ?? 0, logs: 0, dau: d.dau ?? 0,
      });
    }).catch(() => {});
  };

  const saveSetting = async (key: string, value: any, isSecret = false) => {
    const { error } = await supabase.from("app_settings").upsert({ key, value, is_secret: isSecret });
    if (error) toast.error(error.message);
    else { toast.success("Saved"); }
  };

  // ============ USER ACTIONS ============
  const setRole = async (uid: string, role: string, add: boolean) => {
    await callAdmin("set_role", { target_user_id: uid, payload: { role, add } });
    toast.success(add ? "Role granted" : "Role removed");
    loadAll();
  };
  const banUser = async (uid: string, reason: string) => {
    await callAdmin("ban_user", { target_user_id: uid, payload: { reason } });
    toast.success("User banned"); loadAll();
  };
  const unbanUser = async (uid: string) => {
    await callAdmin("unban_user", { target_user_id: uid });
    toast.success("User unbanned"); loadAll();
  };
  const deleteUser = async (uid: string) => {
    await callAdmin("delete_user", { target_user_id: uid });
    toast.success("User deleted"); loadAll();
  };
  const resetPassword = async (email: string) => {
    await callAdmin("send_password_reset", { payload: { email } });
    toast.success("Reset email sent");
  };
  const sendBroadcast = async () => {
    if (!broadcast.title || !broadcast.body) return toast.error("Title and body required");
    const r = await callAdmin("broadcast", { payload: broadcast });
    toast.success(`Sent to ${r.recipients} users`);
    setBroadcast({ title: "", body: "", level: "info", target: "all" });
  };

  // ============ CONTENT ============
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

  const filteredUsers = users.filter((u) =>
    !filter || u.email?.toLowerCase().includes(filter.toLowerCase()) || u.display_name?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Control Center</h1>
          <p className="text-muted-foreground text-sm">Signed in as {user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Stat icon={Users} label="Users" value={stats.users} />
        <Stat icon={Activity} label="DAU (24h)" value={stats.dau} />
        <Stat icon={MessageSquare} label="Messages" value={stats.messages} />
        <Stat icon={Settings} label="Sessions" value={stats.sessions} />
        <Stat icon={Ban} label="Banned" value={Object.values(statuses).filter((s: any) => s.banned).length} />
      </div>

      <Tabs defaultValue="users">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" />Users</TabsTrigger>
          <TabsTrigger value="broadcast"><Send className="h-4 w-4 mr-1" />Broadcast</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="site">Site</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="audit"><History className="h-4 w-4 mr-1" />Audit</TabsTrigger>
          <TabsTrigger value="abuse"><ShieldAlert className="h-4 w-4 mr-1" />AI Abuse</TabsTrigger>
        </TabsList>

        {/* ============== USERS ============== */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Users ({filteredUsers.length})</span>
                <Input placeholder="Search email or name…" className="max-w-xs"
                  value={filter} onChange={(e) => setFilter(e.target.value)} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[640px] overflow-y-auto">
                {filteredUsers.map((u) => {
                  const isAdmin = u.roles?.includes("admin");
                  const isBanned = u.status?.banned;
                  return (
                    <div key={u.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border border-border p-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{u.display_name || u.email}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {u.roles?.map((r: string) => (
                            <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>{r}</Badge>
                          ))}
                          {isBanned && <Badge variant="destructive">banned</Badge>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" disabled={busy}
                          onClick={() => setRole(u.id, "admin", !isAdmin)}>
                          <ShieldAlert className="h-4 w-4 mr-1" />
                          {isAdmin ? "Demote" : "Make admin"}
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy}
                          onClick={() => resetPassword(u.email)}>
                          <KeyRound className="h-4 w-4 mr-1" />Reset pw
                        </Button>
                        {isBanned ? (
                          <Button size="sm" variant="outline" disabled={busy}
                            onClick={() => unbanUser(u.id)}>Unban</Button>
                        ) : (
                          <ConfirmButton
                            label={<><Ban className="h-4 w-4 mr-1" />Ban</>}
                            title="Ban this user?"
                            description={`${u.email} will be unable to sign in or send messages.`}
                            onConfirm={() => banUser(u.id, "Banned by admin")}
                          />
                        )}
                        <ConfirmButton
                          variant="destructive"
                          label={<><UserX className="h-4 w-4 mr-1" />Delete</>}
                          title="Delete this user permanently?"
                          description={`${u.email} and all linked data will be removed. This cannot be undone.`}
                          onConfirm={() => deleteUser(u.id)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============== BROADCAST ============== */}
        <TabsContent value="broadcast">
          <Card>
            <CardHeader><CardTitle>Send broadcast notification</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Title" value={broadcast.title}
                onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })} />
              <Textarea rows={4} placeholder="Message body" value={broadcast.body}
                onChange={(e) => setBroadcast({ ...broadcast, body: e.target.value })} />
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Level</Label>
                  <Select value={broadcast.level} onValueChange={(v) => setBroadcast({ ...broadcast, level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Audience</Label>
                  <Select value={broadcast.target} onValueChange={(v) => setBroadcast({ ...broadcast, target: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All users</SelectItem>
                      <SelectItem value="admins">Admins only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={sendBroadcast} disabled={busy}>
                <Send className="h-4 w-4 mr-1" />Send
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============== AI ============== */}
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
              <div><Label>Model</Label>
                <Input value={aiCfg.default_model ?? ""} onChange={(e) => setAiCfg({ ...aiCfg, default_model: e.target.value })} /></div>
              <div><Label>Temperature</Label>
                <Input type="number" step="0.1" min="0" max="2" value={aiCfg.temperature ?? 0.7} onChange={(e) => setAiCfg({ ...aiCfg, temperature: Number(e.target.value) })} /></div>
              <div><Label>Max tokens</Label>
                <Input type="number" value={aiCfg.max_tokens ?? 2048} onChange={(e) => setAiCfg({ ...aiCfg, max_tokens: Number(e.target.value) })} /></div>
            </div>
            <div><Label>System prompt</Label>
              <Textarea rows={4} value={aiCfg.system_prompt ?? ""} onChange={(e) => setAiCfg({ ...aiCfg, system_prompt: e.target.value })} /></div>
            <div><Label>Welcome message</Label>
              <Input value={aiCfg.welcome_message ?? ""} onChange={(e) => setAiCfg({ ...aiCfg, welcome_message: e.target.value })} /></div>
            <Button onClick={() => saveSetting("ai", aiCfg)}>Save AI settings</Button>
          </CardContent></Card>
        </TabsContent>

        {/* ============== SITE ============== */}
        <TabsContent value="site">
          <Card><CardHeader><CardTitle>Site settings</CardTitle></CardHeader><CardContent className="space-y-3">
            <div><Label>App name</Label><Input value={siteCfg.name ?? ""} onChange={(e) => setSiteCfg({ ...siteCfg, name: e.target.value })} /></div>
            <div><Label>Tagline</Label><Input value={siteCfg.tagline ?? ""} onChange={(e) => setSiteCfg({ ...siteCfg, tagline: e.target.value })} /></div>
            <div><Label>Portfolio URL (About page)</Label><Input value={siteCfg.portfolio_url ?? ""} onChange={(e) => setSiteCfg({ ...siteCfg, portfolio_url: e.target.value })} /></div>
            <Button onClick={() => saveSetting("site", siteCfg)}>Save</Button>
          </CardContent></Card>
        </TabsContent>

        {/* ============== ANNOUNCEMENTS ============== */}
        <TabsContent value="announcements">
          <Card><CardHeader><CardTitle>Top-bar announcements</CardTitle></CardHeader><CardContent className="space-y-3">
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

        {/* ============== EDUCATION ============== */}
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

        {/* ============== FAQ ============== */}
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

        {/* ============== MAINTENANCE ============== */}
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

        {/* ============== AUDIT LOG ============== */}
        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle>Admin audit log (last 100)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[640px] overflow-y-auto text-sm">
                {audit.length === 0 && <p className="text-muted-foreground">No actions logged yet.</p>}
                {audit.map((a) => (
                  <div key={a.id} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{a.action}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      by <span className="font-medium text-foreground">{a.actor_email ?? a.actor_id}</span>
                      {a.target_id && <> → {a.target_type}:{a.target_id}</>}
                    </div>
                    {a.details && Object.keys(a.details).length > 0 && (
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(a.details, null, 2)}</pre>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abuse">
          <Card>
            <CardHeader><CardTitle>AI abuse / jailbreak attempts (last 100)</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[640px] overflow-y-auto text-sm">
                {abuse.length === 0 && <p className="text-muted-foreground">No abuse attempts logged. 🎉</p>}
                {abuse.map((a) => (
                  <div key={a.id} className="border border-destructive/40 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="destructive">{a.reason}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      by <span className="font-medium text-foreground">{a.user_email ?? a.user_id}</span>
                    </div>
                    {a.excerpt && (
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">{a.excerpt}</pre>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </CardContent></Card>
  );
}

function ConfirmButton({ label, title, description, onConfirm, variant = "outline" as any }: any) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant={variant}>{label}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
