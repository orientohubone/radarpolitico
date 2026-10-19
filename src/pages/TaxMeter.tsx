import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

type TaxData = {
  scope: string; year: number; officialTotal: number; estimatedTotal: number; dailyPace: number
  lastClosedMonth: string; variation: number | null; fetchedAt: string; fallback: boolean; methodology: string
  monthly: { month: string; value: number; previousValue: number | null }[]
  source: { name: string; url: string; downloadUrl: string }
}

const money = (value: number, digits = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: digits }).format(value)
const compact = (value: number) => new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL', maximumFractionDigits: 1 }).format(value)

export default function TaxMeter({ onNavigate }: { onNavigate?: (page: 'home' | 'powers' | 'proposals' | 'analyses' | 'taxMeter') => void }) {
  const { data, isLoading, isError } = useQuery<TaxData>({ queryKey: ['tax-meter'], queryFn: async () => { const response = await fetch('/api/tax-meter'); if (!response.ok) throw new Error(); return response.json() }, staleTime: 5 * 60 * 1000 })
  const [live, setLive] = useState(0)
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    if (!data) return
    const started = Date.now(); setLive(data.estimatedTotal)
    const timer = window.setInterval(() => setLive(data.estimatedTotal + (Date.now() - started) / 86400000 * data.dailyPace), 100)
    return () => window.clearInterval(timer)
  }, [data])
  const max = Math.max(...(data?.monthly.map(item => item.value) || [1]))

  return <div className="tax-page">
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <header className="site-header"><div className="header-inner container">
      <a className="brand" href="/" onClick={e => { e.preventDefault(); onNavigate?.('home') }}><img src="/logo-radar.png" alt="Radar Político" className="logo-img" /></a>
      <nav className={menu ? 'navigation open' : 'navigation'} aria-label="Navegação principal">
        <a href="/" onClick={e => { e.preventDefault(); onNavigate?.('home') }}>Notícias</a>
        <a href="/poderes" onClick={e => { e.preventDefault(); onNavigate?.('powers') }}>Poderes</a>
        <a href="/propostas" onClick={e => { e.preventDefault(); onNavigate?.('proposals') }}>Propostas</a>
        <a href="/analises" onClick={e => { e.preventDefault(); onNavigate?.('analyses') }}>Análises</a>
        <a className="active" href="/impostometro">Impostômetro</a>
      </nav>
      <div className="header-actions">
        <button className="header-search" aria-label="Buscar notícias" onClick={() => onNavigate?.('home')}><svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></svg></button>
        <button className="mobile-menu" aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}><span aria-hidden="true">{menu ? '×' : '☰'}</span></button>
      </div>
    </div></header>
    <main id="conteudo">
      <section className="tax-hero">
        <img className="tax-hero-element" src="/elemento-radar.png" alt="" aria-hidden="true" />
        <div className="container tax-hero-inner">
          <div className="tax-kicker"><span aria-hidden="true" /> Dados públicos • Brasil</div>
          <h1>Impostômetro do Radar</h1>
          <p className="tax-lead">Acompanhe quanto o governo federal arrecadou e entenda o que é dado oficial e o que é estimativa.</p>
          {isLoading && <div className="tax-loading">Consultando dados oficiais da Receita Federal…</div>}
          {isError && <div className="tax-loading tax-error">Não foi possível carregar os dados agora.</div>}
          {data && <>
            <div className="tax-counter" aria-live="polite">
              <span>Arrecadação federal estimada em {data.year}</span>
              <strong>{money(live, 2)}</strong>
              <small><i /> Projeção atualizada na tela</small>
            </div>
            <div className="tax-disclaimer"><b>Transparência:</b> o número acima é uma estimativa. O último valor fechado pela Receita vai até {data.lastClosedMonth.toLocaleLowerCase('pt-BR')}.</div>
          </>}
        </div>
      </section>

      {data && <section className="container tax-content">
        <div className="tax-stats">
          <article><span>Acumulado oficial</span><strong>{compact(data.officialTotal)}</strong><small>até {data.lastClosedMonth.toLocaleLowerCase('pt-BR')}</small></article>
          <article><span>Média por dia</span><strong>{compact(data.dailyPace)}</strong><small>base do contador estimado</small></article>
          <article><span>Variação no período</span><strong>{data.variation == null ? '—' : `${data.variation >= 0 ? '+' : ''}${data.variation.toFixed(1).replace('.', ',')}%`}</strong><small>contra o mesmo período de {data.year - 1}</small></article>
        </div>

        <div className="tax-grid">
          <article className="tax-panel tax-chart-panel">
            <div className="tax-panel-heading"><div><span>Evolução mensal</span><h2>Arrecadação federal em {data.year}</h2></div><span className="tax-unit">Valores correntes</span></div>
            <div className="tax-chart" role="img" aria-label="Gráfico da arrecadação federal mensal">
              {data.monthly.map(item => <div className="tax-bar-group" key={item.month} title={`${item.month}: ${money(item.value)}`}>
                <span className="tax-bar-value">{compact(item.value)}</span><div className="tax-bar" style={{ height: `${Math.max(8, item.value / max * 100)}%` }} /><small>{item.month.slice(0, 3)}</small>
              </div>)}
            </div>
          </article>
          <aside className="tax-panel tax-method">
            <span>Como calculamos</span><h2>Metodologia aberta</h2>
            <ol><li><b>Dado oficial</b><p>Somamos os valores mensais publicados pela Receita Federal.</p></li><li><b>Ritmo estimado</b><p>Calculamos a média diária do ano até o último mês fechado.</p></li><li><b>Contador</b><p>Projetamos esse ritmo até o instante atual, sem chamar a projeção de dado oficial.</p></li></ol>
          </aside>
        </div>

        <section className="tax-source">
          <div><span>Fonte primária</span><h2>{data.source.name}</h2><p>{data.methodology}</p>{data.fallback && <small>Exibindo o último retrato local validado porque a fonte está temporariamente indisponível.</small>}</div>
          <a href={data.source.url} target="_blank" rel="noreferrer">Abrir dados oficiais <span aria-hidden="true">↗</span></a>
        </section>
        <section className="tax-scope"><h2>O que entra — e o que ainda não entra</h2><p>Este primeiro painel mede receitas administradas pela Receita Federal e por outros órgãos federais presentes na base. Tributos estaduais e municipais não estão somados para evitar misturar períodos de atualização diferentes. A próxima etapa poderá incorporar esses entes pela API pública do SICONFI, mantendo cada esfera identificada.</p></section>
      </section>}
    </main>
    <footer className="site-footer"><div className="container tax-footer"><img src="/logo-radar.png" alt="Radar Político" className="logo-img logo-img--small" /><span>Dados públicos, contexto e transparência.</span></div></footer>
  </div>
}
