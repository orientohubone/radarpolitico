import React, { useMemo, useState } from 'react'
import type { PageName } from '../App'
import { useQuery } from '@tanstack/react-query'
import { fetchWithLocalCache, loadLocalCache } from '../lib/apiCache'
import DossiersMenu from '../components/DossiersMenu'

type Proposal = {
  id: number
  theme: string
  title: string
  description: string
  status: string
  tone: string
  year: number
  author: string
  presentedAt: string
  lastMovementAt: string
  updatedAt: string
  lastMovement: string
  organ: string
  keywords: string[]
  officialUrl?: string
  fullTextUrl?: string
}
type OfficialProposal = { id: number; siglaTipo: string; numero: number; ano: number; ementa: string; descricaoTipo?: string; dataApresentacao?: string; authors?: string[]; keywords?: string; urlInteiroTeor?: string; statusProposicao?: { dataHora?: string; siglaOrgao?: string; descricaoTramitacao?: string; descricaoSituacao?: string } }
type CampaignCommitment = { id: string; candidate: string; party: string; number: number; theme: string; commitment: string; sourceUrl: string }
type GovernmentProgram = { candidate: string; party: string; number: number; coalition: string; pages: number | null; pdfUrl: string; topicsUrl: string }

const campaignSources = {
  lula: 'https://www.tse.jus.br/eleicoes/eleicoes-2026-content/propostas-de-governo-dos-candidatos-ao-cargo-de-presidente-da-republica-eleicoes-2026/lula-propostas-de-governo',
  flavio: 'https://www.tse.jus.br/eleicoes/eleicoes-2026-content/propostas-de-governo-dos-candidatos-ao-cargo-de-presidente-da-republica-eleicoes-2026/flavio-bolsonaro',
}
const partyLogos: Record<string, string> = {
  PT: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Logo_do_Partido_dos_Trabalhadores.svg',
  PL: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Partido_Liberal_%28Brazil%29_logo.svg',
}
const proxiedPartyLogo = (party: string) => `/api/image?url=${encodeURIComponent(partyLogos[party])}`
const campaignCommitments: CampaignCommitment[] = [
  { id: 'lula-economia', candidate: 'Lula', party: 'PT', number: 13, theme: 'Economia e trabalho', commitment: 'Fim da escala 6x1 e redução da jornada de trabalho para 40 horas.', sourceUrl: campaignSources.lula },
  { id: 'flavio-economia', candidate: 'Flávio Bolsonaro', party: 'PL', number: 22, theme: 'Economia e trabalho', commitment: 'Redução de impostos e reformulação das regras fiscais.', sourceUrl: campaignSources.flavio },
  { id: 'lula-saude', candidate: 'Lula', party: 'PT', number: 13, theme: 'Saúde e assistência', commitment: 'Ampliação da atenção especializada e redução das filas de atendimento.', sourceUrl: campaignSources.lula },
  { id: 'flavio-saude', candidate: 'Flávio Bolsonaro', party: 'PL', number: 22, theme: 'Saúde e assistência', commitment: 'Digitalização do SUS e criação de prontuário eletrônico único.', sourceUrl: campaignSources.flavio },
  { id: 'lula-seguranca', candidate: 'Lula', party: 'PT', number: 13, theme: 'Segurança e justiça', commitment: 'Asfixia financeira do crime organizado e integração do sistema de segurança pública.', sourceUrl: campaignSources.lula },
  { id: 'flavio-seguranca', candidate: 'Flávio Bolsonaro', party: 'PL', number: 22, theme: 'Segurança e justiça', commitment: 'Combate a facções e ao crime organizado, com reforço do controle de fronteiras.', sourceUrl: campaignSources.flavio },
  { id: 'lula-educacao', candidate: 'Lula', party: 'PT', number: 13, theme: 'Educação e ciência', commitment: 'Expansão do ensino técnico e dos Institutos Federais.', sourceUrl: campaignSources.lula },
  { id: 'flavio-educacao', candidate: 'Flávio Bolsonaro', party: 'PL', number: 22, theme: 'Educação e ciência', commitment: 'Ampliação da escola em tempo integral e gestão escolar por resultados.', sourceUrl: campaignSources.flavio },
  { id: 'lula-exterior', candidate: 'Lula', party: 'PT', number: 13, theme: 'Política externa', commitment: 'Fortalecimento da integração sul-americana e da atuação multilateral do Brasil.', sourceUrl: campaignSources.lula },
  { id: 'flavio-exterior', candidate: 'Flávio Bolsonaro', party: 'PL', number: 22, theme: 'Política externa', commitment: 'Abertura comercial, adesão à OCDE e fortalecimento de multinacionais brasileiras.', sourceUrl: campaignSources.flavio },
  { id: 'lula-direitos', candidate: 'Lula', party: 'PT', number: 13, theme: 'Direitos e inclusão', commitment: 'Políticas para autonomia das mulheres, igualdade salarial e enfrentamento da violência.', sourceUrl: campaignSources.lula },
  { id: 'flavio-direitos', candidate: 'Flávio Bolsonaro', party: 'PL', number: 22, theme: 'Direitos e inclusão', commitment: 'Criação de canais de denúncia e programas de capacitação e independência financeira feminina.', sourceUrl: campaignSources.flavio },
  { id: 'lula-ambiente', candidate: 'Lula', party: 'PT', number: 13, theme: 'Meio ambiente e campo', commitment: 'Desmatamento líquido zero, combate a incêndios e expansão das energias renováveis.', sourceUrl: campaignSources.lula },
  { id: 'flavio-ambiente', candidate: 'Flávio Bolsonaro', party: 'PL', number: 22, theme: 'Meio ambiente e campo', commitment: 'Redução de queimadas e desmatamento, bioeconomia e mercado de carbono.', sourceUrl: campaignSources.flavio },
  { id: 'lula-governanca', candidate: 'Lula', party: 'PT', number: 13, theme: 'Governança e Estado', commitment: 'Integração de serviços públicos digitais e fortalecimento dos mecanismos de transparência.', sourceUrl: campaignSources.lula },
  { id: 'flavio-governanca', candidate: 'Flávio Bolsonaro', party: 'PL', number: 22, theme: 'Governança e Estado', commitment: 'Digitalização integral dos serviços públicos e profissionalização da gestão.', sourceUrl: campaignSources.flavio },
]
const tseProgramsBase = 'https://www.tse.jus.br/eleicoes/eleicoes-2026-content/propostas-de-governo-dos-candidatos-ao-cargo-de-presidente-da-republica-eleicoes-2026'
const governmentPrograms: GovernmentProgram[] = [
  { candidate: 'Clariana Barão', party: 'DC', number: 27, coalition: 'Democracia Cristã', pages: 15, pdfUrl: `${tseProgramsBase}/../arquivos/plano-de-governo-1`, topicsUrl: `${tseProgramsBase}/clariana-barao-propostas-de-governo` },
  { candidate: 'Edmilson Costa', party: 'PCB', number: 21, coalition: 'Partido Comunista Brasileiro', pages: null, pdfUrl: `${tseProgramsBase}/../arquivos/proposta-pcb`, topicsUrl: `${tseProgramsBase}/edmilson-costa-propostas-de-governo` },
  { candidate: 'Escritor Augusto Cury', party: 'AVANTE', number: 70, coalition: 'Brasil dos Nossos Sonhos', pages: 200, pdfUrl: `${tseProgramsBase}/../arquivos/proposta-avante`, topicsUrl: `${tseProgramsBase}/escritor-augusto-cury-propostas-de-governo` },
  { candidate: 'Flávio Bolsonaro', party: 'PL', number: 22, coalition: 'Partido Liberal', pages: 76, pdfUrl: `${tseProgramsBase}/../arquivos/proposta-pl`, topicsUrl: campaignSources.flavio },
  { candidate: 'Hertz Dias', party: 'PSTU', number: 16, coalition: 'Partido Socialista dos Trabalhadores Unificado', pages: 33, pdfUrl: `${tseProgramsBase}/../arquivos/proposta-pstu`, topicsUrl: `${tseProgramsBase}/hertz-dias-propostas-de-governo` },
  { candidate: 'Leonardo Avalanche', party: 'PRTB', number: 28, coalition: 'Partido Renovador Trabalhista Brasileiro', pages: 48, pdfUrl: `${tseProgramsBase}/../arquivos/proposta-prtb`, topicsUrl: `${tseProgramsBase}/leonardo-avalanche` },
  { candidate: 'Lula', party: 'PT', number: 13, coalition: 'Brasil Pronto pra Mais', pages: 84, pdfUrl: `${tseProgramsBase}/../arquivos/proposta-pt`, topicsUrl: campaignSources.lula },
  { candidate: 'Renan Santos', party: 'MISSÃO', number: 14, coalition: 'Partido Missão', pages: 51, pdfUrl: `${tseProgramsBase}/../arquivos/proposta-missao`, topicsUrl: `${tseProgramsBase}/renan-santos-propostas-de-governo` },
  { candidate: 'Ronaldo Caiado', party: 'PSD', number: 55, coalition: 'Partido Social Democrático', pages: 100, pdfUrl: `${tseProgramsBase}/../arquivos/proposta-psd`, topicsUrl: `${tseProgramsBase}/ronaldo-caiado-propostas-de-governo` },
  { candidate: 'Rui Costa Pimenta', party: 'PCO', number: 29, coalition: 'Partido da Causa Operária', pages: 7, pdfUrl: `${tseProgramsBase}/../arquivos/pcoprogramadegoverno2026-1`, topicsUrl: `${tseProgramsBase}/rui-costa-pimenta-propostas-de-governo` },
  { candidate: 'Samara', party: 'UP', number: 80, coalition: 'Unidade Popular', pages: null, pdfUrl: `${tseProgramsBase}/../arquivos/proposta-up`, topicsUrl: `${tseProgramsBase}/samara-propostas-de-governo` },
  { candidate: 'Veterinário Wilson Grassi', party: 'DEMOCRATA', number: 35, coalition: 'Democrata', pages: 58, pdfUrl: `${tseProgramsBase}/../arquivos/proposta-democrata`, topicsUrl: `${tseProgramsBase}/veterinario-wilson-grassi` },
  { candidate: 'Zema', party: 'NOVO', number: 30, coalition: 'Partido Novo', pages: 81, pdfUrl: `${tseProgramsBase}/../arquivos/proposta-novo`, topicsUrl: `${tseProgramsBase}/zema` },
]

