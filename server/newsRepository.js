import crypto from 'node:crypto'
import { query, withTransaction } from './db.js'

function canonicalUrl(rawUrl) {
  const url = new URL(rawUrl)
  url.hash = ''
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key)
  return url.href.replace(/\/$/, '')
}

function normalizeTitle(value = '') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function digest(value) { return crypto.createHash('sha256').update(value).digest('hex') }
function slug(value) { return `${normalizeTitle(value).replace(/\s+/g, '-').slice(0, 72)}-${digest(value).slice(0, 8)}` }

export async function ingestNews(items) {
  return withTransaction(async client => {
    let inserted = 0; let updated = 0; let grouped = 0
    for (const item of items) {
      const url = canonicalUrl(item.url)
      const normalized = normalizeTitle(item.title)
      const contentHash = digest(`${normalized}|${normalizeTitle(item.description)}`)
      const sourceResult = await client.query(`insert into news_sources (key, name, feed_url, source_type, active)
        values ($1,$2,$3,'feed',true) on conflict (key) do update set name=excluded.name, feed_url=excluded.feed_url, updated_at=now() returning id`, [item.sourceId, item.source, item.sourceUrl || url])
      const sourceId = sourceResult.rows[0].id
      const existing = await client.query('select id from source_items where canonical_url=$1 or (source_id=$2 and content_hash=$3) limit 1', [url, sourceId, contentHash])
      let sourceItemId
      if (existing.rowCount) {
        sourceItemId = existing.rows[0].id
        await client.query(`update source_items set title=$2, normalized_title=$3, description=$4, category=$5, image_url=$6,
          published_at=coalesce($7,published_at), content_hash=$8, raw_payload=$9, last_seen_at=now(), updated_at=now() where id=$1`,
          [sourceItemId, item.title, normalized, item.description || '', item.category || 'Política', item.image || '', item.publishedAt || null, contentHash, item])
        updated += 1
      } else {
        const created = await client.query(`insert into source_items
          (source_id, canonical_url, title, normalized_title, description, category, image_url, published_at, content_hash, raw_payload)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
          [sourceId, url, item.title, normalized, item.description || '', item.category || 'Política', item.image || '', item.publishedAt || null, contentHash, item])
        sourceItemId = created.rows[0].id
        inserted += 1
      }

      let article = await client.query('select article_id as id from article_sources where source_item_id=$1 limit 1', [sourceItemId])
      if (!article.rowCount) {
        article = await client.query(`select a.id from articles a join source_items primary_item on primary_item.id=a.primary_source_item_id
          where similarity(primary_item.normalized_title,$1) >= 0.72
          and coalesce(primary_item.published_at,primary_item.first_seen_at) >= coalesce($2::timestamptz,now()) - interval '72 hours'
          and coalesce(primary_item.published_at,primary_item.first_seen_at) <= coalesce($2::timestamptz,now()) + interval '72 hours'
          order by similarity(primary_item.normalized_title,$1) desc limit 1`, [normalized, item.publishedAt || null])
        if (article.rowCount) grouped += 1
      }
      let articleId = article.rows[0]?.id
      if (!articleId) {
        const createdArticle = await client.query(`insert into articles
          (primary_source_item_id, slug, headline, summary, what_happened, why_it_matters, what_next, category, content_type, status, cover_image_url, published_at)
          values ($1,$2,$3,$4,$5,$6,$7,$8,'noticia','published',$9,coalesce($10,now())) returning id`,
          [sourceItemId, slug(item.title), item.title, item.description || '', item.description || '',
            'Contextualização editorial pendente de revisão pela equipe do Radar Político.',
            'Novas informações serão incorporadas após verificação pela equipe editorial.', item.category || 'Política', item.image || '', item.publishedAt || null])
        articleId = createdArticle.rows[0].id
      }
      await client.query(`update articles set
        summary=case when summary like 'Leia a notícia completa%' or summary='' then $2 else summary end,
        what_happened=case when what_happened like 'Leia a notícia completa%' or what_happened='' then $2 else what_happened end,
        updated_at=now()
        where id=$1 and $2<>''`, [articleId, item.description || ''])
      await client.query(`insert into article_sources (article_id, source_item_id, is_primary) values ($1,$2,$3) on conflict do nothing`, [articleId, sourceItemId, !article.rowCount])
    }
    return { inserted, updated, grouped, total: items.length }
  })
}

export async function listPublishedNews(limit = 36) {
  const result = await query(`select a.id::text, a.slug, a.category, a.headline as title, a.summary as description,
    a.cover_image_url as image, si.canonical_url as url, a.published_at as "publishedAt", ns.name as source,
    a.content_type as "contentType", a.what_happened as "whatHappened", a.why_it_matters as "whyItMatters",
    a.what_next as "whatNext", a.radar_view as "radarView", a.cover_image_author as "imageAuthor",
    a.cover_image_license as "imageLicense", a.cover_image_license_url as "imageLicenseUrl",
    a.cover_image_page_url as "imagePageUrl", a.cover_image_alt as "imageAlt", a.cover_image_illustrative as "imageIllustrative",
    a.key_points as "keyPoints", a.who_is_affected as "whoIsAffected", a.arguments_for as "argumentsFor",
    a.arguments_against as "argumentsAgainst", a.open_questions as "openQuestions", a.editorial_status as "editorialStatus"
    from articles a join source_items si on si.id=a.primary_source_item_id join news_sources ns on ns.id=si.source_id
    where a.status='published' order by a.published_at desc nulls last, a.created_at desc limit $1`, [limit])
  return result.rows
}

export async function listEditorialArticles() {
  const result = await query(`select a.id::text, a.headline, a.category, a.editorial_status as "editorialStatus",
    a.status, a.published_at as "publishedAt", ns.name as source
    from articles a join source_items si on si.id=a.primary_source_item_id join news_sources ns on ns.id=si.source_id
    order by case a.editorial_status when 'raw' then 0 when 'draft' then 1 when 'review' then 2 else 3 end,
    a.published_at desc nulls last`)
  return result.rows
}

export async function createEditorialArticle(input) {
  return withTransaction(async client => {
    const source = await client.query(`insert into news_sources (key, name, feed_url, source_type, active)
      values ('radar-editorial','Radar Editorial',$1,'manual',true)
      on conflict (key) do update set updated_at=now() returning id`, [input.sourceUrl])
    const normalized = normalizeTitle(input.sourceTitle || input.headline)
    const contentHash = digest(`${normalized}|${normalizeTitle(input.sourceDescription || input.summary)}`)
    const sourceItem = await client.query(`insert into source_items
      (source_id, canonical_url, title, normalized_title, description, category, image_url, content_hash, raw_payload)
      values ($1,$2,$3,$4,$5,$6,'',$7,$8)
      on conflict (canonical_url) do update set title=excluded.title, description=excluded.description,
      raw_payload=excluded.raw_payload, updated_at=now() returning id`, [source.rows[0].id, input.sourceUrl,
      input.sourceTitle || input.headline, normalized, input.sourceDescription || input.summary,
      input.category, contentHash, input])
    const linked = await client.query('select article_id::text as id from article_sources where source_item_id=$1 limit 1', [sourceItem.rows[0].id])
    if (linked.rowCount) return { id: linked.rows[0].id, existing: true }
    const created = await client.query(`insert into articles
      (primary_source_item_id, slug, headline, summary, what_happened, why_it_matters, who_is_affected,
       arguments_for, arguments_against, open_questions, what_next, radar_view, key_points, category,
       content_type, status, editorial_status, author_name)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,'draft','review',$16)
      returning id::text`, [sourceItem.rows[0].id, slug(`${input.headline}-${Date.now()}`), input.headline,
      input.summary, input.whatHappened, input.whyItMatters, input.whoIsAffected, input.argumentsFor,
      input.argumentsAgainst, input.openQuestions, input.whatNext, input.radarView,
      JSON.stringify(input.keyPoints), input.category, input.contentType, input.authorName])
    await client.query('insert into article_sources (article_id, source_item_id, is_primary) values ($1,$2,true)', [created.rows[0].id, sourceItem.rows[0].id])
    return { id: created.rows[0].id, existing: false }
  })
}

export async function getEditorialArticle(id) {
  const result = await query(`select a.id::text, a.headline, a.summary, a.what_happened as "whatHappened",
    a.why_it_matters as "whyItMatters", a.what_next as "whatNext", a.radar_view as "radarView",
    a.key_points as "keyPoints", a.status, a.slug, a.published_at as "publishedAt",
    a.who_is_affected as "whoIsAffected", a.arguments_for as "argumentsFor",
    a.arguments_against as "argumentsAgainst", a.open_questions as "openQuestions",
    a.editorial_status as "editorialStatus", a.author_name as "authorName", a.reviewed_by as "reviewedBy",
    si.title as "sourceTitle", si.description as "sourceDescription", si.canonical_url as "sourceUrl", ns.name as source
    from articles a join source_items si on si.id=a.primary_source_item_id join news_sources ns on ns.id=si.source_id
    where a.id=$1 limit 1`, [id])
  return result.rows[0] || null
}

export async function updateEditorialArticle(id, input) {
  const values = [
    id, input.headline, input.summary, input.whatHappened, input.whyItMatters, input.whoIsAffected,
    input.argumentsFor, input.argumentsAgainst, input.openQuestions, input.whatNext, input.radarView,
    JSON.stringify(input.keyPoints), input.editorialStatus, input.authorName, input.reviewedBy,
  ]
  const result = await query(`update articles set headline=$2, summary=$3, what_happened=$4, why_it_matters=$5,
    who_is_affected=$6, arguments_for=$7, arguments_against=$8, open_questions=$9, what_next=$10,
    radar_view=$11, key_points=$12::jsonb, editorial_status=$13, author_name=$14, reviewed_by=nullif($15,''),
    editorial_updated_at=now(), updated_at=now() where id=$1 returning id::text`, values)
  return result.rows[0] || null
}

export async function setArticlePublication(id, publish) {
  const result = await query(`update articles set status=$2,
    published_at=case when $2='published' then coalesce(published_at,now()) else null end,
    updated_at=now()
    where id=$1 and ($2<>'published' or editorial_status='ready')
    returning id::text, status, published_at as "publishedAt"`, [id, publish ? 'published' : 'draft'])
  return result.rows[0] || null
}

export async function getDatabaseHealth() {
  const result = await query('select current_database() as database, now() as now')
  return result.rows[0]
}
