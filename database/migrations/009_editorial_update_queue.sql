alter table articles drop constraint if exists articles_editorial_status_check;
alter table articles add constraint articles_editorial_status_check
  check (editorial_status in ('update','raw','draft','review','ready'));

create table if not exists editorial_content_backups (
  id bigserial primary key,
  batch_key text not null,
  article_id bigint not null references articles(id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (batch_key, article_id)
);

create index if not exists editorial_content_backups_article_idx
  on editorial_content_backups (article_id, created_at desc);
