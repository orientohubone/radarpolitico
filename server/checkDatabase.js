import 'dotenv/config'
import { pool, query } from './db.js'

if (!pool) throw new Error('Defina DATABASE_URL antes de verificar o banco.')
const result = await query(`select
  (select count(*)::int from news_sources) as sources,
  (select count(*)::int from source_items) as source_items,
  (select count(*)::int from articles) as articles,
  (select count(*)::int from article_sources) as article_sources,
  (select count(*)::int from articles where status='published') as published_articles,
  (select count(*)::int from articles where cover_image_url <> '') as articles_with_image,
  (select count(distinct cover_image_url)::int from articles where cover_image_url <> '') as distinct_image_urls,
  (select count(*)::int from articles where cover_image_hash is not null) as hashed_images,
  (select count(distinct cover_image_hash)::int from articles where cover_image_hash is not null) as distinct_image_hashes,
  (select count(*)::int from articles where cover_image_source='wikimedia_commons') as commons_images,
  (select count(*)::int from articles where cover_image_source='camara_banco_imagens') as camara_bank_images,
  (select count(*)::int from media_pool) as media_pool_assets,
  (select count(distinct event_key)::int from media_pool) as media_pool_events,
  (select count(*)::int from (select 1 from articles where status='published' order by published_at desc limit 15) recent) as recent_articles,
  (select count(distinct cover_image_hash)::int from (select cover_image_hash from articles where status='published' order by published_at desc limit 15) recent) as recent_distinct_hashes,
  (select count(distinct nullif(cover_image_event,''))::int from (select cover_image_event from articles where status='published' order by published_at desc limit 15) recent) as recent_pool_events`)
console.log(JSON.stringify(result.rows[0], null, 2))
await pool.end()
