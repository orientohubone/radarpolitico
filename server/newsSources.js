export const NEWS_SOURCES = [
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
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0, 20).map(match => {
    const item = match[1]
    return { title: tag(item, 'title'), description: tag(item, 'description'), url: tag(item, 'link'), image: attr(item, 'media:content', 'url') || attr(item, 'enclosure', 'url') || attr(item, 'media:thumbnail', 'url'), publishedAt: tag(item, 'pubDate') || tag(item, 'dc:date'), source: source.name, sourceId: source.id, category: tag(item, 'category') || 'Política' }
  }).filter(item => item.title && item.url)
}

function parseSenado(html, source) {
  const seen = new Set()
  return [...html.matchAll(/<a[^>]+href=["']([^"']*\/noticias\/materias\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(match => {
    const title = decode(match[2]); const url = new URL(match[1], source.url).href
    if (!title || seen.has(url)) return null
    seen.add(url)
    return { title, description: 'Leia a notícia completa na fonte oficial do Senado Federal.', url, image: attr(match[2], 'img', 'src'), publishedAt: '', source: source.name, sourceId: source.id, category: 'Senado' }
  }).filter(Boolean).slice(0, 20)
}

function parseCamara(html, source) {
  const seen = new Set()
  return [...html.matchAll(/<a[^>]+href=["']([^"']*\/noticias\/\d+-[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(match => {
    const title = decode(match[2]); const url = new URL(match[1], source.url).href
    if (!title || title.length < 20 || seen.has(url)) return null
    seen.add(url)
    return { title, description: 'Leia a notícia completa na fonte oficial da Câmara dos Deputados.', url, image: attr(match[2], 'img', 'src'), publishedAt: '', source: source.name, sourceId: source.id, category: 'Câmara' }
  }).filter(Boolean).slice(0, 20)
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'RadarPolitico/1.0 (+https://radarpolitico.com.br)', accept: 'application/rss+xml, application/xml, text/xml, text/html' }, signal: AbortSignal.timeout(12_000) })
  if (!response.ok) throw new Error(`Fonte respondeu ${response.status}`)
  return response.text()
}

async function enrichArticle(item) {
  if (item.image && item.description && !item.description.startsWith('Leia a notícia')) return item
  try {
    const html = await fetchText(item.url)
    const structuredImage = html.match(/"image"\s*:\s*(?:"([^"]+)"|\[\s*"([^"]+)")/i)
    const image = [meta(html, 'twitter:image'), structuredImage?.[1] || structuredImage?.[2] || '', meta(html, 'og:image')].find(candidate => candidate && !/imagem[-_]padrao|placeholder|logo-compartilhamento/i.test(candidate)) || ''
    const description = meta(html, 'description') || meta(html, 'og:description')
    return { ...item, image: image ? new URL(image, item.url).href : item.image, description: description || item.description }
  } catch { return item }
}

export async function collectNews() {
  const settled = await Promise.allSettled(NEWS_SOURCES.map(async source => {
    const body = await fetchText(source.url)
    const items = source.type === 'rss' ? parseRss(body, source) : source.type === 'camara-html' ? parseCamara(body, source) : parseSenado(body, source)
    return Promise.all(items.map(item => enrichArticle({ ...item, sourceUrl: source.url })))
  }))
  const errors = settled.flatMap((entry, index) => entry.status === 'rejected' ? [{ source: NEWS_SOURCES[index].name, message: entry.reason.message }] : [])
  const groups = settled.map(entry => entry.status === 'fulfilled' ? entry.value : [])
  const items = []
  for (let index = 0; index < Math.max(...groups.map(group => group.length), 0); index += 1) for (const group of groups) if (group[index]) items.push(group[index])
  if (!items.length) throw new Error('Todas as fontes jornalísticas falharam')
  return { items: items.slice(0, 60), errors }
}
