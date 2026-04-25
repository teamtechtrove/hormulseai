
CREATE TABLE public.ai_rate_limits (
  user_id UUID NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, window_start)
);
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own rate limits" ON public.ai_rate_limits
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.ai_abuse_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT,
  reason TEXT NOT NULL,
  excerpt TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_abuse_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read abuse log" ON public.ai_abuse_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_abuse_log_created ON public.ai_abuse_log(created_at DESC);
CREATE INDEX idx_rate_limits_window ON public.ai_rate_limits(window_start);
