import { query, withTransaction } from './db.js'

const CAMARA_URL = 'https://dadosabertos.camara.leg.br/api/v2/deputados?ordem=ASC&ordenarPor=nome&itens=100&pagina=1'
const SENADO_URL = 'https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json'
const STF_URL = 'https://portal.stf.jus.br/ostf'
const STF_COLOR_FALLBACKS = {
  'Cristiano Zanin': 'https://noticias-stf-wp-prd.s3.sa-east-1.amazonaws.com/wp-content/uploads/wpallimport/uploads/2026/09/03161523/GUST8834-scaled-e1788463452392.jpg',
  'Edson Fachin': 'https://noticias-stf-wp-prd.s3.sa-east-1.amazonaws.com/wp-content/uploads/wpallimport/uploads/2025/08/13162042/B54A1158-scaled.jpg',
  'Dias Toffoli': 'https://noticias-stf-wp-prd.s3.sa-east-1.amazonaws.com/wp-content/uploads/wpallimport/uploads/2026/05/13183510/55268416634_b62093f573_c.jpg',
  'Flávio Dino': 'https://noticias-stf-wp-prd.s3.sa-east-1.amazonaws.com/wp-content/uploads/wpallimport/uploads/2026/02/19161123/55103970992_f8f80b7fb3_c.jpg',
}

async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000), headers: { accept: 'application/json', 'user-agent': 'RadarPolitico/1.0' } })
  if (!response.ok) throw new Error(`${new URL(url).hostname} respondeu ${response.status}`)
  return response.json()
}

function collectPartyAcronyms(value, output = []) {
  if (Array.isArray(value)) value.forEach(item => collectPartyAcronyms(item, output))
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => {
    if (/sigla.*partido|partido.*sigla/i.test(key) && typeof item === 'string' && /^[\p{L}\d.-]{1,20}$/u.test(item.trim())) output.push(item.trim().toLocaleUpperCase('pt-BR'))
    else collectPartyAcronyms(item, output)
  })
  return output
}

export async function getPartyAffiliations(entries) {
  const results = {}
  for (let offset = 0; offset < entries.length; offset += 6) {
    const chunk = entries.slice(offset, offset + 6)
    const loaded = await Promise.allSettled(chunk.map(async ({ institution, externalId, currentParty }) => {
      let url
      if (institution === 'Câmara dos Deputados') url = `https://dadosabertos.camara.leg.br/api/v2/deputados/${externalId}/historico`
      else if (institution === 'Senado') url = `https://legis.senado.leg.br/dadosabertos/senador/${externalId}/filiacoes.json`
      else return { key: `${institution}:${externalId}`, parties: currentParty ? [currentParty] : [] }
      const data = await getJson(url)
      const parties = [...new Set(collectPartyAcronyms(data))]
      if (currentParty && !parties.includes(currentParty)) parties.push(currentParty)
      return { key: `${institution}:${externalId}`, parties }
    }))
    loaded.forEach((result, index) => {
      const entry = chunk[index]
      const key = `${entry.institution}:${entry.externalId}`
      results[key] = result.status === 'fulfilled' ? result.value.parties : entry.currentParty ? [entry.currentParty] : []
    })
  }
  return results
}

async function collectDeputies() {
  const items = []
  let url = CAMARA_URL
  while (url) {
    const data = await getJson(url)
    items.push(...data.dados)
    url = data.links?.find(link => link.rel === 'next')?.href || ''
  }
  return items.map(item => ({
    externalKey: `camara:${item.id}`, externalId: String(item.id), name: item.nome, fullName: item.nome,
    role: 'Deputado(a) federal', institution: 'Câmara dos Deputados', party: item.siglaPartido, state: item.siglaUf,
    photoUrl: item.urlFoto, profileUrl: `https://www.camara.leg.br/deputados/${item.id}`,
    sourceUrl: 'https://dadosabertos.camara.leg.br/', metadata: item,
  }))
}

async function collectSenators() {
  const data = await getJson(SENADO_URL)
  const items = data.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar || []
  return items.map(item => {
    const info = item.IdentificacaoParlamentar
    return {
      externalKey: `senado:${info.CodigoParlamentar}`, externalId: String(info.CodigoParlamentar), name: info.NomeParlamentar,
      fullName: info.NomeCompletoParlamentar, role: 'Senador(a)', institution: 'Senado', party: info.SiglaPartidoParlamentar,
      state: info.UfParlamentar, photoUrl: String(info.UrlFotoParlamentar || '').replace(/^http:/, 'https:'),
      profileUrl: info.UrlPaginaParlamentar, sourceUrl: SENADO_URL, metadata: item,
    }
  })
}

function absoluteStfUrl(value) { return value ? new URL(value, STF_URL).href : '' }

async function getStfColorPhoto(name) {
  const bankUrl = `https://portal.stf.jus.br/cms/listarImagem.asp?palavraChave=${encodeURIComponent(name)}`
  const response = await fetch(bankUrl, { signal: AbortSignal.timeout(30_000), headers: {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129 Safari/537.36',
    accept: 'text/html,application/xhtml+xml', 'accept-language': 'pt-BR,pt;q=0.9', referer: STF_URL,
  } })
  if (!response.ok) return ''
  const html = await response.text()
  const photo = html.match(/<img[^>]+class="imagem-banco"[^>]+src="([^"]+)"/i)?.[1]
  return photo ? new URL(photo.startsWith('//') ? `https:${photo}` : photo, bankUrl).href : ''
}

