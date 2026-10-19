import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import sharp from 'sharp'
import { databaseEnabled } from './db.js'
import { collectNews, NEWS_SOURCES } from './newsSources.js'
import { createEditorialArticle, getDatabaseHealth, getEditorialArticle, ingestNews, listEditorialArticles, listPublishedNews, updateEditorialArticle } from './newsRepository.js'
import { reconcileArticleImages, syncCamaraMediaPool } from './imageDedup.js'
import { listPublicFigures, syncPublicFigures } from './publicFigures.js'

const app = express()
app.use(express.json({ limit: '100kb' }))
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const cacheDir = path.join(currentDir, '.cache')
const cache = new Map()
const refreshing = new Map()
const CACHE_MS = 5 * 60 * 1000
const isAdmin = req => Boolean(process.env.INGEST_TOKEN) && req.get('authorization') === `Bearer ${process.env.INGEST_TOKEN}`

async function readDiskCache(key) {
  try { return JSON.parse(await fs.readFile(path.join(cacheDir, `${key}.json`), 'utf8')) } catch { return null }
}
async function writeDiskCache(key, entry) {
  await fs.mkdir(cacheDir, { recursive: true })
  await fs.writeFile(path.join(cacheDir, `${key}.json`), JSON.stringify(entry), 'utf8')
}
async function clearCache(key) {
  cache.delete(key)
  await fs.rm(path.join(cacheDir, `${key}.json`), { force: true }).catch(() => {})
}
async function refreshCache(key, loader) {
  if (refreshing.has(key)) return refreshing.get(key)
  const task = (async () => {
    const entry = { time: Date.now(), value: await loader() }
    cache.set(key, entry); await writeDiskCache(key, entry); return entry
  })().finally(() => refreshing.delete(key))
  refreshing.set(key, task); return task
}
async function staleWhileRevalidate(key, loader) {
  let saved = cache.get(key) || await readDiskCache(key)
  if (saved) cache.set(key, saved)
  const stale = !saved || Date.now() - saved.time >= CACHE_MS
  if (saved) {
    if (stale) refreshCache(key, loader).catch(error => console.error(`Falha ao atualizar ${key}:`, error.message))
    return { ...saved.value, cache: { stale, savedAt: new Date(saved.time).toISOString() } }
  }
  const fresh = await refreshCache(key, loader)
  return { ...fresh.value, cache: { stale: false, savedAt: new Date(fresh.time).toISOString() } }
}

app.get('/api/news', async (_req, res) => {
  try {
    const result = await staleWhileRevalidate('news-v8', async () => {
      if (databaseEnabled) {
        return { items: await listPublishedNews(36), errors: [], updatedAt: new Date().toISOString(), storage: 'neon', sources: NEWS_SOURCES.map(({ name, url }) => ({ name, url })) }
      }
      const collected = await collectNews()
      return { items: collected.items.slice(0, 36).map((item, index) => ({ ...item, id: `${item.sourceId}-${index}-${item.url}` })), errors: collected.errors, updatedAt: new Date().toISOString(), storage: 'fallback', sources: NEWS_SOURCES.map(({ name, url }) => ({ name, url })) }
    })
    res.json(result)
  } catch (error) { res.status(502).json({ error: 'Não foi possível consultar as notícias.', detail: error.message }) }
})

app.post('/api/admin/ingest', async (req, res) => {
  if (!databaseEnabled) return res.status(503).json({ error: 'DATABASE_URL não configurada.' })
  if (!process.env.INGEST_TOKEN || req.get('authorization') !== `Bearer ${process.env.INGEST_TOKEN}`) return res.status(401).json({ error: 'Não autorizado.' })
  try {
    const collected = await collectNews()
    const result = await ingestNews(collected.items)
    const images = await reconcileArticleImages()
    await clearCache('news-v8')
    res.json({ ...result, images, errors: collected.errors, completedAt: new Date().toISOString() })
  } catch (error) { res.status(502).json({ error: 'Falha na ingestão.', detail: error.message }) }
})

app.post('/api/admin/media-sync', async (req, res) => {
  if (!databaseEnabled) return res.status(503).json({ error: 'DATABASE_URL não configurada.' })
  if (!process.env.INGEST_TOKEN || req.get('authorization') !== `Bearer ${process.env.INGEST_TOKEN}`) return res.status(401).json({ error: 'Não autorizado.' })
  try { res.json({ ...(await syncCamaraMediaPool()), completedAt: new Date().toISOString() }) }
  catch (error) { res.status(502).json({ error: 'Falha ao sincronizar o banco de imagens.', detail: error.message }) }
})

