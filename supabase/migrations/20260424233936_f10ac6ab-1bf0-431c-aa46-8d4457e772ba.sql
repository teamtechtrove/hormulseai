
-- =========================
-- ROLES
-- =========================
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users can view their own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Admins manage roles"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- =========================
-- PROFILES
-- =========================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);

create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

-- Auto-create profile + default role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================
-- CHAT
-- =========================
create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.chat_sessions enable row level security;

create trigger trg_chat_sessions_touch before update on public.chat_sessions
for each row execute function public.touch_updated_at();

create policy "Own sessions read" on public.chat_sessions for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "Own sessions write" on public.chat_sessions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null default '',
  image_url text,
  provider text,
  model text,
  created_at timestamptz not null default now()
);
alter table public.chat_messages enable row level security;
create index on public.chat_messages (session_id, created_at);

create policy "Own messages read" on public.chat_messages for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "Own messages write" on public.chat_messages for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================
-- TRACKING
-- =========================
create table public.tracking_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  mood int check (mood between 1 and 10),
  energy int check (energy between 1 and 10),
  sleep_hours numeric(3,1),
  sleep_quality int check (sleep_quality between 1 and 10),
  weight numeric(5,2),
  symptoms jsonb default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.tracking_logs enable row level security;
create trigger trg_tracking_touch before update on public.tracking_logs
for each row execute function public.touch_updated_at();

create policy "Own tracking" on public.tracking_logs for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================
-- DAILY PLANS
-- =========================
create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  summary text,
  plan jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.daily_plans enable row level security;

create policy "Own plans" on public.daily_plans for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================
-- EDUCATION
-- =========================
create table public.education_articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text,
  excerpt text,
  content text not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.education_articles enable row level security;
create trigger trg_edu_touch before update on public.education_articles
for each row execute function public.touch_updated_at();

create policy "Public read published articles" on public.education_articles for select
  to anon, authenticated using (published or public.has_role(auth.uid(),'admin'));
create policy "Admins manage articles" on public.education_articles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- =========================
-- FAQ + ANNOUNCEMENTS + SETTINGS
-- =========================
create table public.faq_items (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.faq_items enable row level security;
create policy "FAQ public read" on public.faq_items for select to anon, authenticated using (true);
create policy "Admins manage FAQ" on public.faq_items for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
create policy "Announcements public read" on public.announcements for select to anon, authenticated using (true);
create policy "Admins manage announcements" on public.announcements for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  is_secret boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create trigger trg_settings_touch before update on public.app_settings
for each row execute function public.touch_updated_at();

-- public settings (non-secret) readable by all; secrets admin-only
create policy "Public settings readable" on public.app_settings for select
  to anon, authenticated using (is_secret = false or public.has_role(auth.uid(),'admin'));
create policy "Admins write settings" on public.app_settings for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- =========================
-- UPLOADS METADATA + STORAGE
-- =========================
create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_path text not null,
  mime text,
  size bigint,
  created_at timestamptz not null default now()
);
alter table public.uploads enable row level security;
create policy "Own uploads read" on public.uploads for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "Own uploads write" on public.uploads for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('uploads','uploads', true)
on conflict (id) do nothing;

create policy "Public read uploads" on storage.objects for select
  using (bucket_id = 'uploads');
create policy "Authenticated upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owner delete uploads" on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- =========================
-- SEED CONTENT
-- =========================
insert into public.app_settings (key, value, is_secret) values
  ('site', '{"name":"Hormulse AI","tagline":"AI-powered hormone wellness","portfolio_url":"https://portfolioofarman.netlify.app/"}'::jsonb, false),
  ('ai', '{"default_provider":"lovable","default_model":"google/gemini-3-flash-preview","temperature":0.7,"max_tokens":2048,"system_prompt":"You are Hormulse AI, a friendly assistant focused on hormone health, wellness, sleep, mood and lifestyle. Always recommend seeing a doctor for medical decisions.","welcome_message":"Hi! I''m Hormulse AI. Ask me anything about hormones, wellness or your daily plan."}'::jsonb, false),
  ('maintenance', '{"enabled":false,"message":"We''ll be back shortly."}'::jsonb, false),
  ('provider_keys', '{}'::jsonb, true)
on conflict (key) do nothing;

insert into public.faq_items (question, answer, sort_order) values
  ('What is Hormulse AI?', 'An AI assistant that helps you track wellness signals (mood, sleep, energy) and generates personalized daily plans.', 1),
  ('Is my data private?', 'Yes. Each user can only see their own logs and chats. Row-level security is enforced at the database.', 2),
  ('Does this replace a doctor?', 'No. Hormulse AI provides general guidance and lifestyle suggestions. Always consult a clinician for medical decisions.', 3)
on conflict do nothing;

insert into public.announcements (message, active) values
  ('Welcome to Hormulse AI — track, chat, and plan your day with AI.', true);

insert into public.education_articles (slug, title, category, excerpt, content, published) values
  ('cortisol-basics','Cortisol 101','Hormones','How the stress hormone shapes your day.','Cortisol follows a daily rhythm — peaking in the morning and declining at night. Chronic elevation can disrupt sleep, mood, and metabolism. Practical tips: morning sunlight, consistent sleep, strength training, and stress regulation.', true),
  ('sleep-and-hormones','Sleep & hormones','Sleep','Why 7–9 hours matters.','Deep sleep regulates growth hormone, leptin, ghrelin and cortisol. Aim for a consistent bedtime, cool dark room, and no screens 60 min before bed.', true),
  ('estrogen-cycle','Estrogen across the cycle','Cycle','Energy peaks and dips, explained.','Estrogen rises through the follicular phase, peaks around ovulation, then declines. Energy and mood often follow. Nutrition, training and sleep can be adjusted to phase.', true)
on conflict (slug) do nothing;
