import crypto from 'node:crypto'
import sharp from 'sharp'
import { query } from './db.js'

const CAMARA_IMAGE_BANK = 'https://www.camara.leg.br/banco-imagens'
const POOL_SEARCHES = [
  ['plenário', 'plenario'], ['comissão', 'comissao'], ['audiência pública', 'audiencia'],
  ['economia', 'economia'], ['educação', 'educacao'], ['saúde', 'saude'],
  ['segurança pública', 'seguranca'], ['meio ambiente', 'meio_ambiente'],
  ['direitos humanos', 'direitos_humanos'], ['Congresso Nacional', 'institucional'],
]

function clean(value = '') {
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&ccedil;/g, 'ç').replace(/&atilde;/g, 'ã').replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/\s+/g, ' ').trim()
}

function attribute(tag, name) {
  return clean(tag.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'))?.[1] || '')
}

function formatDate(date) { return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) }
function stableHash(value) { return crypto.createHash('sha256').update(value).digest('hex') }

async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { 'user-agent': 'RadarPolitico/1.0 (filtro editorial de imagens)' } })
  if (!response.ok) throw new Error(`Imagem respondeu ${response.status}`)
  if (!(response.headers.get('content-type') || '').startsWith('image/')) throw new Error('Conteúdo não é uma imagem')
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length > 8 * 1024 * 1024) throw new Error('Imagem excede 8 MB')
  return buffer
}

async function perceptualHash(buffer) {
  const { data } = await sharp(buffer).resize(9, 8, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true })
  let bits = 0n
  for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) bits = (bits << 1n) | (data[y * 9 + x] > data[y * 9 + x + 1] ? 1n : 0n)
  return bits.toString(16).padStart(16, '0')
}

function distance(first, second) {
  let value = BigInt(`0x${first}`) ^ BigInt(`0x${second}`); let count = 0
  while (value) { count += Number(value & 1n); value >>= 1n }
  return count
}

function isDuplicate(hash, hashes) { return hashes.some(existing => distance(hash, existing) <= 9) }

