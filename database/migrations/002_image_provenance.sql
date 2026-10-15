alter table articles add column if not exists cover_image_source text not null default 'original';
alter table articles add column if not exists cover_image_author text not null default '';
alter table articles add column if not exists cover_image_license text not null default '';
alter table articles add column if not exists cover_image_license_url text not null default '';
alter table articles add column if not exists cover_image_page_url text not null default '';
alter table articles add column if not exists cover_image_alt text not null default '';
alter table articles add column if not exists cover_image_illustrative boolean not null default false;
create index if not exists articles_cover_image_hash_idx on articles (cover_image_hash) where cover_image_hash is not null;

