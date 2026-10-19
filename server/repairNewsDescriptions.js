import 'dotenv/config'
import { pool, query } from './db.js'
import { enrichArticle } from './newsSources.js'

if (!pool) throw new Error('Defina DATABASE_URL antes de reparar as descrições.')

const result = await query(`select a.id, si.id as source_item_id, si.title, si.canonical_url as url, si.image_url as image
  from articles a
  join source_items si on si.id=a.primary_source_item_id
  where a.status='published' and a.summary like 'Leia a notícia completa%'
  order by a.published_at desc`)

let repaired = 0
let unresolved = 0
for (const item of result.rows) {
  const enriched = await enrichArticle({ title: item.title, description: '', url: item.url, image: item.image })
  if (!enriched.description || enriched.description.startsWith('Leia a notícia completa')) {
    unresolved += 1
    continue
  }
  await query(`update source_items set description=$2, updated_at=now() where id=$1`, [item.source_item_id, enriched.description])
  await query(`update articles set summary=$2,
    what_happened=case when what_happened like 'Leia a notícia completa%' or what_happened='' then $2 else what_happened end,
    updated_at=now() where id=$1 and summary like 'Leia a notícia completa%'`, [item.id, enriched.description])
  repaired += 1
}

console.log(JSON.stringify({ found: result.rowCount, repaired, unresolved }, null, 2))
await pool.end()
