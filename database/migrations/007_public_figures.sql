create table if not exists public_figures (
  id bigserial primary key,
  external_key text not null unique,
  external_id text,
  name text not null,
  full_name text,
  role text not null,
  institution text not null check (institution in ('Presidência', 'Senado', 'Câmara dos Deputados', 'STF')),
  party text,
  state text,
  photo_url text,
  profile_url text,
  source_url text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  metadata jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz,
  synced_at timestamptz not null default now()
);

create index if not exists public_figures_institution_status_idx on public_figures (institution, status);
create index if not exists public_figures_name_idx on public_figures (name);
