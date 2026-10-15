create table if not exists media_pool (
  id bigserial primary key,
  image_url text not null unique,
  image_hash text not null,
  sphere text not null,
  theme text not null,
  credit text not null default '',
  license text not null default '',
  license_url text not null default '',
  source_page_url text not null default '',
  event_key text not null unique,
  event_title text not null,
  alt_text text not null default '',
  captured_at timestamptz,
  is_blocked boolean not null default false,
  last_used_at timestamptz,
  use_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists media_pool_lru_idx on media_pool (sphere, theme, is_blocked, last_used_at asc nulls first);
create index if not exists media_pool_hash_idx on media_pool (image_hash);