function clipDescription(value: string, limit = 330) {
  const text = value.replace(/\s+/g, ' ').trim()
  if (text.length <= limit) return text
  const preview = text.slice(0, limit + 1)
  const sentence = Math.max(preview.lastIndexOf('.'), preview.lastIndexOf(';'))
  const boundary = sentence >= limit * .65 ? sentence + 1 : preview.lastIndexOf(' ')
  return `${preview.slice(0, boundary > 0 ? boundary : limit).replace(/[,:;.!?\s]+$/, '')}…`
}

function formatDate(value?: string) {
  if (!value) return 'Não informada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Não informada' : date.toLocaleDateString('pt-BR')
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
}

function DocumentIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h8l4 4v16H6zM14 2v5h4M9 11h6M9 15h6M9 18h4" /></svg>
}

function Arrow({ left = false }: { left?: boolean }) { return <span aria-hidden="true">{left ? '←' : '→'}</span> }
function Logo() { return <img src="/logo-radar.png" alt="Radar Político" className="logo-img" /> }

export default function Proposals({ onNavigate }: { onNavigate: (page: PageName) => void }) {
  const [menu, setMenu] = useState(false)
  const [mode, setMode] = useState<'legislative' | 'campaign' | 'programs'>('legislative')
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [theme, setTheme] = useState('')
  const [house, setHouse] = useState('')
  const [status, setStatus] = useState('')
  const [year, setYear] = useState('')
  const [sort, setSort] = useState('updated')
  const { data: officialData, isLoading } = useQuery<{ items: OfficialProposal[]; updatedAt: string; source: string }>({ queryKey: ['official-proposals-v2'], queryFn: () => fetchWithLocalCache('/api/proposals', 'proposals-v2'), initialData: () => loadLocalCache('proposals-v2'), staleTime: 5 * 60 * 1000, refetchInterval: 5 * 60 * 1000, retry: 2 })
  const proposalItems: Proposal[] = officialData?.items?.map(item => {
    const movement = item.statusProposicao
    return { id: item.id, theme: item.descricaoTipo || item.siglaTipo, title: `${item.siglaTipo} ${item.numero}/${item.ano}`, description: clipDescription(item.ementa), status: movement?.descricaoSituacao || movement?.descricaoTramitacao || 'Acompanhe a tramitação', tone: 'blue', year: item.ano, author: item.authors?.join(', ') || 'Autoria não informada', presentedAt: formatDate(item.dataApresentacao), lastMovementAt: formatDate(movement?.dataHora), updatedAt: movement?.dataHora || item.dataApresentacao || '', lastMovement: movement?.descricaoTramitacao || 'Sem andamento detalhado', organ: movement?.siglaOrgao || 'Câmara', keywords: (item.keywords || '').split(';').map(word => word.trim()).filter(Boolean).slice(0, 3), officialUrl: `https://www.camara.leg.br/propostas-legislativas/${item.id}`, fullTextUrl: item.urlInteiroTeor }
  }) || []

  const filtered = useMemo(() => proposalItems
    .filter(item => !theme || item.theme === theme)
    .filter(item => !house || house === 'Câmara dos Deputados')
    .filter(item => !status || item.status === status)
    .filter(item => !year || item.year === Number(year))
    .filter(item => !submittedQuery || `${item.title} ${item.description} ${item.theme}`.toLocaleLowerCase('pt-BR').includes(submittedQuery.toLocaleLowerCase('pt-BR')))
    .sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'pt-BR') : (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0)), [proposalItems, submittedQuery, theme, house, status, year, sort])
  const campaignFiltered = useMemo(() => campaignCommitments
    .filter(item => !theme || item.theme === theme)
    .filter(item => !house || item.candidate === house)
    .filter(item => !submittedQuery || `${item.candidate} ${item.party} ${item.theme} ${item.commitment}`.toLocaleLowerCase('pt-BR').includes(submittedQuery.toLocaleLowerCase('pt-BR'))), [submittedQuery, theme, house])
  const programsFiltered = useMemo(() => governmentPrograms
    .filter(item => !house || item.candidate === house)
    .filter(item => !submittedQuery || `${item.candidate} ${item.party} ${item.number} ${item.coalition}`.toLocaleLowerCase('pt-BR').includes(submittedQuery.toLocaleLowerCase('pt-BR'))), [submittedQuery, house])
  const availableThemes = mode === 'campaign' ? [...new Set(campaignCommitments.map(item => item.theme))] : mode === 'legislative' ? [...new Set(proposalItems.map(item => item.theme))] : []

  function clearFilters() {
    setQuery(''); setSubmittedQuery(''); setTheme(''); setHouse(''); setStatus(''); setYear('')
  }

  return <div className="powers-page proposals-page">
    <header className="site-header">
      <div className="header-inner container">
        <a className="brand" href="/" onClick={e => { e.preventDefault(); onNavigate('home') }}><Logo /></a>
        <nav className={menu ? 'navigation open' : 'navigation'} aria-label="Navegação principal">
          <a href="/" onClick={e => { e.preventDefault(); onNavigate('home') }}>Notícias</a>
          <a href="/poderes" onClick={e => { e.preventDefault(); onNavigate('powers') }}>Poderes</a>
          <a className="active" href="/propostas">Propostas</a>
          <a href="/analises" onClick={e => { e.preventDefault(); onNavigate('analyses') }}>Análises</a>
          <DossiersMenu />
          <a href="/impostometro" onClick={e => { e.preventDefault(); onNavigate('taxMeter') }}>Impostômetro</a>
        </nav>
        <div className="header-actions">
          <button className="header-search" aria-label="Buscar"><SearchIcon /></button>
          <button className="mobile-menu" aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}><span aria-hidden="true">{menu ? '×' : '☰'}</span></button>
        </div>
      </div>
    </header>

    <main>
      <section className="powers-hero proposals-hero">
        <img className="powers-hero-art" src="/images/banner-propostas-editorial.png" alt="Ilustração editorial de propostas sendo analisadas no Congresso" />
        <div className="powers-shell powers-hero-inner">
          <div className="powers-intro">
            <p className="breadcrumb"><a href="/" onClick={e => { e.preventDefault(); onNavigate('home') }}>Início</a><span>/</span>Propostas</p>
            <h1>Propostas</h1>
            <p>Acompanhe o que é proposto e como cada iniciativa avança.</p>
          </div>
        </div>
      </section>

      <section className="powers-shell proposals-content">
        <div className="proposal-tabs" role="tablist">
          <button className={mode === 'legislative' ? 'active' : ''} onClick={() => { setMode('legislative'); clearFilters() }} role="tab" aria-selected={mode === 'legislative'}>Propostas legislativas</button>
          <button className={mode === 'campaign' ? 'active' : ''} onClick={() => { setMode('campaign'); clearFilters() }} role="tab" aria-selected={mode === 'campaign'}>Compromissos de campanha</button>
          <button className={mode === 'programs' ? 'active' : ''} onClick={() => { setMode('programs'); clearFilters() }} role="tab" aria-selected={mode === 'programs'}>Programas completos</button>
        </div>

        <form className="proposal-filters" onSubmit={e => { e.preventDefault(); setSubmittedQuery(query) }}>
          <label className="powers-search-field proposal-query"><SearchIcon /><input aria-label="Buscar proposta" placeholder={mode === 'programs' ? 'Buscar candidato, partido ou número' : 'Buscar por assunto, número ou autor'} value={query} onChange={e => setQuery(e.target.value)} /></label>
          {mode !== 'programs' && <select aria-label="Tema" value={theme} onChange={e => setTheme(e.target.value)}><option value="">Tema</option>{availableThemes.map(item => <option key={item}>{item}</option>)}</select>}
          {mode === 'campaign' ? <select aria-label="Candidatura" value={house} onChange={e => setHouse(e.target.value)}><option value="">Candidatura</option><option>Lula</option><option>Flávio Bolsonaro</option></select> : mode === 'programs' ? <select aria-label="Candidatura" value={house} onChange={e => setHouse(e.target.value)}><option value="">Todas as candidaturas</option>{governmentPrograms.map(item => <option key={item.number}>{item.candidate}</option>)}</select> : <select aria-label="Casa legislativa" value={house} onChange={e => setHouse(e.target.value)}><option value="">Casa legislativa</option><option>Câmara dos Deputados</option></select>}
          {mode !== 'legislative' ? <select aria-label="Eleição" value={year} onChange={e => setYear(e.target.value)}><option value="">Eleição</option><option value="2026">Presidencial 2026</option></select> : <><select aria-label="Situação" value={status} onChange={e => setStatus(e.target.value)}><option value="">Situação</option>{[...new Set(proposalItems.map(item => item.status))].map(item => <option key={item}>{item}</option>)}</select><select aria-label="Ano" value={year} onChange={e => setYear(e.target.value)}><option value="">Ano</option>{[...new Set(proposalItems.map(item => item.year))].filter(Boolean).sort((a, b) => b - a).map(item => <option key={item}>{item}</option>)}</select></>}
          <button className="button yellow" type="submit">Buscar</button>
          <button className="clear-filters" type="button" onClick={clearFilters}>Limpar filtros</button>
        </form>

        <p className="demo-notice"><span aria-hidden="true">ⓘ</span> {mode === 'campaign' ? 'Compromissos declarados nos planos de governo registrados no TSE. A presença nesta página não significa apoio, execução ou viabilidade confirmada.' : mode === 'programs' ? 'Documentos integrais protocolados pelas 13 candidaturas presidenciais no TSE para as Eleições 2026.' : isLoading ? 'Consultando a Câmara dos Deputados…' : officialData ? `Dados oficiais da Câmara dos Deputados. Atualizados em ${new Date(officialData.updatedAt).toLocaleString('pt-BR')}.` : 'Dados oficiais temporariamente indisponíveis.'}</p>

        <div className="profiles-heading proposals-heading">
          <h2>{mode === 'campaign' ? 'Compare os compromissos' : mode === 'programs' ? 'Cartilhas e programas de governo' : 'Explore as propostas'}</h2>
          {mode === 'legislative' && <label>Ordenar por:<select value={sort} onChange={e => setSort(e.target.value)}><option value="updated">Atualização</option><option value="title">Título</option></select></label>}
        </div>

        {mode === 'programs' ? programsFiltered.length ? <div className="program-grid">{programsFiltered.map(item => <article className="program-card" key={item.number}><div className="program-card-head"><span className="program-party">{item.party}</span><span className="campaign-number" aria-label={`Número ${item.number}`}>{item.number}</span><div><h3>{item.candidate}</h3><p>{item.coalition}</p></div></div><div className="program-document"><span className="proposal-icon"><DocumentIcon /></span><div><small>Documento oficial protocolado no TSE</small><strong>Programa de governo 2027–2030</strong><span>{item.pages ? `${item.pages} páginas` : 'PDF integral'} · Eleição presidencial de 2026</span></div></div><div className="program-baseline"><b>Linha de base editorial</b><p>Fonte original preservada para comparar compromissos, medidas adotadas e resultados verificáveis ao longo do mandato.</p></div><div className="program-links"><a className="profile-button" href={item.pdfUrl} target="_blank" rel="noreferrer">Ler proposta completa <Arrow /></a><a href={item.topicsUrl} target="_blank" rel="noreferrer">Consultar por assunto ↗</a></div></article>)}</div> : <p className="profiles-empty">Nenhum programa encontrado com os filtros selecionados.</p> : mode === 'campaign' ? campaignFiltered.length ? <div className="campaign-grid">{campaignFiltered.map(item => <article className={`campaign-card party-${item.party.toLocaleLowerCase('pt-BR')}`} key={item.id}><div className="campaign-candidate"><span className="campaign-party-mark"><img src={proxiedPartyLogo(item.party)} alt={`Logo ${item.party}`} onError={event => { event.currentTarget.hidden = true; event.currentTarget.nextElementSibling?.removeAttribute('hidden') }} /><b hidden>{item.party}</b></span><span className="campaign-number" aria-label={`Número ${item.number}`}>{item.number}</span><div><strong>{item.candidate}</strong><small>{item.party} · Presidência 2026</small></div></div><span className="campaign-theme">{item.theme}</span><h3>{item.commitment}</h3><p>Compromisso declarado no programa de governo apresentado à Justiça Eleitoral.</p><a href={item.sourceUrl} target="_blank" rel="noreferrer">Conferir no TSE <Arrow /></a></article>)}</div> : <p className="profiles-empty">Nenhum compromisso encontrado com os filtros selecionados.</p> : filtered.length ? <div className="proposal-grid">
          {filtered.map(item => <article className="proposal-card" key={item.id}>
            <div className="proposal-card-top"><span className={`proposal-theme theme-${item.tone}`}>{item.theme}</span><span className={`proposal-status status-${item.status === 'Em análise' ? 'analysis' : 'progress'}`}>{item.status}</span></div>
            <div className="proposal-main">
              <span className="proposal-icon"><DocumentIcon /></span>
              <div><small>O que a proposta pretende</small><h3>{item.title}</h3><p>{item.description}</p></div>
            </div>
            {item.keywords.length > 0 && <div className="proposal-keywords" aria-label="Assuntos relacionados">{item.keywords.map(keyword => <span key={keyword}>{keyword}</span>)}</div>}
            <dl className="proposal-details"><div><dt>Autoria</dt><dd>{item.author}</dd></div><div><dt>Apresentada</dt><dd>{item.presentedAt}</dd></div><div><dt>Último andamento</dt><dd>{item.lastMovement} · {item.lastMovementAt}</dd></div><div><dt>Órgão atual</dt><dd>{item.organ}</dd></div></dl>
            <div className="proposal-meta"><span>▤ &nbsp; Registro oficial: {item.id}</span><span>♜ &nbsp; Câmara dos Deputados</span></div>
            <div className="proposal-links"><button className="profile-button" onClick={() => item.officialUrl && window.open(item.officialUrl, '_blank', 'noopener,noreferrer')}>Acompanhar tramitação <Arrow /></button>{item.fullTextUrl && <button onClick={() => window.open(item.fullTextUrl, '_blank', 'noopener,noreferrer')}>Ler inteiro teor ↗</button>}</div>
          </article>)}
        </div> : <p className="profiles-empty">Nenhuma proposta encontrada com os filtros selecionados.</p>}

        {mode === 'legislative' && <nav className="pagination" aria-label="Paginação"><button disabled><Arrow left /> Anterior</button><button className="active">1</button><button>2</button><button>3</button><button>Próxima <Arrow /></button></nav>}

        {mode === 'legislative' ? <section className="progress-section"><h2>Entenda o andamento</h2><p>As etapas variam conforme o tipo de proposição.</p><div className="progress-grid">{[['Apresentação', 'A proposta é registrada na casa legislativa.'], ['Análise e votação', 'O texto passa pelas etapas previstas para seu tipo.'], ['Desfecho', 'Consulte a situação e os documentos oficiais.']].map(([title, text]) => <article key={title}><span className="proposal-icon"><DocumentIcon /></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section> : mode === 'programs' ? <section className="progress-section program-method"><h2>Base para expectativa × realidade</h2><p>O acompanhamento editorial deve partir do documento registrado, sem substituir promessa por interpretação de campanha.</p><div className="progress-grid">{[['1. Compromisso original', 'Registrar texto, página, tema e data do documento protocolado no TSE.'], ['2. Evidência de execução', 'Relacionar atos oficiais, orçamento, legislação e dados públicos às promessas correspondentes.'], ['3. Resultado verificável', 'Classificar o avanço com fonte, data e justificativa editorial sujeita a revisão.']].map(([title, text]) => <article key={title}><span className="proposal-icon"><DocumentIcon /></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div><div className="program-sources"><strong>Fontes de referência</strong><a href={tseProgramsBase} target="_blank" rel="noreferrer">Planos de governo no TSE ↗</a><a href="https://dadosabertos.tse.jus.br/dataset/candidatos-2026" target="_blank" rel="noreferrer">Dados Abertos do TSE ↗</a><a href="https://pt.org.br/conheca-as-propostas-e-os-compromissos-de-lula-com-o-brasil-e-os-brasileiros/" target="_blank" rel="noreferrer">Publicação partidária — PT ↗</a><a href="https://partidoliberal.org.br/" target="_blank" rel="noreferrer">Site partidário — PL ↗</a></div></section> : <section className="progress-section campaign-method"><h2>Como interpretar</h2><p>Os cards reproduzem compromissos registrados pelas campanhas no TSE e organizados por tema para facilitar a comparação.</p><div className="progress-grid">{[['Declaração de campanha', 'O compromisso expressa uma intenção apresentada durante a eleição.'], ['Não é medida em vigor', 'A inclusão no plano não significa que a proposta foi aprovada ou executada.'], ['Fonte verificável', 'Use o link de cada card para conferir o contexto e as páginas do documento oficial.']].map(([title, text]) => <article key={title}><span className="proposal-icon"><DocumentIcon /></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>}
      </section>

      <section className="powers-cta proposals-cta">
        <div className="powers-shell"><h2>Da proposta ao resultado</h2><p>Consulte o texto, o histórico e as fontes de cada iniciativa.</p><button className="button yellow">Conhecer a metodologia <Arrow /></button></div>
        <div className="powers-ribbon" aria-hidden="true"><i /><i /></div>
      </section>
    </main>

    <footer className="site-footer"><div className="footer-inner"><a className="brand" href="/" onClick={e => { e.preventDefault(); onNavigate('home') }}><Logo /></a><nav>{['Sobre o Radar', 'Critérios editoriais', 'Fontes e metodologia', 'Correções', 'Contato', 'Privacidade'].map(item => <button key={item}>{item}</button>)}</nav></div></footer>
  </div>
}
