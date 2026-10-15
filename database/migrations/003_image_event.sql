alter table articles add column if not exists cover_image_event text not null default '';
create index if not exists articles_cover_image_event_idx on articles (cover_image_event) where cover_image_event <> '';

