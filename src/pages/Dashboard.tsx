import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, MessageSquare, CalendarCheck, BookOpen, ArrowRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { format, subDays } from "date-fns";
import Seo from "@/components/Seo";

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [chatCount, setChatCount] = useState(0);
  const [latestPlan, setLatestPlan] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
    supabase.from("tracking_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(14)
      .then(({ data }) => setLogs((data ?? []).reverse()));
    supabase.from("chat_messages").select("*", { count: "exact", head: true }).eq("user_id", user.id)
      .then(({ count }) => setChatCount(count ?? 0));
    supabase.from("daily_plans").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setLatestPlan(data));
  }, [user]);

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
    const l = logs.find((x) => x.date === d);
    return { day: format(new Date(d), "EEE"), mood: l?.mood ?? null, energy: l?.energy ?? null };
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Seo
        title="Dashboard — Hormulse AI"
        description="Your wellness snapshot: recent logs, mood and energy trends, and quick links to chat, tracking, and your daily plan."
        path="/dashboard"
      />
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {profile?.display_name || "friend"} 👋</h1>
        <p className="text-muted-foreground">Here's a snapshot of your wellness journey.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Logs" value={logs.length} link="/tracking" />
        <StatCard icon={MessageSquare} label="Chat messages" value={chatCount} link="/chat" />
        <StatCard icon={CalendarCheck} label="Latest plan" value={latestPlan?.date ?? "—"} link="/plan" />
        <StatCard icon={BookOpen} label="Articles" value="3+" link="/education" />
      </div>

      <Card className="shadow-soft">
        <CardHeader><CardTitle>Last 7 days — mood & energy</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Line type="monotone" dataKey="mood" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="energy" stroke="hsl(var(--secondary))" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-soft bg-gradient-card">
        <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild><Link to="/tracking">Log today <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
          <Button asChild variant="outline"><Link to="/plan">Generate today's plan</Link></Button>
          <Button asChild variant="outline"><Link to="/chat">Open AI chat</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, link }: any) {
  return (
    <Link to={link}>
      <Card className="shadow-soft hover:shadow-elevated transition-shadow">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="text-xl font-semibold">{value}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
