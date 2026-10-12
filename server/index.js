import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'

const app = express()
app.use(express.json())

const cache = new Map()
const CACHE_MS = 5 * 60 * 1000
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const cacheDir = path.join(currentDir, '.cache')
const refreshing = new Map()

const NEWS_SOURCES = [
  { id: 'agencia-brasil', name: 'Agência Brasil', type: 'rss', url: 'https://agenciabrasil.ebc.com.br/rss/politica/feed.xml' },
  { id: 'agencia-camara', name: 'Agência Câmara', type: 'camara-html', url: 'https://www.camara.leg.br/noticias/ultimas' },
  { id: 'agencia-senado', name: 'Agência Senado', type: 'senado-html', url: 'https://www12.senado.leg.br/noticias/ultimas' },
]

function decode(value = '') {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()
}

function tag(xml, name) {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))
  return match ? decode(match[1]) : ''
}

function attr(xml, tagName, attrName) {
  const match = xml.match(new RegExp(`<${tagName}[^>]*${attrName}=["']([^"']+)["'][^>]*>`, 'i'))
  return match?.[1] || ''
}

function meta(html, property) {
  const escaped = property.replace(':', '\\:')
  const first = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i'))
  const reversed = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i'))
  return decode(first?.[1] || reversed?.[1] || '')
}

function parseRss(xml, source) {
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0, 20).map((match, index) => {
    const item = match[1]
    const description = tag(item, 'description')
    return {
      id: `${source.id}-${index}-${tag(item, 'guid') || tag(item, 'link')}`,
      title: tag(item, 'title'), description, url: tag(item, 'link'),
      image: attr(item, 'media:content', 'url') || attr(item, 'enclosure', 'url') || attr(item, 'media:thumbnail', 'url'),
      publishedAt: tag(item, 'pubDate') || tag(item, 'dc:date'), source: source.name, sourceId: source.id,
      category: tag(item, 'category') || 'Política',
    }
  }).filter(item => item.title && item.url)
}