async function camaraCandidates(term) {
  const end = new Date(); const start = new Date(end.getTime() - 120 * 86400000)
  const params = new URLSearchParams({ buscar: term, dataInicio: formatDate(start), dataFim: formatDate(end) })
  const pageUrl = `${CAMARA_IMAGE_BANK}/pesquisar?${params}`
  const response = await fetch(pageUrl, { signal: AbortSignal.timeout(20_000), headers: { 'user-agent': 'RadarPolitico/1.0 (acervo editorial)' } })
  if (!response.ok) throw new Error(`Banco de Imagens da Câmara respondeu ${response.status}`)
  const html = await response.text()
  const seenEvents = new Set()
  return [...html.matchAll(/<(?:div|img)[^>]+class=["'][^"']*caixa-destaque-texto[^"']*["'][^>]*>/gi)].flatMap(match => {
    const tag = match[0]; const smallUrl = attribute(tag, 'src'); const event = attribute(tag, 'data-evn')
    if (!smallUrl || !event || seenEvents.has(event)) return []
    seenEvents.add(event)
    return [{
      url: smallUrl.replace(/PEQ(?=\.[a-z]+$)/i, 'MED'), event, eventKey: stableHash(event),
      pageUrl, author: attribute(tag, 'data-autor') || 'Câmara dos Deputados',
      license: 'Creative Commons BY', licenseUrl: CAMARA_IMAGE_BANK,
      alt: attribute(tag, 'alt') || event,
    }]
  })
}

export async function syncCamaraMediaPool() {
  let discovered = 0; let inserted = 0; let updated = 0; let failed = 0
  for (const [term, theme] of POOL_SEARCHES) {
    const candidates = await camaraCandidates(term)
    for (const candidate of candidates) {
      discovered += 1
      try {
        const imageHash = await perceptualHash(await download(candidate.url))
        const dateMatch = candidate.event.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
        const capturedAt = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}T12:00:00-03:00` : null
        const existing = await query('select id from media_pool where image_url=$1 or event_key=$2 limit 1', [candidate.url, candidate.eventKey])
        await query(`insert into media_pool
          (image_url,image_hash,sphere,theme,credit,license,license_url,source_page_url,event_key,event_title,alt_text,captured_at)
          values ($1,$2,'camara',$3,$4,$5,$6,$7,$8,$9,$10,$11)
          on conflict (event_key) do update set image_url=excluded.image_url, image_hash=excluded.image_hash,
          theme=excluded.theme, credit=excluded.credit, alt_text=excluded.alt_text, captured_at=excluded.captured_at, updated_at=now()`,
          [candidate.url, imageHash, theme, candidate.author, candidate.license, candidate.licenseUrl, candidate.pageUrl, candidate.eventKey, candidate.event, candidate.alt, capturedAt])
        existing.rowCount ? updated += 1 : inserted += 1
      } catch { failed += 1 }
    }
  }
  return { discovered, inserted, updated, failed }
}

function themeFor(article) {
  const text = `${article.headline} ${article.category}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const rules = [[/saude|medic|hospital/,'saude'],[/educa|escola|cultura/,'educacao'],[/segur|violencia|policia/,'seguranca'],[/ambiente|clima|animal|agro/,'meio_ambiente'],[/econom|imposto|orcamento|empresa|trabalho/,'economia'],[/direito|mulher|crianca/,'direitos_humanos'],[/comiss/,'comissao'],[/audiencia/,'audiencia'],[/votacao|plenario|deputad|partido/,'plenario']]
  return rules.find(([pattern]) => pattern.test(text))?.[1] || 'institucional'
}

async function takePoolAsset(theme, recentHashes, recentEvents) {
  const result = await query(`with selected as (
      select id from media_pool where sphere='camara' and is_blocked=false
      and not (image_hash = any($2::text[])) and not (event_key = any($3::text[]))
      order by (theme=$1) desc, last_used_at asc nulls first, captured_at desc nulls last limit 1 for update skip locked
    ) update media_pool p set last_used_at=now(), use_count=use_count+1, updated_at=now()
    from selected where p.id=selected.id returning p.*`, [theme, recentHashes, recentEvents])
  return result.rows[0] || null
}

export async function reconcileArticleImages() {
  const result = await query(`select a.id, a.headline, a.category, a.cover_image_url, a.cover_image_source,
    a.cover_image_page_url, a.cover_image_event, ns.key as source_key
    from articles a join source_items si on si.id=a.primary_source_item_id join news_sources ns on ns.id=si.source_id
    where a.status='published' order by a.published_at desc, a.id desc`)
  const usedHashes = []; const usedUrls = new Set(); const usedEvents = new Set()
  let retained = 0; let replaced = 0; let unresolved = 0

  for (const article of result.rows) {
    let hash = null
    const fromPoolWithoutEvent = article.cover_image_source === 'camara_banco_imagens' && !article.cover_image_event
    const mustReplace = !article.cover_image_url || article.cover_image_source === 'wikimedia_commons' || fromPoolWithoutEvent
    if (!mustReplace && !usedUrls.has(article.cover_image_url)) {
      try { hash = await perceptualHash(await download(article.cover_image_url)) } catch { hash = null }
    }
    if (!mustReplace && hash && !isDuplicate(hash, usedHashes)) {
      usedHashes.push(hash); usedUrls.add(article.cover_image_url); retained += 1
      if (article.cover_image_event) usedEvents.add(article.cover_image_event)
      await query(`update articles set cover_image_hash=$2, updated_at=now() where id=$1`, [article.id, hash])
      continue
    }

    const replacement = await takePoolAsset(themeFor(article), usedHashes.slice(-15), [...usedEvents].slice(-15))
    if (!replacement) { unresolved += 1; await query(`update articles set cover_image_url='', cover_image_hash=null, updated_at=now() where id=$1`, [article.id]); continue }
    usedHashes.push(replacement.image_hash); usedUrls.add(replacement.image_url); usedEvents.add(replacement.event_key); replaced += 1
    await query(`update articles set cover_image_url=$2, cover_image_hash=$3, cover_image_source='camara_banco_imagens',
      cover_image_author=$4, cover_image_license=$5, cover_image_license_url=$6, cover_image_page_url=$7,
      cover_image_alt=$8, cover_image_event=$9, cover_image_illustrative=true, updated_at=now() where id=$1`,
      [article.id, replacement.image_url, replacement.image_hash, replacement.credit, replacement.license, replacement.license_url, replacement.source_page_url, replacement.alt_text, replacement.event_key])
  }
  return { total: result.rowCount, retained, replaced, unresolved, uniqueHashes: usedHashes.length, uniqueEvents: usedEvents.size }
}
