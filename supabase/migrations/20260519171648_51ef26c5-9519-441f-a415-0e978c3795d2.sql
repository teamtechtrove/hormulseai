
-- Plans enum
DO $$ BEGIN
  CREATE TYPE public.subscription_plan AS ENUM ('free','lite','pro','pro_plus');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('active','pending','expired','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_request_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_subscriptions
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  plan public.subscription_plan not null default 'free',
  status public.subscription_status not null default 'active',
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  payment_ref text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own subscription" ON public.user_subscriptions;
CREATE POLICY "Users read own subscription" ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins manage subscriptions" ON public.user_subscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- touch updated_at
DROP TRIGGER IF EXISTS user_subscriptions_touch ON public.user_subscriptions;
CREATE TRIGGER user_subscriptions_touch BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- usage_counters
CREATE TABLE IF NOT EXISTS public.usage_counters (
  user_id uuid not null,
  date date not null default current_date,
  message_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own usage" ON public.usage_counters;
CREATE POLICY "Users read own usage" ON public.usage_counters
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- payment_requests
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_email text,
  plan public.subscription_plan not null,
  amount_bdt integer not null,
  trx_id text not null,
  sender_msisdn text,
  screenshot_path text,
  status public.payment_request_status not null default 'pending',
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own payment requests" ON public.payment_requests;
CREATE POLICY "Users read own payment requests" ON public.payment_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Users create own payment requests" ON public.payment_requests;
CREATE POLICY "Users create own payment requests" ON public.payment_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage payment requests" ON public.payment_requests;
CREATE POLICY "Admins manage payment requests" ON public.payment_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Helper: get the user's current active plan (falls back to 'free')
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
RETURNS public.subscription_plan
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan FROM public.user_subscriptions
      WHERE user_id = _user_id
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1),
    'free'::public.subscription_plan
  );
$$;

CREATE OR REPLACE FUNCTION public.has_min_plan(_user_id uuid, _min public.subscription_plan)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (
    CASE public.get_user_plan(_user_id)
      WHEN 'pro_plus' THEN 3 WHEN 'pro' THEN 2 WHEN 'lite' THEN 1 ELSE 0
    END
  ) >= (
    CASE _min
      WHEN 'pro_plus' THEN 3 WHEN 'pro' THEN 2 WHEN 'lite' THEN 1 ELSE 0
    END
  );
$$;

-- Approve a pending payment request: activates the plan for 30 days.
CREATE OR REPLACE FUNCTION public.approve_payment_request(_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.payment_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT * INTO r FROM public.payment_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'request already %', r.status; END IF;

  INSERT INTO public.user_subscriptions (user_id, plan, status, started_at, expires_at, payment_ref)
  VALUES (r.user_id, r.plan, 'active', now(), now() + interval '30 days', r.trx_id)
  ON CONFLICT (user_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        status = 'active',
        started_at = now(),
        expires_at = now() + interval '30 days',
        payment_ref = EXCLUDED.payment_ref,
        updated_at = now();

  UPDATE public.payment_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _request_id;

  INSERT INTO public.user_notifications (user_id, title, body, level)
  VALUES (r.user_id,
          'Subscription activated',
          'Your ' || r.plan || ' plan is now active for 30 days. Thanks for supporting Hormulse AI!',
          'success');
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_payment_request(_request_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.payment_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT * INTO r FROM public.payment_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;

  UPDATE public.payment_requests
  SET status = 'rejected', notes = COALESCE(_reason, notes),
      reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = _request_id;

  INSERT INTO public.user_notifications (user_id, title, body, level)
  VALUES (r.user_id,
          'Payment could not be verified',
          COALESCE('We could not verify your payment: ' || _reason, 'We could not verify your bKash payment. Please try again or contact support.'),
          'warning');
END;
$$;