function parseSenado(html, source) {
  const links = [...html.matchAll(/<a[^>]+href=["']([^"']*\/noticias\/materias\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
  const seen = new Set()
  return links.map((match, index) => {
    const title = decode(match[2])
    const url = new URL(match[1], source.url).href
    if (!title || seen.has(url)) return null
    seen.add(url)
    return { id: `${source.id}-${index}-${url}`, title, description: 'Leia a notícia completa na fonte oficial do Senado Federal.', url, image: attr(match[2], 'img', 'src'), publishedAt: '', source: source.name, sourceId: source.id, category: 'Senado' }
  }).filter(Boolean).slice(0, 20)
}

function parseCamara(html, source) {
  const links = [...html.matchAll(/<a[^>]+href=["']([^"']*\/noticias\/\d+-[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
  const seen = new Set()
  return links.map((match, index) => {
    const title = decode(match[2])
    const url = new URL(match[1], source.url).href
    if (!title || title.length < 20 || seen.has(url)) return null
    seen.add(url)
    return { id: `${source.id}-${index}-${url}`, title, description: 'Leia a notícia completa na fonte oficial da Câmara dos Deputados.', url, image: attr(match[2], 'img', 'src'), publishedAt: '', source: source.name, sourceId: source.id, category: 'Câmara' }
  }).filter(Boolean).slice(0, 20)
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'RadarPolitico/1.0 (+https://radarpolitico.com.br)', accept: 'application/rss+xml, application/xml, text/xml, text/html' }, signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error(`Fonte respondeu ${response.status}`)
  return response.text()
}

async function enrichArticle(item) {
  if (item.image && item.description && !item.description.startsWith('Leia a notícia')) return item
  try {
    const html = await fetchText(item.url)
    const structuredImage = html.match(/"image"\s*:\s*(?:"([^"]+)"|\[\s*"([^"]+)")/i)
    const candidates = [meta(html, 'twitter:image'), structuredImage?.[1] || structuredImage?.[2] || '', meta(html, 'og:image')]
    const image = candidates.find(candidate => candidate && !/imagem[-_]padrao|placeholder|logo-compartilhamento/i.test(candidate)) || ''
    const description = meta(html, 'description') || meta(html, 'og:description')
    return { ...item, image: image ? new URL(image, item.url).href : item.image, description: description || item.description }
  } catch { return item }
}

async function readDiskCache(key) {
  try { return JSON.parse(await fs.readFile(path.join(cacheDir, `${key}.json`), 'utf8')) } catch { return null }
}

async function writeDiskCache(key, entry) {
  await fs.mkdir(cacheDir, { recursive: true })
  await fs.writeFile(path.join(cacheDir, `${key}.json`), JSON.stringify(entry), 'utf8')
}

async function refreshCache(key, loader) {
  if (refreshing.has(key)) return refreshing.get(key)
  const task = (async () => {
    const value = await loader()
    const entry = { time: Date.now(), value }
    cache.set(key, entry)
    await writeDiskCache(key, entry)
    return entry
  })().finally(() => refreshing.delete(key))
  refreshing.set(key, task)
  return task
}

async function staleWhileRevalidate(key, loader) {
  let saved = cache.get(key)
  if (!saved) {
    saved = await readDiskCache(key)
    if (saved) cache.set(key, saved)
  }
  const stale = !saved || Date.now() - saved.time >= CACHE_MS
  if (saved) {
    if (stale) refreshCache(key, loader).catch(error => console.error(`Falha ao atualizar ${key}:`, error.message))
    return { ...saved.value, cache: { stale, savedAt: new Date(saved.time).toISOString() } }
  }
  const fresh = await refreshCache(key, loader)
  return { ...fresh.value, cache: { stale: false, savedAt: new Date(fresh.time).toISOString() } }
}

app.get('/api/news', async (req, res) => {
  try {
    const result = await staleWhileRevalidate('news-v2', async () => {
      const settled = await Promise.allSettled(NEWS_SOURCES.map(async source => {
        const body = await fetchText(source.url)
        return source.type === 'rss' ? parseRss(body, source) : source.type === 'camara-html' ? parseCamara(body, source) : parseSenado(body, source)
      }))
      const errors = settled.flatMap((entry, i) => entry.status === 'rejected' ? [{ source: NEWS_SOURCES[i].name, message: entry.reason.message }] : [])
      const groups = settled.map(entry => entry.status === 'fulfilled' ? entry.value : [])
      const interleaved = []
      const longest = Math.max(...groups.map(group => group.length), 0)
      for (let index = 0; index < longest; index += 1) for (const group of groups) if (group[index]) interleaved.push(group[index])
      const items = await Promise.all(interleaved.slice(0, 36).map(enrichArticle))
      if (!items.length) throw new Error('Todas as fontes jornalísticas falharam')
      return { items, errors, updatedAt: new Date().toISOString(), sources: NEWS_SOURCES.map(({ name, url }) => ({ name, url })) }
    })
    res.json(result)
  } catch (error) { res.status(502).json({ error: 'Não foi possível consultar as fontes.', detail: error.message }) }
})

app.get('/api/proposals', async (req, res) => {
  try {
    const result = await staleWhileRevalidate('proposals', async () => {
      const start = new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10)
      const response = await fetch(`https://dadosabertos.camara.leg.br/api/v2/proposicoes?dataInicio=${start}&ordem=DESC&ordenarPor=id&itens=30`, { signal: AbortSignal.timeout(25000), headers: { accept: 'application/json' } })
      if (!response.ok) throw new Error(`Câmara respondeu ${response.status}`)
      const data = await response.json()
      return { items: data.dados, updatedAt: new Date().toISOString(), source: 'Dados Abertos da Câmara dos Deputados' }
    })
    res.json(result)
  } catch (error) { res.status(502).json({ error: 'Não foi possível consultar as propostas.', detail: error.message }) }
})

app.get('/api/representatives', async (req, res) => {
  try {
    const result = await staleWhileRevalidate('representatives', async () => {
      const response = await fetch('https://dadosabertos.camara.leg.br/api/v2/deputados?ordem=ASC&ordenarPor=nome&itens=100', { signal: AbortSignal.timeout(25000), headers: { accept: 'application/json' } })
      if (!response.ok) throw new Error(`Câmara respondeu ${response.status}`)
      const data = await response.json()
      return { items: data.dados, updatedAt: new Date().toISOString(), source: 'Dados Abertos da Câmara dos Deputados' }
    })
    res.json(result)
  } catch (error) { res.status(502).json({ error: 'Não foi possível consultar os representantes.', detail: error.message }) }
})

app.get('/api/sources', (_req, res) => res.json({ news: NEWS_SOURCES, officialData: [{ name: 'Câmara dos Deputados', url: 'https://dadosabertos.camara.leg.br/' }, { name: 'Senado Federal', url: 'https://www12.senado.leg.br/dados-abertos' }, { name: 'TSE', url: 'https://dadosabertos.tse.jus.br/' }, { name: 'Portal da Transparência', url: 'https://portaldatransparencia.gov.br/' }] }))
app.get('/api/ping', (_req, res) => res.json({ message: 'pong', now: new Date().toISOString() }))

const IMAGE_HOSTS = new Set(['imagens.ebc.com.br', 'agenciabrasil.ebc.com.br', 'www.camara.leg.br', 'www12.senado.leg.br'])
app.get('/api/image', async (req, res) => {
  try {
    const url = new URL(String(req.query.url || ''))
    if (url.protocol !== 'https:' || !IMAGE_HOSTS.has(url.hostname)) return res.status(400).end()
    const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { 'user-agent': 'RadarPolitico/1.0', accept: 'image/avif,image/webp,image/jpeg,image/png,*/*' } })
    if (!response.ok) return res.status(response.status).end()
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) return res.status(415).end()
    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > 8 * 1024 * 1024) return res.status(413).end()
    const body = Buffer.from(await response.arrayBuffer())
    if (body.length > 8 * 1024 * 1024) return res.status(413).end()
    res.set('content-type', contentType)
    res.set('cache-control', 'public, max-age=86400, stale-while-revalidate=604800')
    res.send(body)
  } catch { res.status(502).end() }
})

const distDir = path.resolve(currentDir, '..', 'dist')
app.use(express.static(distDir))
app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')))

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`Radar Político em http://localhost:${port}`))
