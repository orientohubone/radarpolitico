import React, { useEffect, useState } from 'react'
import type { PageName } from '../App'

type QueueItem = { id: string; headline: string; category: string; source: string; editorialStatus: string; publishedAt: string }
type Editorial = { id: string; headline: string; summary: string; whatHappened: string; whyItMatters: string; whoIsAffected: string; argumentsFor: string; argumentsAgainst: string; openQuestions: string; whatNext: string; radarView: string; keyPoints: string[]; editorialStatus: string; authorName: string; reviewedBy: string; source: string; sourceTitle: string; sourceDescription: string; sourceUrl: string }

const blank: Editorial = { id: '', headline: '', summary: '', whatHappened: '', whyItMatters: '', whoIsAffected: '', argumentsFor: '', argumentsAgainst: '', openQuestions: '', whatNext: '', radarView: '', keyPoints: [], editorialStatus: 'draft', authorName: 'Redação Radar Político', reviewedBy: '', source: '', sourceTitle: '', sourceDescription: '', sourceUrl: '' }

export default function EditorialAdmin({ onNavigate }: { onNavigate: (page: PageName) => void }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('radar:editorial-token') || '')
  const [inputToken, setInputToken] = useState('')
  const [items, setItems] = useState<QueueItem[]>([])
  const [article, setArticle] = useState<Editorial>(blank)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}` }

  async function loadQueue() {
    if (!token) return
    setLoading(true)
    try { const response = await fetch('/api/admin/articles', { headers }); if (!response.ok) throw new Error('Token inválido ou sessão expirada.'); setItems((await response.json()).items) }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao carregar.'); setToken(''); sessionStorage.removeItem('radar:editorial-token') }
    finally { setLoading(false) }
  }
  useEffect(() => { loadQueue() }, [token])

  async function select(id: string) {
    setMessage('Carregando matéria…')
    const response = await fetch(`/api/admin/articles/${id}`, { headers })
    if (!response.ok) return setMessage('Não foi possível carregar a matéria.')
    const data = await response.json(); setArticle({ ...blank, ...data, keyPoints: data.keyPoints || [] }); setMessage('')
  }
  async function save() {
    setMessage('Salvando…')
    const response = await fetch(`/api/admin/articles/${article.id}`, { method: 'PUT', headers, body: JSON.stringify(article) })
    if (!response.ok) { const data = await response.json(); return setMessage(data.error || 'Não foi possível salvar.') }
    setMessage('Alterações salvas no Neon.'); await loadQueue()
  }
  const field = (key: keyof Editorial, label: string, rows = 5) => <label><span>{label}</span><textarea rows={rows} value={String(article[key] || '')} onChange={event => setArticle({ ...article, [key]: event.target.value })} /></label>

  if (!token) return <main className="editorial-login"><form onSubmit={event => { event.preventDefault(); sessionStorage.setItem('radar:editorial-token', inputToken); setToken(inputToken) }}><img src="/logo-radar.png" alt="Radar Político" /><h1>Painel editorial</h1><p>Use o token editorial configurado no servidor.</p><input type="password" value={inputToken} onChange={event => setInputToken(event.target.value)} placeholder="Token de acesso" required /><button className="button yellow">Entrar</button>{message && <small>{message}</small>}</form></main>

  return <div className="editorial-admin"><header><button onClick={() => onNavigate('home')}><img src="/logo-radar.png" alt="Radar Político" /></button><div><strong>Painel editorial</strong><button onClick={() => { sessionStorage.removeItem('radar:editorial-token'); setToken('') }}>Sair</button></div></header><main><aside><h1>Fila editorial</h1><p>{loading ? 'Atualizando…' : `${items.length} matérias`}</p><div>{items.map(item => <button className={article.id === item.id ? 'active' : ''} key={item.id} onClick={() => select(item.id)}><span>{item.category} · {item.source}</span><strong>{item.headline}</strong><em>{item.editorialStatus}</em></button>)}</div></aside><section className="editorial-workspace">{!article.id ? <div className="editorial-empty"><h2>Selecione uma matéria</h2><p>Comece pelas matérias marcadas como conteúdo bruto.</p></div> : <><div className="editorial-toolbar"><div><span>{article.source}</span><h2>{article.sourceTitle}</h2><a href={article.sourceUrl} target="_blank" rel="noreferrer">Abrir fonte original ↗</a></div><div><select value={article.editorialStatus} onChange={event => setArticle({ ...article, editorialStatus: event.target.value })}><option value="raw">Conteúdo bruto</option><option value="draft">Rascunho</option><option value="review">Em revisão</option><option value="ready">Editorial pronto</option></select><button className="button yellow" onClick={save}>Salvar</button></div></div><p className="source-excerpt">{article.sourceDescription}</p><div className="editorial-form"><label><span>Título do Radar</span><input value={article.headline} onChange={event => setArticle({ ...article, headline: event.target.value })} /></label>{field('summary','Resumo em 30 segundos',3)}<label><span>Pontos essenciais — um por linha</span><textarea rows={5} value={article.keyPoints.join('\n')} onChange={event => setArticle({ ...article, keyPoints: event.target.value.split('\n') })} /></label>{field('whatHappened','O que aconteceu')}{field('whyItMatters','Por que importa')}{field('whoIsAffected','Quem é afetado')}{field('argumentsFor','Argumentos favoráveis')}{field('argumentsAgainst','Argumentos contrários')}{field('openQuestions','O que ainda não sabemos')}{field('whatNext','O que acompanhar agora')}{field('radarView','Visão do Radar — opinião editorial')}<div className="editorial-row"><label><span>Autor</span><input value={article.authorName} onChange={event => setArticle({ ...article, authorName: event.target.value })} /></label><label><span>Revisado por</span><input value={article.reviewedBy} onChange={event => setArticle({ ...article, reviewedBy: event.target.value })} /></label></div></div>{message && <p className="editorial-message">{message}</p>}</>}</section></main></div>
}
