-- ============ AUDIT LOG ============
CREATE TABLE public.admin_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID NOT NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.admin_audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert audit log" ON public.admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND actor_id = auth.uid());
CREATE INDEX idx_audit_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_audit_actor ON public.admin_audit_log(actor_id);

-- ============ BROADCASTS ============
CREATE TABLE public.broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage broadcasts" ON public.broadcasts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated read broadcasts" ON public.broadcasts
  FOR SELECT TO authenticated USING (true);

-- ============ USER NOTIFICATIONS ============
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  broadcast_id UUID,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications read" ON public.user_notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Own notifications update" ON public.user_notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins insert notifications" ON public.user_notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX idx_notif_user ON public.user_notifications(user_id, read_at);

-- ============ USER STATUS (bans) ============
CREATE TABLE public.user_status (
  user_id UUID NOT NULL PRIMARY KEY,
  banned BOOLEAN NOT NULL DEFAULT false,
  banned_reason TEXT,
  banned_at TIMESTAMPTZ,
  banned_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own status" ON public.user_status
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage status" ON public.user_status
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.is_banned(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT banned FROM public.user_status WHERE user_id = _user_id), false)
$$;

CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action TEXT, _target_type TEXT DEFAULT NULL, _target_id TEXT DEFAULT NULL, _details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _id UUID; _email TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT email INTO _email FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.admin_audit_log(actor_id, actor_email, action, target_type, target_id, details)
  VALUES (auth.uid(), _email, _action, _target_type, _target_id, _details)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- Allow admins to delete profiles
CREATE POLICY "Admins delete profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Block banned users from sending chat messages
CREATE POLICY "Banned users cannot write messages" ON public.chat_messages
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT public.is_banned(auth.uid()));