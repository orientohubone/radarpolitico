import { useEffect, useMemo, useState } from 'react'
import type { PageName } from '../App'

type QueueItem = { id: string; slug: string; headline: string; category: string; source: string; editorialStatus: string; status: string; publishedAt: string }
type Editorial = { id: string; headline: string; summary: string; whatHappened: string; whyItMatters: string; whoIsAffected: string; argumentsFor: string; argumentsAgainst: string; openQuestions: string; whatNext: string; radarView: string; keyPoints: string[]; editorialStatus: string; status: string; slug: string; publishedAt: string; authorName: string; reviewedBy: string; source: string; sourceTitle: string; sourceDescription: string; sourceUrl: string }
type NewsHealth = { intervalMs: number; running: boolean; lastSuccessAt: string | null; lastError: string | null }

const blank: Editorial = { id: '', headline: '', summary: '', whatHappened: '', whyItMatters: '', whoIsAffected: '', argumentsFor: '', argumentsAgainst: '', openQuestions: '', whatNext: '', radarView: '', keyPoints: [], editorialStatus: 'draft', status: 'draft', slug: '', publishedAt: '', authorName: 'Redação Radar Político', reviewedBy: '', source: '', sourceTitle: '', sourceDescription: '', sourceUrl: '' }
const statusLabel: Record<string, string> = { update: 'Atualizar', raw: 'Conteúdo bruto', draft: 'Rascunho', review: 'Em revisão', ready: 'Editorial pronto' }

