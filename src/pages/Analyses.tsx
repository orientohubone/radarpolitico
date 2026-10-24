import React, { useMemo, useState } from 'react'
import type { PageName } from '../App'
import { useQuery } from '@tanstack/react-query'
import { fetchWithLocalCache, loadLocalCache } from '../lib/apiCache'

type ContentType = 'Análise' | 'Opinião' | 'Explicador'
type AnalysisItem = { id: number | string; type: ContentType; title: string; description: string; image: string; fallbackImage: string; theme: string; institution: string; url?: string; source?: string }
type LiveNews = { id: string; category: string; title: string; description: string; whyItMatters?: string; image: string; url: string; source: string; contentType?: string }
const analysisFallbackImages = ['/images/congress.jpg', '/images/chamber.jpg', '/images/committee.jpg', '/images/budget.jpg', '/images/congress-evening.jpg']
const genericImagePatterns = ['imagem-padrao', 'imagem_padrao', 'default', 'placeholder', 'logo-compartilhamento']
const proxiedImage = (url: string) => url.startsWith('http') ? `/api/image?url=${encodeURIComponent(url)}` : url

function clipAtSentence(value: string, limit: number) {
  const text = value.replace(/\s+/g, ' ').trim()
  if (text.length <= limit) return text
  const preview = text.slice(0, limit + 1)
  const sentence = Math.max(preview.lastIndexOf('.'), preview.lastIndexOf('!'), preview.lastIndexOf('?'))
  const boundary = sentence >= limit * .6 ? sentence + 1 : preview.lastIndexOf(' ')
  return `${preview.slice(0, boundary > 0 ? boundary : limit).replace(/[,:;.!?\s]+$/, '')}…`
}

function analysisDescription(item: LiveNews, limit: number) {
  const summary = item.description.replace(/\s+/g, ' ').trim()
  const context = (item.whyItMatters || '').replace(/\s+/g, ' ').trim()
  const usefulContext = /contextualização editorial pendente/i.test(context) ? '' : context
  const combined = summary.length < limit * .55 && usefulContext ? `${summary.replace(/[.!?]+$/, '')}. ${usefulContext}` : summary
  return clipAtSentence(combined || `${item.title}. Entenda o contexto e os próximos passos.`, limit)
}

function analysisType(contentType?: string): ContentType {
  if (contentType === 'opiniao') return 'Opinião'
  if (contentType === 'explicador') return 'Explicador'
  return 'Análise'
}

function SearchIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg> }
function Logo() { return <img src="/logo-radar.png" alt="Radar Político" className="logo-img" /> }
function Arrow({ left = false }: { left?: boolean }) { return <span aria-hidden="true">{left ? '←' : '→'}</span> }

