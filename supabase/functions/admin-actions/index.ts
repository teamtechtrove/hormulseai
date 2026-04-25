import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    const callerId = claims.claims.sub as string;

    // verify admin
    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    const { action, target_user_id, payload } = body ?? {};
    if (!action) return json({ error: "Missing action" }, 400);

    const log = (a: string, tType?: string, tId?: string, details: any = {}) =>
      admin.from("admin_audit_log").insert({
        actor_id: callerId,
        actor_email: claims.claims.email ?? null,
        action: a, target_type: tType, target_id: tId, details,
        ip_address: req.headers.get("x-forwarded-for") ?? null,
      });

    switch (action) {
      case "list_users": {
        const page = payload?.page ?? 1;
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
        if (error) throw error;
        return json({ users: data.users });
      }
      case "delete_user": {
        if (!target_user_id) return json({ error: "target_user_id required" }, 400);
        if (target_user_id === callerId) return json({ error: "Cannot delete yourself" }, 400);
        const { error } = await admin.auth.admin.deleteUser(target_user_id);
        if (error) throw error;
        await log("delete_user", "user", target_user_id);
        return json({ ok: true });
      }
      case "ban_user": {
        if (!target_user_id) return json({ error: "target_user_id required" }, 400);
        const reason = payload?.reason ?? null;
        await admin.from("user_status").upsert({
          user_id: target_user_id, banned: true, banned_reason: reason,
          banned_at: new Date().toISOString(), banned_by: callerId, updated_at: new Date().toISOString(),
        });
        await admin.auth.admin.updateUserById(target_user_id, { ban_duration: "876000h" });
        await log("ban_user", "user", target_user_id, { reason });
        return json({ ok: true });
      }
      case "unban_user": {
        if (!target_user_id) return json({ error: "target_user_id required" }, 400);
        await admin.from("user_status").upsert({
          user_id: target_user_id, banned: false, banned_reason: null,
          banned_at: null, banned_by: null, updated_at: new Date().toISOString(),
        });
        await admin.auth.admin.updateUserById(target_user_id, { ban_duration: "none" });
        await log("unban_user", "user", target_user_id);
        return json({ ok: true });
      }
      case "send_password_reset": {
        if (!payload?.email) return json({ error: "email required" }, 400);
        const { error } = await admin.auth.admin.generateLink({
          type: "recovery", email: payload.email,
        });
        if (error) throw error;
        await log("send_password_reset", "user", target_user_id, { email: payload.email });
        return json({ ok: true });
      }
      case "set_role": {
        if (!target_user_id || !payload?.role) return json({ error: "target_user_id, role required" }, 400);
        if (payload.add) {
          await admin.from("user_roles").insert({ user_id: target_user_id, role: payload.role }).select();
        } else {
          await admin.from("user_roles").delete().eq("user_id", target_user_id).eq("role", payload.role);
        }
        await log(payload.add ? "grant_role" : "revoke_role", "user", target_user_id, { role: payload.role });
        return json({ ok: true });
      }
      case "broadcast": {
        const { title, body: msg, level = "info", target = "all" } = payload ?? {};
        if (!title || !msg) return json({ error: "title, body required" }, 400);
        const { data: br, error: bErr } = await admin.from("broadcasts")
          .insert({ title, body: msg, level, created_by: callerId }).select().single();
        if (bErr) throw bErr;

        let recipients: string[] = [];
        if (target === "all") {
          const { data: profs } = await admin.from("profiles").select("id");
          recipients = (profs ?? []).map((p) => p.id);
        } else if (target === "admins") {
          const { data: ads } = await admin.from("user_roles").select("user_id").eq("role", "admin");
          recipients = (ads ?? []).map((r) => r.user_id);
        } else if (Array.isArray(target)) {
          recipients = target;
        }
        if (recipients.length) {
          await admin.from("user_notifications").insert(
            recipients.map((uid) => ({ user_id: uid, broadcast_id: br.id, title, body: msg, level }))
          );
        }
        await log("broadcast", "broadcast", br.id, { recipients: recipients.length, level });
        return json({ ok: true, recipients: recipients.length });
      }
      case "get_analytics": {
        const since = new Date(Date.now() - 30 * 86400_000).toISOString();
        const [{ count: totalUsers }, { count: totalMsgs }, { count: totalSessions }, { data: signups }, { data: msgsDaily }] = await Promise.all([
          admin.from("profiles").select("*", { count: "exact", head: true }),
          admin.from("chat_messages").select("*", { count: "exact", head: true }),
          admin.from("chat_sessions").select("*", { count: "exact", head: true }),
          admin.from("profiles").select("created_at").gte("created_at", since),
          admin.from("chat_messages").select("created_at,user_id").gte("created_at", since),
        ]);
        const dau = new Set((msgsDaily ?? []).filter(m => new Date(m.created_at) > new Date(Date.now()-86400_000)).map(m => m.user_id)).size;
        return json({ totalUsers, totalMsgs, totalSessions, dau, signups, msgsDaily });
      }
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e: any) {
    return json({ error: e?.message ?? String(e) }, 500);
  }
});

function json(b: any, status = 200) {
  return new Response(JSON.stringify(b), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