async function collectStf() {
  const response = await fetch(STF_URL, { signal: AbortSignal.timeout(30_000), headers: {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129 Safari/537.36',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8', referer: 'https://portal.stf.jus.br/',
  } })
  if (!response.ok) throw new Error(`STF respondeu ${response.status}`)
  const html = await response.text()
  const cards = [...html.matchAll(/<div class="ministro-conteudo ministro-card[^"]*"[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<strong[^>]*>([^<]+)<\/strong>/gi)]
  const unique = new Map()
  for (const match of cards) {
    const name = match[2].trim()
    if (unique.has(name)) continue
    const leadership = /ministro-card presidente/i.test(match[0]) ? 'Presidente do STF' : 'Ministro(a) do STF'
    unique.set(name, { externalKey: `stf:${name.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`, name, fullName: name, role: leadership, institution: 'STF', photoUrl: absoluteStfUrl(match[1]), profileUrl: STF_URL, sourceUrl: STF_URL, metadata: {} })
  }
  if (unique.size < 8) throw new Error('Não foi possível interpretar a composição do STF')
  for (const figure of unique.values()) {
    figure.photoUrl = STF_COLOR_FALLBACKS[figure.name] || await getStfColorPhoto(figure.name) || figure.photoUrl
  }
  if (unique.size < 11) unique.set('Vaga no STF', {
    externalKey: 'stf:vaga', name: 'Vaga no STF', fullName: 'Cadeira aguardando preenchimento', role: 'Cadeira vaga', institution: 'STF',
    profileUrl: 'https://portal.stf.jus.br/ostf', sourceUrl: 'https://noticias.stf.jus.br/postsnoticias/nota-da-presidencia-do-supremo-tribunal-federal-3/',
    metadata: { vacant: true },
  })
  return [...unique.values()]
}

function collectPresidency() {
  return [
    { externalKey: 'presidencia:presidente', name: 'Luiz Inácio Lula da Silva', fullName: 'Luiz Inácio Lula da Silva', role: 'Presidente da República', institution: 'Presidência', party: 'PT', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Luiz_In%C3%A1cio_Lula_da_Silva_2023.jpg', profileUrl: 'https://www.gov.br/planalto/pt-br/conheca-a-presidencia/biografia-do-presidente', sourceUrl: 'https://www.gov.br/planalto/pt-br/conheca-a-presidencia/biografia-do-presidente', metadata: { mandate: '2023–2026', photoCredit: 'Ricardo Stuckert/PR' } },
    { externalKey: 'presidencia:vice-presidente', name: 'Geraldo Alckmin', fullName: 'Geraldo José Rodrigues Alckmin Filho', role: 'Vice-presidente da República', institution: 'Presidência', party: 'PSB', photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/04-06-2024_Reuni%C3%A3o_do_Vice_Presidente_do_Brasil_com_a_Presidente_do_Novo_Banco_de_Desenvolvimento_Dilma_Rousseff_%28cropped-2%29.jpg/960px-04-06-2024_Reuni%C3%A3o_do_Vice_Presidente_do_Brasil_com_a_Presidente_do_Novo_Banco_de_Desenvolvimento_Dilma_Rousseff_%28cropped-2%29.jpg', profileUrl: 'https://www.gov.br/planalto/pt-br/vice-presidencia', sourceUrl: 'https://www.gov.br/planalto/pt-br/vice-presidencia', metadata: { mandate: '2023–2026', photoCredit: 'Vice-Presidência da República' } },
  ]
}

export async function syncPublicFigures() {
  const groups = await Promise.all([collectDeputies(), collectSenators(), collectStf(), Promise.resolve(collectPresidency())])
  const figures = groups.flat()
  await withTransaction(async client => {
    await client.query("update public_figures set status='inactive' where status='active'")
    for (let offset = 0; offset < figures.length; offset += 100) {
      const chunk = figures.slice(offset, offset + 100)
      const values = chunk.flatMap(item => [item.externalKey, item.externalId || null, item.name, item.fullName || item.name, item.role, item.institution, item.party || null, item.state || null, item.photoUrl || null, item.profileUrl || null, item.sourceUrl, JSON.stringify(item.metadata || {})])
      const rows = chunk.map((_, row) => `(${Array.from({ length: 12 }, (__, col) => `$${row * 12 + col + 1}`).join(',')},'active',now(),now())`).join(',')
      await client.query(`
        insert into public_figures (external_key, external_id, name, full_name, role, institution, party, state, photo_url, profile_url, source_url, metadata, status, source_updated_at, synced_at)
        values ${rows}
        on conflict (external_key) do update set external_id=excluded.external_id, name=excluded.name, full_name=excluded.full_name,
          role=excluded.role, institution=excluded.institution, party=excluded.party, state=excluded.state, photo_url=excluded.photo_url,
          profile_url=excluded.profile_url, source_url=excluded.source_url, status='active', metadata=excluded.metadata,
          source_updated_at=excluded.source_updated_at, synced_at=excluded.synced_at
      `, values)
    }
  })
  return { total: figures.length, counts: Object.fromEntries(groups.map(group => [group[0]?.institution || 'desconhecido', group.length])) }
}

export async function listPublicFigures() {
  const result = await query(`select id, external_id as "externalId", name, full_name as "fullName", role, institution, party, state,
    photo_url as photo, profile_url as url, source_url as "sourceUrl", status, synced_at as "syncedAt"
    from public_figures where status='active' order by institution, name`)
  return result.rows
}