app.get('/api/admin/articles', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Não autorizado.' })
  try { res.json({ items: await listEditorialArticles() }) }
  catch (error) { res.status(500).json({ error: 'Falha ao carregar a fila editorial.', detail: error.message }) }
})

app.post('/api/admin/articles', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Não autorizado.' })
  const text = value => String(value || '').trim().slice(0, 12_000)
  const sourceUrl = text(req.body.sourceUrl)
  try {
    const parsed = new URL(sourceUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocolo')
  } catch { return res.status(400).json({ error: 'Informe uma URL HTTP(S) válida para a fonte principal.' }) }
  const contentType = ['noticia','explicador','analise','opiniao'].includes(req.body.contentType) ? req.body.contentType : 'noticia'
  const keyPoints = Array.isArray(req.body.keyPoints) ? req.body.keyPoints.map(text).filter(Boolean).slice(0, 8) : []
  const input = {
    headline: text(req.body.headline), summary: text(req.body.summary), whatHappened: text(req.body.whatHappened),
    whyItMatters: text(req.body.whyItMatters), whoIsAffected: text(req.body.whoIsAffected),
    argumentsFor: text(req.body.argumentsFor), argumentsAgainst: text(req.body.argumentsAgainst),
    openQuestions: text(req.body.openQuestions), whatNext: text(req.body.whatNext), radarView: text(req.body.radarView),
    keyPoints, category: text(req.body.category) || 'Política', contentType,
    authorName: text(req.body.authorName) || 'Redação Radar Político', sourceTitle: text(req.body.sourceTitle),
    sourceDescription: text(req.body.sourceDescription), sourceUrl,
  }
  if (!input.headline || !input.summary || !input.whatHappened) return res.status(400).json({ error: 'Título, síntese e relato do acontecimento são obrigatórios.' })
  try {
    const created = await createEditorialArticle(input)
    res.status(created.existing ? 200 : 201).json({ ok: true, ...created, editorialStatus: 'review', status: 'draft' })
  } catch (error) { res.status(500).json({ error: 'Falha ao criar o rascunho editorial.', detail: error.message }) }
})

app.get('/api/admin/articles/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Não autorizado.' })
  try {
    const article = await getEditorialArticle(req.params.id)
    if (!article) return res.status(404).json({ error: 'Matéria não encontrada.' })
    res.json(article)
  } catch (error) { res.status(500).json({ error: 'Falha ao carregar a matéria.', detail: error.message }) }
})

app.put('/api/admin/articles/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Não autorizado.' })
  const text = value => String(value || '').trim().slice(0, 12_000)
  const editorialStatus = ['raw','draft','review','ready'].includes(req.body.editorialStatus) ? req.body.editorialStatus : 'draft'
  const keyPoints = Array.isArray(req.body.keyPoints) ? req.body.keyPoints.map(text).filter(Boolean).slice(0, 8) : []
  const input = { headline: text(req.body.headline), summary: text(req.body.summary), whatHappened: text(req.body.whatHappened), whyItMatters: text(req.body.whyItMatters), whoIsAffected: text(req.body.whoIsAffected), argumentsFor: text(req.body.argumentsFor), argumentsAgainst: text(req.body.argumentsAgainst), openQuestions: text(req.body.openQuestions), whatNext: text(req.body.whatNext), radarView: text(req.body.radarView), keyPoints, editorialStatus, authorName: text(req.body.authorName) || 'Redação Radar Político', reviewedBy: text(req.body.reviewedBy) }
  if (!input.headline || !input.summary) return res.status(400).json({ error: 'Título e síntese são obrigatórios.' })
  try {
    const saved = await updateEditorialArticle(req.params.id, input)
    if (!saved) return res.status(404).json({ error: 'Matéria não encontrada.' })
    await clearCache('news-v8'); res.json({ ok: true, id: saved.id })
  } catch (error) { res.status(500).json({ error: 'Falha ao salvar a matéria.', detail: error.message }) }
})

app.get('/api/proposals', async (_req, res) => {
  try {
    const result = await staleWhileRevalidate('proposals', async () => {
      const start = new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10)
      const response = await fetch(`https://dadosabertos.camara.leg.br/api/v2/proposicoes?dataInicio=${start}&ordem=DESC&ordenarPor=id&itens=30`, { signal: AbortSignal.timeout(25_000), headers: { accept: 'application/json' } })
      if (!response.ok) throw new Error(`Câmara respondeu ${response.status}`)
      return { items: (await response.json()).dados, updatedAt: new Date().toISOString(), source: 'Dados Abertos da Câmara dos Deputados' }
    })
    res.json(result)
  } catch (error) { res.status(502).json({ error: 'Não foi possível consultar as propostas.', detail: error.message }) }
})

