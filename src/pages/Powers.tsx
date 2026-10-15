import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

type Institution = 'Presidência' | 'Senado' | 'Câmara dos Deputados' | 'STF'
type Profile = {
  id: number
  name: string
  fullName?: string
  role: string
  institution: Institution
  party?: string
  state?: string
  status: 'active' | 'inactive'
  photo?: string
  url?: string
  sourceUrl: string
}
type RepresentativesResponse = { items: Profile[]; updatedAt: string; sources: string[] }
type PoliticalSpectrum = 'Esquerda' | 'Centro' | 'Direita'

const institutions: Array<'Todos' | Institution> = ['Todos', 'Presidência', 'Senado', 'Câmara dos Deputados', 'STF']
const partySpectrum: Record<string, PoliticalSpectrum> = {
  PT: 'Esquerda', PCdoB: 'Esquerda', PSOL: 'Esquerda', PV: 'Esquerda', REDE: 'Esquerda', PSB: 'Esquerda', PDT: 'Esquerda',
  MDB: 'Centro', PSD: 'Centro', PSDB: 'Centro', CIDADANIA: 'Centro', AVANTE: 'Centro', SOLIDARIEDADE: 'Centro', PODE: 'Centro',
  PL: 'Direita', PP: 'Direita', REPUBLICANOS: 'Direita', 'UNIÃO': 'Direita', NOVO: 'Direita', PRD: 'Direita', DC: 'Direita', 'MISSÃO': 'Direita',
}

function getPoliticalSpectrum(profile: Profile) {
  return profile.party ? partySpectrum[profile.party] : undefined
}

function Arrow({ left = false }: { left?: boolean }) {
  return <span aria-hidden="true">{left ? '←' : '→'}</span>
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
}

function Logo() {
  return <img src="/logo-radar.png" alt="Radar Político" className="logo-img" />
}

