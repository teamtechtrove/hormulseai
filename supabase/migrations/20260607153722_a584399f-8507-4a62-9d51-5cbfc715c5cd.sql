
-- Cycle logs
CREATE TABLE public.cycle_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Dhaka')::date,
  flow_level smallint CHECK (flow_level BETWEEN 0 AND 4),
  symptoms text[] DEFAULT '{}',
  mood text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cycle_logs TO authenticated;
GRANT ALL ON public.cycle_logs TO service_role;
ALTER TABLE public.cycle_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cycle logs" ON public.cycle_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cycle_logs_touch BEFORE UPDATE ON public.cycle_logs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Journal entries
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  language text NOT NULL DEFAULT 'bn',
  mood_score smallint CHECK (mood_score BETWEEN 1 AND 10),
  ai_summary text,
  ai_mood text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own journal" ON public.journal_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER journal_entries_touch BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Family shares (Pro+ feature)
CREATE TABLE public.family_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  invitee_email text NOT NULL,
  invitee_id uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
  share_cycle boolean NOT NULL DEFAULT false,
  share_plan boolean NOT NULL DEFAULT true,
  share_journal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, invitee_email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_shares TO authenticated;
GRANT ALL ON public.family_shares TO service_role;
ALTER TABLE public.family_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages shares" ON public.family_shares FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "invitee can read share" ON public.family_shares FOR SELECT TO authenticated
  USING (
    invitee_id = auth.uid()
    OR invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );
CREATE TRIGGER family_shares_touch BEFORE UPDATE ON public.family_shares
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Reminder + locale prefs on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reminder_morning boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_evening boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_cycle boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'bn';
