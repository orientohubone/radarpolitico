import React, { useMemo, useState } from 'react'
import type { PageName } from '../App'
import { useQuery } from '@tanstack/react-query'
import { fetchWithLocalCache, loadLocalCache } from '../lib/apiCache'

type Proposal = {
  id: number
  theme: string
  title: string
  description: string
  status: 'Em análise' | 'Em tramitação'
  tone: string
  officialUrl?: string
}
type OfficialProposal = { id: number; siglaTipo: string; numero: number; ano: number; ementa: string; descricaoTipo: string }

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
  const [mode, setMode] = useState<'legislative' | 'campaign'>('legislative')
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [theme, setTheme] = useState('')
  const [house, setHouse] = useState('')
  const [status, setStatus] = useState('')
  const [year, setYear] = useState('')
  const [sort, setSort] = useState('updated')
  const { data: officialData, isLoading } = useQuery<{ items: OfficialProposal[]; updatedAt: string; source: string }>({ queryKey: ['official-proposals'], queryFn: () => fetchWithLocalCache('/api/proposals', 'proposals'), initialData: () => loadLocalCache('proposals'), staleTime: 5 * 60 * 1000, refetchInterval: 5 * 60 * 1000, retry: 2 })
  const proposalItems: Proposal[] = officialData?.items?.map(item => ({ id: item.id, theme: item.descricaoTipo || item.siglaTipo, title: `${item.siglaTipo} ${item.numero}/${item.ano}`, description: item.ementa, status: 'Em análise', tone: 'blue', officialUrl: `https://www.camara.leg.br/propostas-legislativas/${item.id}` })) || []

  const filtered = useMemo(() => proposalItems
    .filter(item => !theme || item.theme === theme)
    .filter(item => !status || item.status === status)
    .filter(item => !submittedQuery || `${item.title} ${item.description} ${item.theme}`.toLocaleLowerCase('pt-BR').includes(submittedQuery.toLocaleLowerCase('pt-BR')))
    .sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'pt-BR') : b.id - a.id), [proposalItems, submittedQuery, theme, status, sort])

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
        <div className="powers-shell powers-hero-inner">
          <div className="powers-intro">
            <p className="breadcrumb"><a href="/" onClick={e => { e.preventDefault(); onNavigate('home') }}>Início</a><span>/</span>Propostas</p>
            <h1>Propostas</h1>
            <p>Acompanhe o que é proposto e como cada iniciativa avança.</p>
          </div>
          <div className="powers-ribbon hero-radar-element" aria-hidden="true"><img src="/elemento-radar.png" alt="" /></div>
        </div>
      </section>

      <section className="powers-shell proposals-content">
        <div className="proposal-tabs" role="tablist">
          <button className={mode === 'legislative' ? 'active' : ''} onClick={() => setMode('legislative')} role="tab" aria-selected={mode === 'legislative'}>Propostas legislativas</button>
          <button className={mode === 'campaign' ? 'active' : ''} onClick={() => setMode('campaign')} role="tab" aria-selected={mode === 'campaign'}>Compromissos de campanha</button>
        </div>

        <form className="proposal-filters" onSubmit={e => { e.preventDefault(); setSubmittedQuery(query) }}>
          <label className="powers-search-field proposal-query"><SearchIcon /><input aria-label="Buscar proposta" placeholder="Buscar por assunto, número ou autor" value={query} onChange={e => setQuery(e.target.value)} /></label>
          <select aria-label="Tema" value={theme} onChange={e => setTheme(e.target.value)}><option value="">Tema</option>{[...new Set(proposalItems.map(item => item.theme))].map(item => <option key={item}>{item}</option>)}</select>
          <select aria-label="Casa legislativa" value={house} onChange={e => setHouse(e.target.value)}><option value="">Casa legislativa</option><option>Câmara dos Deputados</option><option>Senado</option></select>
          <select aria-label="Situação" value={status} onChange={e => setStatus(e.target.value)}><option value="">Situação</option><option>Em análise</option><option>Em tramitação</option></select>
          <select aria-label="Ano" value={year} onChange={e => setYear(e.target.value)}><option value="">Ano</option><option>2026</option><option>2025</option></select>
          <button className="button yellow" type="submit">Buscar</button>
          <button className="clear-filters" type="button" onClick={clearFilters}>Limpar filtros</button>
        </form>

        <p className="demo-notice"><span aria-hidden="true">ⓘ</span> {isLoading ? 'Consultando a Câmara dos Deputados…' : officialData ? `Dados oficiais da Câmara dos Deputados. Atualizados em ${new Date(officialData.updatedAt).toLocaleString('pt-BR')}.` : 'Dados oficiais temporariamente indisponíveis.'}</p>

        <div className="profiles-heading proposals-heading">
          <h2>Explore as propostas</h2>
          <label>Ordenar por:<select value={sort} onChange={e => setSort(e.target.value)}><option value="updated">Atualização</option><option value="title">Título</option></select></label>
        </div>

        {mode === 'campaign' ? <p className="profiles-empty">Os compromissos de campanha serão disponibilizados após a integração com as fontes oficiais.</p> : filtered.length ? <div className="proposal-grid">
          {filtered.map(item => <article className="proposal-card" key={item.id}>
            <div className="proposal-card-top"><span className={`proposal-theme theme-${item.tone}`}>{item.theme}</span><span className={`proposal-status status-${item.status === 'Em análise' ? 'analysis' : 'progress'}`}>{item.status}</span></div>
            <div className="proposal-main">
              <span className="proposal-icon"><DocumentIcon /></span>
              <div><small>Proposição oficial</small><h3>{item.title}</h3><p>{item.description}</p></div>
            </div>
            <div className="proposal-meta"><span>▤ &nbsp; Registro oficial: {item.id}</span><span>♜ &nbsp; Câmara dos Deputados</span></div>
            <button className="profile-button" onClick={() => item.officialUrl && window.open(item.officialUrl, '_blank', 'noopener,noreferrer')}>Ver na fonte oficial <Arrow /></button>
          </article>)}
        </div> : <p className="profiles-empty">Nenhuma proposta encontrada com os filtros selecionados.</p>}

        <nav className="pagination" aria-label="Paginação"><button disabled><Arrow left /> Anterior</button><button className="active">1</button><button>2</button><button>3</button><button>Próxima <Arrow /></button></nav>

        <section className="progress-section">
          <h2>Entenda o andamento</h2><p>As etapas variam conforme o tipo de proposição.</p>
          <div className="progress-grid">
            {[['Apresentação', 'A proposta é registrada na casa legislativa.'], ['Análise e votação', 'O texto passa pelas etapas previstas para seu tipo.'], ['Desfecho', 'Consulte a situação e os documentos oficiais.']].map(([title, text]) => <article key={title}><span className="proposal-icon"><DocumentIcon /></span><div><h3>{title}</h3><p>{text}</p></div></article>)}
          </div>
        </section>
      </section>

      <section className="powers-cta proposals-cta">
        <div className="powers-shell"><h2>Da proposta ao resultado</h2><p>Consulte o texto, o histórico e as fontes de cada iniciativa.</p><button className="button yellow">Conhecer a metodologia <Arrow /></button></div>
        <div className="powers-ribbon" aria-hidden="true"><i /><i /></div>
      </section>
    </main>

    <footer className="site-footer"><div className="footer-inner"><a className="brand" href="/" onClick={e => { e.preventDefault(); onNavigate('home') }}><Logo /></a><nav>{['Sobre o Radar', 'Critérios editoriais', 'Fontes e metodologia', 'Correções', 'Contato', 'Privacidade'].map(item => <button key={item}>{item}</button>)}</nav></div></footer>
  </div>
}