app.get('/api/representatives', async (_req, res) => {
  try {
    if (!databaseEnabled) return res.status(503).json({ error: 'DATABASE_URL não configurada.' })
    const items = await listPublicFigures()
    res.set('cache-control', 'no-store').json({ items, updatedAt: items[0]?.syncedAt || new Date().toISOString(), sources: ['Planalto', 'Câmara dos Deputados', 'Senado Federal', 'Supremo Tribunal Federal'] })
  } catch (error) { res.status(502).json({ error: 'Não foi possível consultar os representantes.', detail: error.message }) }
})

app.post('/api/admin/figures-sync', async (req, res) => {
  if (!databaseEnabled) return res.status(503).json({ error: 'DATABASE_URL não configurada.' })
  if (!isAdmin(req)) return res.status(401).json({ error: 'Não autorizado.' })
  try { const result = await syncPublicFigures(); res.json({ ...result, completedAt: new Date().toISOString() }) }
  catch (error) { res.status(502).json({ error: 'Falha ao sincronizar autoridades.', detail: error.message }) }
})

app.get('/api/sources', (_req, res) => res.json({ news: NEWS_SOURCES, officialData: [{ name: 'Câmara dos Deputados', url: 'https://dadosabertos.camara.leg.br/' }, { name: 'Senado Federal', url: 'https://www12.senado.leg.br/dados-abertos' }, { name: 'TSE', url: 'https://dadosabertos.tse.jus.br/' }, { name: 'Portal da Transparência', url: 'https://portaldatransparencia.gov.br/' }] }))
app.get('/api/ping', async (_req, res) => {
  try { res.json({ message: 'pong', now: new Date().toISOString(), storage: databaseEnabled ? 'neon' : 'fallback', database: databaseEnabled ? await getDatabaseHealth() : null }) }
  catch (error) { res.status(503).json({ message: 'pong', database: { error: error.message } }) }
})

const IMAGE_HOSTS = new Set(['imagens.ebc.com.br', 'agenciabrasil.ebc.com.br', 'www.camara.leg.br', 'www12.senado.leg.br', 'www.senado.leg.br', 'legis.senado.leg.br', 'portal.stf.jus.br', 'www.stf.jus.br', 'noticias-stf-wp-prd.s3.sa-east-1.amazonaws.com', 'www.gov.br', 'upload.wikimedia.org'])
app.get('/api/image', async (req, res) => {
  try {
    const url = new URL(String(req.query.url || ''))
    if (url.protocol !== 'https:' || !IMAGE_HOSTS.has(url.hostname)) return res.status(400).end()
    const stfImage = url.hostname === 'portal.stf.jus.br' || url.hostname === 'www.stf.jus.br' || url.hostname === 'noticias-stf-wp-prd.s3.sa-east-1.amazonaws.com'
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000), headers: {
      'user-agent': stfImage ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129 Safari/537.36' : 'RadarPolitico/1.0',
      accept: 'image/avif,image/webp,image/jpeg,image/png,*/*',
      ...(stfImage ? { referer: 'https://portal.stf.jus.br/ostf', 'accept-language': 'pt-BR,pt;q=0.9' } : {}),
    } })
    if (!response.ok) return res.status(response.status).end()
    const contentType = response.headers.get('content-type') || ''
    const contentLength = Number(response.headers.get('content-length') || 0)
    if (!contentType.startsWith('image/')) return res.status(415).end()
    if (contentLength > 25 * 1024 * 1024) return res.status(413).end()
    const body = Buffer.from(await response.arrayBuffer())
    if (body.length > 25 * 1024 * 1024) return res.status(413).end()
    const output = stfImage ? await sharp(body).rotate().resize({ width: 900, height: 1100, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer() : body
    res.set('content-type', stfImage ? 'image/webp' : contentType); res.set('cache-control', 'public, max-age=86400, stale-while-revalidate=604800'); res.send(output)
  } catch { res.status(502).end() }
})

const distDir = path.resolve(currentDir, '..', 'dist')
app.use(express.static(distDir))
app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')))
const port = process.env.RADAR_PORT || process.env.PORT || 4000
app.listen(port, () => console.log(`Radar Político em http://localhost:${port} (${databaseEnabled ? 'Neon Postgres' : 'fallback sem banco'})`))
