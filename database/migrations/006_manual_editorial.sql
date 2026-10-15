alter table articles add column if not exists key_points jsonb not null default '[]'::jsonb;
alter table articles add column if not exists who_is_affected text not null default '';
alter table articles add column if not exists arguments_for text not null default '';
alter table articles add column if not exists arguments_against text not null default '';
alter table articles add column if not exists open_questions text not null default '';
alter table articles add column if not exists editorial_status text not null default 'raw'
  check (editorial_status in ('raw','draft','review','ready'));
alter table articles add column if not exists editorial_updated_at timestamptz;
create index if not exists articles_editorial_queue_idx on articles (editorial_status, published_at desc);

