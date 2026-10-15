create extension if not exists pg_trgm;

create table news_sources (
  id bigserial primary key, key text not null unique, name text not null, feed_url text not null,
  source_type text not null, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table source_items (
  id bigserial primary key, source_id bigint not null references news_sources(id), canonical_url text not null unique,
  title text not null, normalized_title text not null, description text not null default '', category text not null default 'Política',
  image_url text not null default '', image_hash text, published_at timestamptz, content_hash text not null,
  raw_payload jsonb not null default '{}'::jsonb, first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index source_items_title_trgm_idx on source_items using gin (normalized_title gin_trgm_ops);
create index source_items_published_idx on source_items (published_at desc);

create table articles (
  id bigserial primary key, primary_source_item_id bigint unique references source_items(id), slug text not null unique,
  headline text not null, summary text not null default '', what_happened text not null default '', why_it_matters text not null default '',
  what_next text not null default '', radar_view text not null default '', category text not null default 'Política',
  content_type text not null default 'noticia' check (content_type in ('noticia','explicador','analise','opiniao')),
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  cover_image_url text not null default '', cover_image_hash text, author_name text not null default 'Redação Radar Político',
  reviewed_by text, published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index articles_publication_idx on articles (status, published_at desc);

create table article_sources (
  article_id bigint not null references articles(id) on delete cascade, source_item_id bigint not null references source_items(id) on delete cascade,
  is_primary boolean not null default false, primary key (article_id, source_item_id)
);

create table article_opinions (
  id bigserial primary key, article_id bigint not null references articles(id) on delete cascade,
  author_name text not null, author_email text not null, body text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(), moderated_at timestamptz
);
create index article_opinions_moderation_idx on article_opinions (status, created_at);