export default function Analyses({ onNavigate }: { onNavigate: (page: PageName) => void }) {
  const [menu, setMenu] = useState(false)
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [theme, setTheme] = useState('')
  const [institution, setInstitution] = useState('')
  const [period, setPeriod] = useState('')
  const [type, setType] = useState<'Todos' | ContentType>('Todos')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const { data: newsData, isLoading, isError } = useQuery<{ items: LiveNews[]; updatedAt: string }>({ queryKey: ['live-news-v9'], queryFn: () => fetchWithLocalCache('/api/news', 'news-v9'), initialData: () => loadLocalCache('news-v9'), staleTime: 5 * 60 * 1000, refetchInterval: 5 * 60 * 1000, retry: 2 })
  const analysisItems: AnalysisItem[] = newsData?.items?.map((item, index) => {
    const fallbackImage = analysisFallbackImages[index % analysisFallbackImages.length]
    const remoteImage = item.image && !genericImagePatterns.some(pattern => item.image.toLocaleLowerCase('pt-BR').includes(pattern)) ? item.image : fallbackImage
    return { id: item.id, type: analysisType(item.contentType), title: item.title, description: analysisDescription(item, index === 0 ? 260 : 190), image: proxiedImage(remoteImage), fallbackImage, theme: item.category || 'Política', institution: item.source, url: item.url, source: item.source }
  }) || []
  const featured = analysisItems[0]

  const filtered = useMemo(() => analysisItems.slice(1)
    .filter(item => type === 'Todos' || item.type === type)
    .filter(item => !theme || item.theme === theme)
    .filter(item => !institution || item.institution === institution)
    .filter(item => !submittedQuery || `${item.title} ${item.description}`.toLocaleLowerCase('pt-BR').includes(submittedQuery.toLocaleLowerCase('pt-BR'))).slice(0, 12), [analysisItems, type, theme, institution, submittedQuery])

  function clearFilters() { setQuery(''); setSubmittedQuery(''); setTheme(''); setInstitution(''); setPeriod(''); setType('Todos') }

  return <div className="powers-page analyses-page">
    <header className="site-header"><div className="header-inner container">
      <a className="brand" href="/" onClick={e => { e.preventDefault(); onNavigate('home') }}><Logo /></a>
      <nav className={menu ? 'navigation open' : 'navigation'} aria-label="Navegação principal">
        <a href="/" onClick={e => { e.preventDefault(); onNavigate('home') }}>Notícias</a><a href="/poderes" onClick={e => { e.preventDefault(); onNavigate('powers') }}>Poderes</a><a href="/propostas" onClick={e => { e.preventDefault(); onNavigate('proposals') }}>Propostas</a><a className="active" href="/analises">Análises</a><a href="/impostometro" onClick={e => { e.preventDefault(); onNavigate('taxMeter') }}>Impostômetro</a>
      </nav>
      <div className="header-actions"><button className="header-search" aria-label="Buscar"><SearchIcon /></button><button className="mobile-menu" aria-label={menu ? 'Fechar menu' : 'Abrir menu'} onClick={() => setMenu(!menu)}><span aria-hidden="true">{menu ? '×' : '☰'}</span></button></div>
    </div></header>

    <main>
      <section className="powers-hero analyses-hero"><div className="powers-shell powers-hero-inner"><div className="powers-intro"><p className="breadcrumb"><a href="/" onClick={e => { e.preventDefault(); onNavigate('home') }}>Início</a><span>/</span>Análises</p><h1>Análises</h1><p>Contexto para compreender os fatos e seus desdobramentos.</p></div><div className="powers-ribbon hero-radar-element" aria-hidden="true"><img src="/elemento-radar.png" alt="" /></div></div></section>

      <section className="powers-shell analyses-content">
        <form className="analysis-filters" onSubmit={e => { e.preventDefault(); setSubmittedQuery(query) }}>
          <label className="powers-search-field"><SearchIcon /><input aria-label="Buscar análises" placeholder="Buscar análises" value={query} onChange={e => setQuery(e.target.value)} /></label>
          <select aria-label="Tema" value={theme} onChange={e => setTheme(e.target.value)}><option value="">Tema</option>{[...new Set(analysisItems.map(item => item.theme))].map(item => <option key={item}>{item}</option>)}</select>
          <select aria-label="Instituição" value={institution} onChange={e => setInstitution(e.target.value)}><option value="">Instituição</option>{[...new Set(analysisItems.map(item => item.institution))].map(item => <option key={item}>{item}</option>)}</select>
          <select aria-label="Período" value={period} onChange={e => setPeriod(e.target.value)}><option value="">Período</option><option>Últimos 30 dias</option><option>Último ano</option></select>
          <button className="button yellow">Buscar</button><button className="clear-filters" type="button" onClick={clearFilters}>Limpar filtros</button>
        </form>
        <p className="demo-notice"><span aria-hidden="true">ⓘ</span> {isLoading ? 'Consultando fontes oficiais…' : newsData ? `Conteúdo publicado pelas fontes indicadas. Consulta atualizada em ${new Date(newsData.updatedAt).toLocaleString('pt-BR')}.` : 'Fontes temporariamente indisponíveis.'}</p>

        <h2 className="analyses-title">Em destaque</h2>
        {featured ? <article className="featured-analysis"><img src={featured.image} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = featured.fallbackImage }} alt={featured.title} /><div><span className="content-badge">{featured.theme}</span><h2>{featured.title}</h2><p>{featured.description}</p><button onClick={() => window.open(featured.url, '_blank', 'noopener,noreferrer')}>Ler conteúdo <Arrow /></button></div></article> : <p className="profiles-empty">{isError ? 'Não foi possível consultar as fontes agora.' : 'Carregando destaque…'}</p>}

        <div className="analysis-tabs" role="tablist">{(['Todos', 'Análise', 'Opinião', 'Explicador'] as const).map(item => <button key={item} className={type === item ? 'active' : ''} onClick={() => setType(item)} role="tab" aria-selected={type === item}>{item}</button>)}</div>
        <h2 className="analyses-title latest-title">Últimas publicações</h2>
        {filtered.length ? <div className="publication-grid">{filtered.map(item => <article className="publication-card" key={item.id}><img src={item.image} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = item.fallbackImage }} alt={item.title} loading="lazy" /><div><span className={`content-badge type-${item.type.toLocaleLowerCase('pt-BR').replace('á','a')}`}>{item.theme}</span><h3>{item.title}</h3><p>{item.description}</p><button onClick={() => item.url && window.open(item.url, '_blank', 'noopener,noreferrer')}>Ler conteúdo <Arrow /></button></div></article>)}</div> : <p className="profiles-empty">Nenhum conteúdo encontrado com os filtros selecionados.</p>}
        <nav className="pagination" aria-label="Paginação"><button disabled><Arrow left /> Anterior</button><button className="active">1</button><button>2</button><button>3</button><button>Próxima <Arrow /></button></nav>

        <section className="reading-section"><h2>Como ler nossos conteúdos</h2><div className="reading-grid">{[['▤','Análise','Interpretação dos fatos com contexto e fontes.'], ['▱','Opinião','Argumentos e avaliações identificados como opinião.'], ['▥','Explicador','Conceitos e processos apresentados de forma acessível.']].map(([icon,title,text]) => <article key={title}><span>{icon}</span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
      </section>

      <section className="analysis-newsletter"><div className="powers-shell"><h2>Receba novas análises</h2><p>Acompanhe os temas que ajudam a entender a política.</p><form onSubmit={e => { e.preventDefault(); setMessage('Cadastro de atualizações em preparação.') }}><input type="email" required placeholder="Seu e-mail" value={email} onChange={e => setEmail(e.target.value)} /><button className="button yellow">Receber atualizações</button></form>{message && <small role="status">{message}</small>}</div><div className="powers-ribbon" aria-hidden="true"><i /><i /></div></section>
    </main>
    <footer className="site-footer"><div className="footer-inner"><a className="brand" href="/" onClick={e => { e.preventDefault(); onNavigate('home') }}><Logo /></a><nav>{['Sobre o Radar','Critérios editoriais','Fontes e metodologia','Correções','Contato','Privacidade'].map(item => <button key={item}>{item}</button>)}</nav></div></footer>
  </div>
}
