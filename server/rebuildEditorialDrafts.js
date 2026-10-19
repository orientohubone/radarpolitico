import 'dotenv/config'
import { pool, query, withTransaction } from './db.js'

if (!pool) throw new Error('Defina DATABASE_URL antes de recriar os rascunhos.')

const clean = (value = '') => value
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, ' ').trim()

function clip(value, limit) {
  const text = clean(value)
  if (text.length <= limit) return text
  const cut = text.slice(0, limit + 1)
  return `${cut.slice(0, cut.lastIndexOf(' ') > limit * .7 ? cut.lastIndexOf(' ') : limit).replace(/[,:;.!?\s]+$/, '')}…`
}

function extractBody(html) {
  const structured = html.match(/"articleBody"\s*:\s*"((?:\\.|[^"\\])*)"/i)
  if (structured) {
    try { return clean(JSON.parse(`"${structured[1]}"`)) } catch {}
  }
  const paragraphs = [...html.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)]
    .map(match => clean(match[1]))
    .filter(text => text.length >= 70 && !/cookies|privacidade|assine|newsletter|comentário|reprodução das notícias/i.test(text))
  return paragraphs.slice(0, 4).join(' ')
}

async function fetchSourceText(url) {
  try {
    const response = await fetch(url, { headers: { 'user-agent': 'RadarPolitico/1.0 (preparação editorial)' }, signal: AbortSignal.timeout(20_000) })
    if (!response.ok) return ''
    return extractBody(await response.text())
  } catch { return '' }
}

function contextFor(title) {
  if (/orçamento|crédito|recurso|milh|bilh|emenda/i.test(title)) return 'A decisão envolve prioridades do orçamento público e pode alterar a destinação de recursos entre órgãos, programas ou grupos atendidos.'
  if (/saúde|médic|sus|doença|medicamento/i.test(title)) return 'A medida pode afetar o acesso a serviços de saúde, a organização do atendimento e as responsabilidades do poder público.'
  if (/trabalho|jornada|aposent|salário|emprego|mei/i.test(title)) return 'A discussão pode mudar direitos, custos e rotinas de trabalhadores, empresas e órgãos responsáveis pela aplicação das regras.'
  if (/eleiç|candidato|partido|tse|voto/i.test(title)) return 'O tema interfere no ambiente eleitoral e exige atenção às regras, aos prazos e às informações confirmadas pelas instituições responsáveis.'
  if (/agricult|rural|alimento|feira/i.test(title)) return 'A proposta pode afetar produtores, canais de comercialização e políticas de abastecimento e desenvolvimento local.'
  return 'O tema pode produzir efeitos institucionais e sociais que dependem do texto final, da execução e das próximas decisões dos órgãos responsáveis.'
}

function affectedFor(title) {
  if (/agricult|rural|alimento|feira/i.test(title)) return 'Agricultores, produtores rurais, comerciantes, consumidores e governos responsáveis pelas políticas relacionadas ao tema.'
  if (/saúde|médic|sus|doença/i.test(title)) return 'Usuários dos serviços de saúde, profissionais do setor, gestores públicos e instituições responsáveis pelo atendimento.'
  if (/trabalho|jornada|aposent|salário|emprego|mei/i.test(title)) return 'Trabalhadores, empregadores, entidades representativas e órgãos encarregados de regulamentar ou fiscalizar a medida.'
  return 'Cidadãos e instituições diretamente alcançados pela decisão, além dos órgãos públicos responsáveis por regulamentação, execução e fiscalização.'
}

function nextFor(source, title) {
  if (/promulga|sanciona|entra em vigor/i.test(title)) return 'Acompanhar a publicação dos atos de regulamentação, os prazos de implementação e os efeitos concretos da nova regra.'
  if (/Câmara|Senado/i.test(source)) return 'Acompanhar a tramitação oficial, os pareceres, eventuais mudanças no texto e a próxima votação prevista. A revisão humana deve confirmar a etapa mais recente antes da publicação.'
  return 'Acompanhar novas informações da fonte principal, manifestações dos envolvidos e decisões posteriores que confirmem os efeitos anunciados.'
}

function buildDraft(item, sourceText) {
  const base = sourceText || item.source_description || item.summary || item.headline
  const summary = clip(item.source_description && item.source_description.length > 45 ? item.source_description : base, 360)
  const happened = clip(base.length > summary.length + 40 ? base : `${item.headline}. ${summary}`, 1800)
  const next = nextFor(item.source, item.headline)
  return {
    summary,
    whatHappened: happened,
    whyItMatters: contextFor(item.headline),
    whoIsAffected: affectedFor(item.headline),
    argumentsFor: `A fonte principal apresenta como fundamento ou consequência esperada: ${clip(summary, 420)} A equipe deve confirmar atribuições e dados antes de concluir a revisão.`,
    argumentsAgainst: 'A fonte coletada não reúne, por si só, todas as posições contrárias. A revisão deve buscar possíveis impactos adversos, custos, limites jurídicos e manifestações de grupos afetados.',
    openQuestions: 'Quais pontos ainda podem mudar? Há estimativa de custos, prazo de implementação e definição clara dos responsáveis? Existem posições divergentes que precisam ser incorporadas?',
    whatNext: next,
    radarView: `O ponto central para o leitor é entender como “${clip(item.headline, 150)}” pode sair do anúncio ou da proposta e produzir efeitos concretos. A cobertura deve acompanhar texto final, responsabilidades, prazos e resultados verificáveis, sem tratar expectativa como fato consumado.`,
    keyPoints: [clip(item.headline, 180), clip(summary, 220), clip(next, 220)],
  }
}

const articles = (await query(`select a.id, a.headline, a.summary, a.status, a.editorial_status,
  si.description as source_description, si.canonical_url as source_url, ns.name as source
  from articles a join source_items si on si.id=a.primary_source_item_id
  join news_sources ns on ns.id=si.source_id order by a.id`)).rows

const enriched = []
for (let index = 0; index < articles.length; index += 4) {
  const group = articles.slice(index, index + 4)
  const texts = await Promise.all(group.map(item => fetchSourceText(item.source_url)))
  enriched.push(...group.map((item, offset) => ({ item, draft: buildDraft(item, texts[offset]) })))
  console.log(`Fontes processadas: ${Math.min(index + group.length, articles.length)}/${articles.length}`)
}

const batchKey = `editorial-rebuild-${new Date().toISOString()}`
await withTransaction(async client => {
  await client.query(`insert into editorial_content_backups (batch_key, article_id, snapshot)
    select $1, id, to_jsonb(articles) from articles`, [batchKey])
  for (const { item, draft } of enriched) {
    await client.query(`update articles set summary=$2, what_happened=$3, why_it_matters=$4,
      who_is_affected=$5, arguments_for=$6, arguments_against=$7, open_questions=$8,
      what_next=$9, radar_view=$10, key_points=$11::jsonb, editorial_status='update',
      editorial_updated_at=now(), updated_at=now() where id=$1`, [item.id, draft.summary,
      draft.whatHappened, draft.whyItMatters, draft.whoIsAffected, draft.argumentsFor,
      draft.argumentsAgainst, draft.openQuestions, draft.whatNext, draft.radarView,
      JSON.stringify(draft.keyPoints)])
  }
})

console.log(JSON.stringify({ batchKey, backedUp: articles.length, rebuilt: enriched.length, publicationStatusesPreserved: true }, null, 2))
await pool.end()