export default function EditorialAdmin({ onNavigate }: { onNavigate: (page: PageName) => void }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('radar:editorial-token') || '')
  const [inputToken, setInputToken] = useState('')
  const [items, setItems] = useState<QueueItem[]>([])
  const [article, setArticle] = useState<Editorial>(blank)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [importOpen, setImportOpen] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [newsHealth, setNewsHealth] = useState<NewsHealth | null>(null)
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}` }

  async function loadQueue() {
    if (!token) return
    setLoading(true)
    try {
      const [response, healthResponse] = await Promise.all([fetch('/api/admin/articles', { headers }), fetch('/api/admin/news-health', { headers })])
      if (!response.ok || !healthResponse.ok) throw new Error('Token inválido ou sessão expirada.')
      setItems((await response.json()).items)
      setNewsHealth(await healthResponse.json())
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao carregar.')
      setToken(''); sessionStorage.removeItem('radar:editorial-token')
    } finally { setLoading(false) }
  }
  useEffect(() => { loadQueue() }, [token])

  const filtered = useMemo(() => items.filter(item => {
    const matchesStatus = filter === 'all' || item.editorialStatus === filter
    const editorialNumber = `editorial ${item.id.padStart(3, '0')}`
    const normalized = `${editorialNumber} ${item.id} ${item.headline} ${item.category} ${item.source}`.toLocaleLowerCase('pt-BR')
    return matchesStatus && normalized.includes(query.toLocaleLowerCase('pt-BR').trim())
  }), [items, filter, query])
  const allFilteredSelected = filtered.length > 0 && filtered.every(item => selected.has(item.id))
  const counts = useMemo(() => Object.fromEntries(['update','raw','draft','review','ready'].map(status => [status, items.filter(item => item.editorialStatus === status).length])), [items])
  const required = [article.headline, article.summary, article.whatHappened, article.whyItMatters, article.whoIsAffected, article.whatNext, article.keyPoints.length ? 'ok' : '']
  const completeness = article.id ? Math.round(required.filter(value => String(value).trim()).length / required.length * 100) : 0

  async function select(id: string) {
    setMessage('Carregando matéria…')
    const response = await fetch(`/api/admin/articles/${id}`, { headers })
    if (!response.ok) return setMessage('Não foi possível carregar a matéria.')
    const data = await response.json(); setArticle({ ...blank, ...data, keyPoints: data.keyPoints || [] }); setMessage('')
  }
  async function save() {
    setMessage('Salvando…')
    const response = await fetch(`/api/admin/articles/${article.id}`, { method: 'PUT', headers, body: JSON.stringify(article) })
    if (!response.ok) { const data = await response.json(); setMessage(data.error || 'Não foi possível salvar.'); return false }
    setMessage('Alterações salvas no Neon.'); await loadQueue(); return true
  }
  async function changePublication(action: 'publish' | 'unpublish') {
    if (action === 'publish' && article.editorialStatus !== 'ready') return setMessage('Conclua a revisão e selecione “Editorial pronto” antes de publicar.')
    if (action === 'publish' && !(await save())) return
    setMessage(action === 'publish' ? 'Publicando no Radar…' : 'Retirando do site…')
    const response = await fetch(`/api/admin/articles/${article.id}/publication`, { method: 'POST', headers, body: JSON.stringify({ action }) })
    const data = await response.json()
    if (!response.ok) return setMessage(data.error || 'Não foi possível alterar a publicação.')
    setArticle({ ...article, status: data.status, publishedAt: data.publishedAt || '' })
    setMessage(action === 'publish' ? 'Matéria publicada. Use o link ao lado para conferir no site.' : 'Matéria retirada do site e mantida como rascunho.')
    await loadQueue()
  }
  async function importDraft() {
    try {
      const draft = JSON.parse(importJson)
      const response = await fetch('/api/admin/articles', { method: 'POST', headers, body: JSON.stringify(draft) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível importar.')
      setImportOpen(false); setImportJson(''); await loadQueue(); await select(data.id)
      setMessage(data.existing ? 'A fonte já estava na fila; o artigo existente foi aberto.' : 'Rascunho da IA enviado para revisão humana.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'JSON inválido.') }
  }

  async function bulkAction(action: string) {
    const ids = [...selected]
    if (!ids.length) return
    setBulkLoading(true)
    setMessage(`Aplicando "${action}" em ${ids.length} item(ns)…`)
    try {
      const response = await fetch('/api/admin/bulk', { method: 'POST', headers, body: JSON.stringify({ ids, action }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha na operação.')
      const skippedReason = data.reason === 'complete_required'
        ? 'preencha os campos essenciais antes de marcar como pronto'
        : 'requerem status “pronto” e todos os campos essenciais preenchidos para publicar'
      const skipped = data.skipped ? ` (${data.skipped} ignorado(s) — ${skippedReason})` : ''
      setMessage(`✓ ${data.updated} atualizado(s)${skipped}.`)
      setSelected(new Set())
      await loadQueue()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro inesperado.')
    } finally { setBulkLoading(false) }
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  function toggleSelectAll() {
    setSelected(prev => {
      const next = new Set(prev)
      if (allFilteredSelected) filtered.forEach(item => next.delete(item.id))
      else filtered.forEach(item => next.add(item.id))
      return next
    })
  }
  const field = (key: keyof Editorial, label: string, help: string, rows = 5) => <label className="editorial-field"><span>{label}</span><small>{help}</small><textarea rows={rows} value={String(article[key] || '')} onChange={event => setArticle({ ...article, [key]: event.target.value })} /><em>{String(article[key] || '').trim().split(/\s+/).filter(Boolean).length} palavras</em></label>

  if (!token) return <main className="editorial-login"><form onSubmit={event => { event.preventDefault(); sessionStorage.setItem('radar:editorial-token', inputToken); setToken(inputToken) }}><img src="/logo-radar.png" alt="Radar Político" /><span className="editorial-login-kicker">Área restrita</span><h1>Mesa editorial</h1><p>Revise fontes, aprimore rascunhos e prepare conteúdos antes da publicação.</p><input type="password" value={inputToken} onChange={event => setInputToken(event.target.value)} placeholder="Token editorial" required /><button className="button yellow">Entrar no painel</button>{message && <small>{message}</small>}</form></main>

  return <div className="editorial-admin">
    <header><button className="editorial-brand" onClick={() => onNavigate('home')}><img src="/logo-radar.png" alt="Radar Político" /></button><div><span>Mesa editorial</span><small className={newsHealth?.lastError ? 'pipeline-health has-error' : 'pipeline-health'}>{newsHealth?.running ? '● Atualizando notícias…' : newsHealth?.lastError ? '● Falha no último ciclo' : `● Ciclo automático ativo · ${Math.round((newsHealth?.intervalMs || 900000) / 60000)} min`}</small><button className="editorial-import-trigger" onClick={() => setImportOpen(true)}>+ Importar rascunho IA</button><button onClick={() => { sessionStorage.removeItem('radar:editorial-token'); setToken('') }}>Sair</button></div></header>
    <section className="editorial-overview"><div><span>Fila total</span><strong>{items.length}</strong></div>{(['update','raw','draft','review','ready'] as const).map(status => <button key={status} className={filter === status ? 'active' : ''} onClick={() => setFilter(filter === status ? 'all' : status)}><span>{statusLabel[status]}</span><strong>{counts[status] || 0}</strong></button>)}</section>
    <main>
      <aside>
        <div className="queue-heading">
          <div><h1>Conteúdos</h1><p>{loading ? 'Atualizando…' : `${filtered.length} itens exibidos`}</p></div>
          <button onClick={loadQueue} aria-label="Atualizar fila">↻</button>
        </div>
        <input className="queue-search" type="search" placeholder="Buscar editorial, título, tema ou fonte" value={query} onChange={event => setQuery(event.target.value)} />
        <div className="queue-filters">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todos</button>
          {Object.keys(statusLabel).map(status => <button className={filter === status ? 'active' : ''} key={status} onClick={() => setFilter(status)}>{statusLabel[status]}</button>)}
        </div>
        <div className="queue-select-bar">
          <label className="queue-select-all">
            <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} />
            {selected.size > 0 ? `${selected.size} selecionado(s)` : 'Selecionar todos'}
          </label>
          {selected.size > 0 && (
            <div className="bulk-actions" aria-label="Ações em massa">
              <span className="bulk-count">{selected.size}</span>
              <button className="bulk-btn bulk-publish" disabled={bulkLoading} onClick={() => bulkAction('publish')} title="Publicar selecionados (requer status 'pronto')">↑ Publicar</button>
              <button className="bulk-btn bulk-unpublish" disabled={bulkLoading} onClick={() => bulkAction('unpublish')} title="Retirar do ar">↓ Retirar</button>
              <button className="bulk-btn bulk-ready" disabled={bulkLoading} onClick={() => bulkAction('ready')} title="Marcar como editorial pronto">✓ Marcar pronto</button>
              <select className="bulk-status-select" disabled={bulkLoading} defaultValue="" onChange={event => { if (event.target.value) { bulkAction(event.target.value); event.target.value = '' } }}>
                <option value="" disabled>Mudar status…</option>
                {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button className="bulk-clear" onClick={() => setSelected(new Set())}>✕</button>
            </div>
          )}
        </div>
        <div className="queue-list">
          {filtered.map(item => (
            <div key={item.id} className={`queue-item${article.id === item.id ? ' active' : ''}${selected.has(item.id) ? ' selected' : ''}`}>
              <label className="queue-checkbox" onClick={event => event.stopPropagation()}>
                <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} />
              </label>
              <button className="queue-item-content" onClick={() => select(item.id)}>
                <span><b>Editorial {item.id.padStart(3, '0')}</b>{item.category}{item.status === 'published' && <i className="queue-live">● No ar</i>}</span>
                <strong>{item.headline}</strong>
                <small>{item.source}</small>
                <em className={`status-${item.editorialStatus}`}>{statusLabel[item.editorialStatus] || item.editorialStatus}</em>
              </button>
            </div>
          ))}
        </div>
      </aside>

      <section className="editorial-workspace">{!article.id ? <div className="editorial-empty"><span>✦</span><h2>Selecione uma matéria</h2><p>Abra um item da fila ou importe um rascunho criado pela skill Radar Editorial.</p><button className="button yellow" onClick={() => setImportOpen(true)}>Importar rascunho IA</button></div> : <>
        <div className="editorial-toolbar"><div><span>Editorial {article.id.padStart(3, '0')} · {article.source}</span><h2>{article.sourceTitle}</h2><a href={article.sourceUrl} target="_blank" rel="noreferrer">Conferir fonte original ↗</a></div><div><label><span>Etapa</span><select value={article.editorialStatus} onChange={event => setArticle({ ...article, editorialStatus: event.target.value })}><option value="update">Atualizar</option><option value="raw">Conteúdo bruto</option><option value="draft">Rascunho</option><option value="review">Em revisão</option><option value="ready">Editorial pronto</option></select></label><button className="button yellow" onClick={save}>Salvar alterações</button></div></div>
        <div className={`publication-panel ${article.status === 'published' ? 'is-live' : 'is-offline'}`}><div className="publication-state"><i /><div><span>Status no site</span><strong>{article.status === 'published' ? 'Publicado no Radar' : 'Não publicado'}</strong><p>{article.status === 'published' ? `No ar${article.publishedAt ? ` desde ${new Date(article.publishedAt).toLocaleString('pt-BR')}` : ''}.` : 'Salvar a etapa editorial não publica o conteúdo automaticamente.'}</p></div></div><div className="publication-actions"><a href="/" target="_blank" rel="noreferrer">Abrir site do Radar ↗</a>{article.status === 'published' && <a className="article-live-link" href={`/noticias/${article.slug}`} target="_blank" rel="noreferrer">Conferir esta matéria ↗</a>}<button className={article.status === 'published' ? 'unpublish-button' : 'publish-button'} onClick={() => changePublication(article.status === 'published' ? 'unpublish' : 'publish')}>{article.status === 'published' ? 'Retirar do ar' : 'Publicar no Radar'}</button></div></div>
        <div className="editorial-progress"><div><span>Completude editorial</span><strong>{completeness}%</strong></div><i><b style={{ width: `${completeness}%` }} /></i><p>{completeness < 100 ? 'Complete os campos essenciais antes de marcar como pronto.' : 'Estrutura completa para revisão final.'}</p></div>
        <div className="source-excerpt"><span>Material de origem</span><p>{article.sourceDescription}</p></div>
        <div className="editorial-form"><section><div className="form-section-title"><span>01</span><div><h3>Enquadramento</h3><p>Defina a promessa editorial e os fatos centrais.</p></div></div><label className="editorial-field"><span>Título do Radar</span><small>Factual, específico e sem clickbait.</small><input value={article.headline} onChange={event => setArticle({ ...article, headline: event.target.value })} /></label>{field('summary','Resumo em 30 segundos','Síntese clara em até três frases.',3)}<label className="editorial-field"><span>Pontos essenciais</span><small>Um ponto verificável por linha.</small><textarea rows={5} value={article.keyPoints.join('\n')} onChange={event => setArticle({ ...article, keyPoints: event.target.value.split('\n').filter(Boolean) })} /></label></section><section><div className="form-section-title"><span>02</span><div><h3>Contexto e impacto</h3><p>Ajude o leitor a entender o que muda na prática.</p></div></div>{field('whatHappened','O que aconteceu','Relato verificado, com atores e decisões.')}{field('whyItMatters','Por que importa','Consequências institucionais, políticas ou sociais.')}{field('whoIsAffected','Quem é afetado','Públicos, territórios e instituições alcançados.')}</section><section><div className="form-section-title"><span>03</span><div><h3>Contraditório</h3><p>Registre argumentos e limites com atribuição.</p></div></div><div className="editorial-row">{field('argumentsFor','Argumentos favoráveis','Quem apoia e por quê.',4)}{field('argumentsAgainst','Argumentos contrários','Quem contesta e por quê.',4)}</div>{field('openQuestions','O que ainda não sabemos','Lacunas que exigem apuração adicional.',4)}</section><section><div className="form-section-title"><span>04</span><div><h3>Fechamento editorial</h3><p>Indique o que acompanhar e separe análise de fato.</p></div></div>{field('whatNext','O que acompanhar agora','Próximas etapas, prazos e responsáveis.',4)}{field('radarView','Visão do Radar','Análise editorial explicitamente identificada.',4)}<div className="editorial-row"><label className="editorial-field"><span>Autor</span><input value={article.authorName} onChange={event => setArticle({ ...article, authorName: event.target.value })} /></label><label className="editorial-field"><span>Revisado por</span><input value={article.reviewedBy} onChange={event => setArticle({ ...article, reviewedBy: event.target.value })} /></label></div></section></div>{message && <p className="editorial-message" role="status">{message}</p>}</>}
      </section>
    </main>
    {importOpen && <div className="editorial-import-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setImportOpen(false) }}><section className="editorial-import" role="dialog" aria-modal="true" aria-labelledby="import-title"><button className="editorial-import-close" onClick={() => setImportOpen(false)} aria-label="Fechar">×</button><span>Radar Editorial</span><h2 id="import-title">Importar rascunho da IA</h2><p>Cole o JSON produzido pela skill. O conteúdo entrará como rascunho em revisão e não será publicado automaticamente.</p><textarea rows={16} value={importJson} onChange={event => setImportJson(event.target.value)} placeholder={'{\n  "headline": "...",\n  "summary": "..."\n}'} /><div><button onClick={() => setImportOpen(false)}>Cancelar</button><button className="button yellow" onClick={importDraft} disabled={!importJson.trim()}>Enviar para revisão</button></div></section></div>}
  </div>
}