export default function Powers({ onNavigate }: { onNavigate: (page: 'home' | 'powers' | 'proposals' | 'analyses') => void }) {
  const [menu, setMenu] = useState(false)
  const [activeInstitution, setActiveInstitution] = useState<'Todos' | Institution>('Todos')
  const [query, setQuery] = useState('')
  const [institutionFilter, setInstitutionFilter] = useState('')
  const [status, setStatus] = useState('')
  const [spectrum, setSpectrum] = useState<PoliticalSpectrum | ''>('')
  const [sort, setSort] = useState('name')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 24
  const { data: representativesData, isLoading } = useQuery<RepresentativesResponse>({
    queryKey: ['official-representatives-live'],
    queryFn: async () => {
      const response = await fetch('/api/representatives', { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json() as Promise<RepresentativesResponse>
    },
    staleTime: 0, refetchOnMount: 'always', refetchInterval: 5 * 60 * 1000, retry: 2,
  })
  const profileItems = (representativesData?.items || []).filter(profile => typeof profile.name === 'string' && typeof profile.institution === 'string' && typeof profile.role === 'string')

  const filteredProfiles = useMemo(() => {
    const normalized = submittedQuery.trim().toLocaleLowerCase('pt-BR')
    return profileItems
      .filter(profile => activeInstitution === 'Todos' || profile.institution === activeInstitution)
      .filter(profile => !institutionFilter || profile.institution === institutionFilter)
      .filter(profile => !status || status === 'Todos' || profile.status === 'active')
      .filter(profile => !spectrum || getPoliticalSpectrum(profile) === spectrum)
      .filter(profile => !normalized || `${profile.name} ${profile.fullName || ''} ${profile.role} ${profile.party || ''} ${profile.state || ''}`.toLocaleLowerCase('pt-BR').includes(normalized))
      .sort((a, b) => sort === 'institution' ? String(a.institution).localeCompare(String(b.institution), 'pt-BR') || String(a.name).localeCompare(String(b.name), 'pt-BR') : String(a.name).localeCompare(String(b.name), 'pt-BR'))
  }, [activeInstitution, institutionFilter, profileItems, sort, spectrum, status, submittedQuery])
  const pageCount = Math.max(1, Math.ceil(filteredProfiles.length / pageSize))
  const visibleProfiles = filteredProfiles.slice((page - 1) * pageSize, page * pageSize)
  const pageNumbers = Array.from({ length: Math.min(5, pageCount) }, (_, index) => Math.max(1, Math.min(pageCount - 4, page - 2)) + index).filter(value => value <= pageCount)

  function updateFilters(action: () => void) { action(); setPage(1) }

  function clearFilters() {
    setQuery('')
    setSubmittedQuery('')
    setInstitutionFilter('')
    setStatus('')
    setSpectrum('')
    setActiveInstitution('Todos')
    setPage(1)
  }

  function navigateToHomeSection(section: string) {
    onNavigate('home')
    window.setTimeout(() => document.getElementById(section)?.scrollIntoView({ block: 'start' }), 0)
  }

  return <div className="powers-page">
    <header className="site-header">
      <div className="header-inner container">
        <a className="brand" href="/" onClick={e => { e.preventDefault(); onNavigate('home') }}><Logo /></a>
        <nav className={menu ? 'navigation open' : 'navigation'} aria-label="Navegação principal">
          <a href="/" onClick={e => { e.preventDefault(); navigateToHomeSection('noticias') }}>Notícias</a>
          <a className="active" href="/poderes">Poderes</a>
          <a href="/propostas" onClick={e => { e.preventDefault(); onNavigate('proposals') }}>Propostas</a>
          <a href="/analises" onClick={e => { e.preventDefault(); onNavigate('analyses') }}>Análises</a>
        </nav>
        <div className="header-actions">
          <button className="header-search" aria-label="Buscar"><SearchIcon /></button>
          <button className="mobile-menu" aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}><span aria-hidden="true">{menu ? '×' : '☰'}</span></button>
        </div>
      </div>
    </header>

    <main>
      <section className="powers-hero">
        <div className="powers-shell powers-hero-inner">
          <div className="powers-intro">
            <p className="breadcrumb"><a href="/" onClick={e => { e.preventDefault(); onNavigate('home') }}>Início</a><span>/</span>Poderes</p>
            <h1>Poderes e representantes</h1>
            <p>Conheça as instituições e acompanhe a atuação de seus integrantes.</p>
          </div>
          <div className="powers-ribbon" aria-hidden="true"><i /><i /></div>
        </div>
      </section>

      <section className="powers-shell powers-content" aria-label="Perfis dos poderes">
        <div className="institution-tabs" role="tablist" aria-label="Filtrar por instituição">
          {institutions.map(item => <button key={item} role="tab" aria-selected={activeInstitution === item} className={activeInstitution === item ? 'active' : ''} onClick={() => updateFilters(() => setActiveInstitution(item))}>{item}</button>)}
        </div>
        <p className="tabs-caption">Executivo, Legislativo e Judiciário em um só lugar.</p>

        <form className="powers-filters" onSubmit={e => { e.preventDefault(); updateFilters(() => setSubmittedQuery(query)) }}>
          <label className="powers-search-field"><SearchIcon /><input aria-label="Buscar por nome" placeholder="Buscar por nome" value={query} onChange={e => setQuery(e.target.value)} /></label>
          <select aria-label="Instituição" value={institutionFilter} onChange={e => updateFilters(() => setInstitutionFilter(e.target.value))}>
            <option value="">Instituição</option>
            {institutions.slice(1).map(item => <option key={item}>{item}</option>)}
          </select>
          <select aria-label="Situação" value={status} onChange={e => updateFilters(() => setStatus(e.target.value))}>
            <option value="">Situação</option><option>Em exercício</option><option>Todos</option>
          </select>
          <select aria-label="Campo político" value={spectrum} onChange={e => updateFilters(() => setSpectrum(e.target.value as PoliticalSpectrum | ''))}>
            <option value="">Campo político</option><option>Esquerda</option><option>Centro</option><option>Direita</option>
          </select>
          <button className="button yellow" type="submit">Buscar</button>
          <button className="clear-filters" type="button" onClick={clearFilters}>Limpar filtros</button>
        </form>

        <p className="demo-notice"><span aria-hidden="true">ⓘ</span> {isLoading ? 'Consultando os dados oficiais…' : representativesData ? `${profileItems.length} autoridades em exercício, atualizadas pelas fontes oficiais em ${new Date(representativesData.updatedAt).toLocaleString('pt-BR')}.` : 'Dados oficiais temporariamente indisponíveis.'}</p>

        <div className="profiles-heading">
          <h2>Explore os perfis</h2>
          <label>Ordenar por:
            <select value={sort} onChange={e => setSort(e.target.value)}><option value="name">Nome</option><option value="institution">Instituição</option></select>
          </label>
        </div>

        {visibleProfiles.length ? <div className="profiles-grid">
          {visibleProfiles.map(profile => <article className="profile-card" key={profile.id}>
            <span className={`institution-badge badge-${profile.institution.toLocaleLowerCase('pt-BR').replaceAll(' ', '-').replace('â', 'a')}`}>{profile.institution}</span>
            <div className="profile-summary">
              <div className="profile-avatar">{profile.photo ? <img src={`/api/image?url=${encodeURIComponent(profile.photo)}`} alt={`Foto de ${profile.name}`} loading="lazy" /> : <span />}</div>
              <div><h3>{profile.name}</h3><p>{profile.role}{profile.party ? ` · ${profile.party}` : ''}{profile.state ? ` — ${profile.state}` : ''}</p>{getPoliticalSpectrum(profile) && <small className={`spectrum spectrum-${getPoliticalSpectrum(profile)?.toLocaleLowerCase('pt-BR')}`}>{getPoliticalSpectrum(profile)}</small>}</div>
            </div>
            <div className="profile-links"><button onClick={() => window.open(profile.sourceUrl, '_blank', 'noopener,noreferrer')}>Fonte oficial</button></div>
            <button className="profile-button" onClick={() => profile.url && window.open(profile.url, '_blank', 'noopener,noreferrer')}>Ver perfil oficial <Arrow /></button>
          </article>)}
        </div> : <p className="profiles-empty">Nenhum perfil encontrado com os filtros selecionados.</p>}

        <nav className="pagination" aria-label="Paginação">
          <button disabled={page === 1} onClick={() => setPage(value => Math.max(1, value - 1))}><Arrow left /> Anterior</button>
          {pageNumbers.map(number => <button key={number} className={page === number ? 'active' : ''} aria-current={page === number ? 'page' : undefined} onClick={() => setPage(number)}>{number}</button>)}
          <button disabled={page === pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>Próxima <Arrow /></button>
        </nav>
      </section>

      <section className="powers-cta">
        <div className="powers-shell">
          <h2>Entenda o papel de cada poder</h2>
          <p>Conheça as competências das instituições.</p>
          <button className="button yellow">Explorar instituições <Arrow /></button>
        </div>
        <div className="powers-ribbon" aria-hidden="true"><i /><i /></div>
      </section>

      <section className="powers-shell info-section">
        <h2>Como organizamos as informações</h2>
        <div className="info-grid">
          <article><span className="info-icon">▤</span><div><h3>Fontes públicas</h3><p>Referências para consultar a origem das informações. O campo político é uma classificação editorial simplificada e revisável.</p></div></article>
          <article><span className="info-icon">□</span><div><h3>Contexto e datas</h3><p>Registros apresentados com período e contexto.</p></div></article>
          <article><span className="info-icon">♢</span><div><h3>Correções</h3><p>Um canal para apontar informações que precisam de revisão.</p></div></article>
        </div>
      </section>
    </main>

    <footer className="site-footer">
      <div className="footer-inner">
        <a className="brand" href="/" onClick={e => { e.preventDefault(); onNavigate('home') }}><Logo /></a>
        <nav>{['Sobre o Radar', 'Critérios editoriais', 'Fontes e metodologia', 'Correções', 'Contato', 'Privacidade'].map(item => <button key={item}>{item}</button>)}</nav>
      </div>
    </footer>
  </div>
}
