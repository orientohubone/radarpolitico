import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchWithLocalCache, loadLocalCache } from '../lib/apiCache'

type Institution = 'Presidência' | 'Senado' | 'Câmara dos Deputados' | 'STF'
type Profile = {
  id: number
  name: string
  role: string
  institution: Institution
  links: string[]
  photo?: string
  url?: string
}
type Deputy = { id: number; nome: string; siglaPartido: string; siglaUf: string; urlFoto: string; uri: string }

const institutions: Array<'Todos' | Institution> = ['Todos', 'Presidência', 'Senado', 'Câmara dos Deputados', 'STF']

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
  const [sort, setSort] = useState('name')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const { data: representativesData, isLoading } = useQuery<{ items: Deputy[]; updatedAt: string; source: string }>({ queryKey: ['official-representatives'], queryFn: () => fetchWithLocalCache('/api/representatives', 'representatives'), initialData: () => loadLocalCache('representatives'), staleTime: 5 * 60 * 1000, refetchInterval: 5 * 60 * 1000, retry: 2 })
  const profileItems: Profile[] = representativesData?.items?.map(item => ({ id: item.id, name: item.nome, role: `${item.siglaPartido} — ${item.siglaUf}`, institution: 'Câmara dos Deputados', links: ['Propostas', 'Votações'], photo: item.urlFoto, url: `https://www.camara.leg.br/deputados/${item.id}` })) || []

  const filteredProfiles = useMemo(() => {
    const normalized = submittedQuery.trim().toLocaleLowerCase('pt-BR')
    return profileItems
      .filter(profile => activeInstitution === 'Todos' || profile.institution === activeInstitution)
      .filter(profile => !institutionFilter || profile.institution === institutionFilter)
      .filter(profile => !normalized || `${profile.name} ${profile.role}`.toLocaleLowerCase('pt-BR').includes(normalized))
      .sort((a, b) => sort === 'institution' ? a.institution.localeCompare(b.institution, 'pt-BR') : a.name.localeCompare(b.name, 'pt-BR'))
      .slice(0, 6)
  }, [activeInstitution, institutionFilter, profileItems, sort, submittedQuery])

  function clearFilters() {
    setQuery('')
    setSubmittedQuery('')
    setInstitutionFilter('')
    setStatus('')
    setActiveInstitution('Todos')
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
          {institutions.map(item => <button key={item} role="tab" aria-selected={activeInstitution === item} className={activeInstitution === item ? 'active' : ''} onClick={() => setActiveInstitution(item)}>{item}</button>)}
        </div>
        <p className="tabs-caption">Executivo, Legislativo e Judiciário em um só lugar.</p>

        <form className="powers-filters" onSubmit={e => { e.preventDefault(); setSubmittedQuery(query) }}>
          <label className="powers-search-field"><SearchIcon /><input aria-label="Buscar por nome" placeholder="Buscar por nome" value={query} onChange={e => setQuery(e.target.value)} /></label>
          <select aria-label="Instituição" value={institutionFilter} onChange={e => setInstitutionFilter(e.target.value)}>
            <option value="">Instituição</option>
            {institutions.slice(1).map(item => <option key={item}>{item}</option>)}
          </select>
          <select aria-label="Situação" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">Situação</option><option>Em exercício</option><option>Todos</option>
          </select>
          <button className="button yellow" type="submit">Buscar</button>
          <button className="clear-filters" type="button" onClick={clearFilters}>Limpar filtros</button>
        </form>

        <p className="demo-notice"><span aria-hidden="true">ⓘ</span> {isLoading ? 'Consultando os dados oficiais…' : representativesData ? `Deputados em exercício — fonte: Câmara dos Deputados. Atualizado em ${new Date(representativesData.updatedAt).toLocaleString('pt-BR')}.` : 'Dados oficiais temporariamente indisponíveis.'}</p>

        <div className="profiles-heading">
          <h2>Explore os perfis</h2>
          <label>Ordenar por:
            <select value={sort} onChange={e => setSort(e.target.value)}><option value="name">Nome</option><option value="institution">Instituição</option></select>
          </label>
        </div>

        {filteredProfiles.length ? <div className="profiles-grid">
          {filteredProfiles.map(profile => <article className="profile-card" key={profile.id}>
            <span className={`institution-badge badge-${profile.institution.toLocaleLowerCase('pt-BR').replaceAll(' ', '-').replace('â', 'a')}`}>{profile.institution}</span>
            <div className="profile-summary">
              <div className="profile-avatar">{profile.photo ? <img src={profile.photo} alt="" loading="lazy" /> : <span />}</div>
              <div><h3>{profile.name}</h3><p>{profile.role}</p></div>
            </div>
            <div className="profile-links">{profile.links.map(link => <button key={link}>{link}</button>)}</div>
            <button className="profile-button" onClick={() => profile.url && window.open(profile.url, '_blank', 'noopener,noreferrer')}>Ver perfil oficial <Arrow /></button>
          </article>)}
        </div> : <p className="profiles-empty">Nenhum perfil encontrado com os filtros selecionados.</p>}

        <nav className="pagination" aria-label="Paginação">
          <button disabled><Arrow left /> Anterior</button><button className="active" aria-current="page">1</button><button>2</button><button>3</button><button>Próxima <Arrow /></button>
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
          <article><span className="info-icon">▤</span><div><h3>Fontes públicas</h3><p>Referências para consultar a origem das informações.</p></div></article>
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
