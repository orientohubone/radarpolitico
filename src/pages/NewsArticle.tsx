import React, { useState } from 'react'
import type { PageName } from '../App'
import { useQuery } from '@tanstack/react-query'
import { fetchWithLocalCache, loadLocalCache } from '../lib/apiCache'

type LiveNews = { id: string; category: string; title: string; description: string; image: string; url: string; publishedAt: string; source: string }
type NewsPayload = { items: LiveNews[]; updatedAt: string }
const proxiedImage = (url: string) => url.startsWith('http') ? `/api/image?url=${encodeURIComponent(url)}` : url

function Logo({ small = false }: { small?: boolean }) { return <img src="/logo-radar.png" alt="Radar Político" className={small ? 'logo-img logo-img--small' : 'logo-img'} /> }

export default function NewsArticle({ onNavigate }: { onNavigate: (page: PageName) => void }) {
  const [menu, setMenu] = useState(false)
  const encodedId = window.location.pathname.split('/noticias/')[1] || ''
  const id = decodeURIComponent(encodedId)
  const { data: payload, isLoading } = useQuery<NewsPayload>({
    queryKey: ['live-news-v2'],
    queryFn: () => fetchWithLocalCache('/api/news', 'news-v2'),
    initialData: () => loadLocalCache<NewsPayload>('news-v2'),
    staleTime: 5 * 60 * 1000,
  })
  const article = payload?.items.find(item => item.id === id)

  if (!article) return <div className="powers-page"><header className="site-header"><div className="header-inner container"><button className="brand" onClick={() => onNavigate('home')}><Logo /></button></div></header><main className="powers-shell missing-article"><p className="breadcrumb">Início / Notícias</p><h1>{isLoading ? 'Carregando notícia…' : 'Conteúdo não encontrado'}</h1><p>{isLoading ? 'Consultando as fontes e preparando a leitura.' : 'A notícia pode ter sido atualizada. Volte para consultar as publicações mais recentes.'}</p>{!isLoading && <button className="button yellow" onClick={() => onNavigate('home')}>Voltar às notícias</button>}</main></div>

  const published = article.publishedAt ? new Date(article.publishedAt) : null
  const hasValidDate = published && !Number.isNaN(published.getTime())
  const fallback = article.category === 'Câmara' ? '/images/chamber.jpg' : article.category === 'Senado' ? '/images/congress-evening.jpg' : '/images/congress.jpg'
  const articleImage = article.image && !['imagem-padrao', 'imagem_padrao', 'default', 'placeholder'].some(pattern => article.image.toLocaleLowerCase('pt-BR').includes(pattern)) ? article.image : fallback

  return <div className="powers-page news-reading-page">
    <header className="site-header"><div className="header-inner container">
      <a className="brand" href="/" onClick={event => { event.preventDefault(); onNavigate('home') }}><Logo /></a>
      <nav className={menu ? 'navigation open' : 'navigation'} aria-label="Navegação principal"><a href="/" className="active" onClick={event => { event.preventDefault(); onNavigate('home') }}>Notícias</a><a href="/poderes" onClick={event => { event.preventDefault(); onNavigate('powers') }}>Poderes</a><a href="/propostas" onClick={event => { event.preventDefault(); onNavigate('proposals') }}>Propostas</a><a href="/analises" onClick={event => { event.preventDefault(); onNavigate('analyses') }}>Análises</a></nav>
      <div className="header-actions"><button className="header-search" aria-label="Buscar notícias" onClick={() => onNavigate('home')}><span aria-hidden="true">⌕</span></button><button className="mobile-menu" aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}><span aria-hidden="true">{menu ? '×' : '☰'}</span></button></div>
    </div></header>

    <main className="powers-shell reading-content">
      <p className="breadcrumb"><a href="/" onClick={event => { event.preventDefault(); onNavigate('home') }}>Início</a><span>/</span> Notícias <span>/</span> Leitura</p>
      <header className="article-header">
        <div className="article-kicker"><span>{article.category}</span><i /> Radar explica</div>
        <h1>{article.title}</h1>
        <p className="article-dek">{article.description}</p>
        <div className="article-byline"><strong>Redação Radar Político</strong><i />{hasValidDate && <time dateTime={article.publishedAt}>Publicado em {published.toLocaleDateString('pt-BR')}</time>}</div>
      </header>

      <p className="editorial-note"><span aria-hidden="true">ⓘ</span> Síntese editorial elaborada a partir da fonte indicada. Consulte o material original para todos os detalhes.</p>
      <div className="article-layout">
        <article className="article-body-content">
          <figure><img src={proxiedImage(articleImage)} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = fallback }} alt={article.title} /><figcaption>Imagem vinculada à publicação consultada.</figcaption></figure>
          <p className="article-lead">Em poucas palavras: {article.description}</p>
          <section id="entenda"><h2>Entenda o que aconteceu</h2><p>A informação em destaque foi publicada por uma fonte jornalística ou institucional acompanhada pelo Radar Político. Esta página organiza os principais elementos em uma leitura direta, preservando o acesso ao registro de origem.</p></section>
          <section id="contexto"><h2>Por que este assunto importa</h2><p>Decisões e debates políticos podem produzir efeitos em etapas diferentes. Para interpretar a notícia, é importante distinguir anúncio, proposta, tramitação e decisão já tomada, além de observar quais instituições têm competência sobre o tema.</p></section>
          <section id="acompanhar"><h2>O que acompanhar agora</h2><p>Observe novas manifestações oficiais, documentos publicados e eventuais mudanças na tramitação. O Radar atualizará a seleção quando houver novos registros disponíveis nas fontes consultadas.</p></section>
          <section className="source-reference"><span>Fonte consultada</span><strong>{article.source}</strong><p>O conteúdo original contém a íntegra e eventuais atualizações feitas pela publicação responsável.</p><a href={article.url} target="_blank" rel="noreferrer">Consultar publicação original <span aria-hidden="true">↗</span></a></section>
        </article>
        <aside className="article-sidebar"><nav><h2>Nesta leitura</h2><a href="#entenda">Entenda o que aconteceu</a><a href="#contexto">Por que este assunto importa</a><a href="#acompanhar">O que acompanhar agora</a><a href="#fonte" onClick={event => { event.preventDefault(); document.querySelector('.source-reference')?.scrollIntoView({ behavior: 'smooth' }) }}>Fonte consultada</a></nav></aside>
      </div>
    </main>
    <footer className="site-footer"><div className="footer-inner"><a className="brand" href="/" onClick={event => { event.preventDefault(); onNavigate('home') }}><Logo small /></a><nav aria-label="Informações institucionais">{['Sobre o Radar','Critérios editoriais','Fontes e metodologia','Correções','Contato','Privacidade'].map(item => <button key={item}>{item}</button>)}</nav></div></footer>
  </div>
}
