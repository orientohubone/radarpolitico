import React, { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchWithLocalCache, loadLocalCache } from '../lib/apiCache'
import TaxTicker from '../components/TaxTicker'
import DossiersMenu from '../components/DossiersMenu'

type IconName = 'arrow' | 'search' | 'document' | 'chart' | 'person' | 'book' | 'health' | 'shield' | 'mail' | 'close' | 'menu'
function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M4 12h16M14 6l6 6-6 6" /></>,
    search: <><circle cx="10.5" cy="10.5" r="7" /><path d="m16 16 5 5" /></>,
    document: <><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 11h7M9 15h7M9 18h4" /></>,
    chart: <><path d="M4 14h3v7H4zM10 8h3v13h-3zM16 3h3v18h-3z" fill="currentColor" stroke="none" /></>,
    person: <><circle cx="12" cy="7" r="4" /><path d="M4 21v-3a8 8 0 0 1 16 0v3z" /></>,
    book: <><path d="M12 5v16M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-1-6-2-10 1Z" /></>,
    health: <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" />,
    shield: <path d="M12 2c3 3 6 4 9 4v6c0 5-4 8-9 10-5-2-9-5-9-10V6c3 0 6-1 9-4Z" />,
    mail: <><rect x="2" y="4" width="20" height="16" rx="1" /><path d="m2 5 10 8L22 5" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  }
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function Logo({ size = 'normal' }: { size?: 'normal' | 'small' }) {
  return (
    <img
      src="/logo-radar.png"
      alt="Radar Político"
      className={size === 'small' ? 'logo-img logo-img--small' : 'logo-img'}
    />
  )
}

type Article = { category: string; title: string; description: string; image: string; alt: string; paragraphs: string[] }
type LiveNews = { id: string; slug: string; category: string; title: string; description: string; image: string; url: string; publishedAt: string; source: string }
const newsFallbackImages = [
  '/images/chamber.jpg', '/images/committee.jpg', '/images/budget.jpg', '/images/congress-evening.jpg', '/images/congress.jpg',
]
const genericImagePatterns = ['imagem-padrao', 'imagem_padrao', 'default', 'placeholder', 'logo-compartilhamento']
const proxiedImage = (url: string) => url.startsWith('http') ? `/api/image?url=${encodeURIComponent(url)}` : url
function cardText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  const preview = normalized.slice(0, maxLength + 1)
  const punctuation = Math.max(preview.lastIndexOf('.'), preview.lastIndexOf('!'), preview.lastIndexOf('?'), preview.lastIndexOf(';'))
  const boundary = punctuation >= maxLength * .65 ? punctuation + 1 : preview.lastIndexOf(' ')
  return `${preview.slice(0, boundary > 0 ? boundary : maxLength).replace(/[,:;.!?\s]+$/, '')}…`
}
function cardDescription(article: LiveNews) {
  const description = article.description.replace(/\s+/g, ' ').trim()
  if (description && !/^leia a notícia completa na fonte oficial/i.test(description)) return description
  return `${article.title.replace(/[.!?]+$/, '')}. Confira os principais pontos e os próximos passos.`
}
const news: Article[] = [
  { category: 'Congresso', title: 'Como uma proposta vira lei', description: 'Entenda as etapas que um projeto precisa percorrer até se tornar uma lei no Brasil.', image: 'chamber', alt: 'Plenário do Congresso Nacional em sessão', paragraphs: ['Uma proposta de lei começa com a apresentação de um projeto. Deputados, senadores, o presidente da República e outros atores previstos na Constituição podem iniciar esse processo, conforme o assunto.', 'O texto passa pela análise das comissões, que examinam seu conteúdo e sua constitucionalidade. Dependendo do procedimento, pode ser votado nas próprias comissões ou seguir para o plenário.', 'Em geral, Câmara e Senado precisam aprovar o texto. Depois, ele segue para sanção ou veto do presidente. Emendas à Constituição e outras espécies de propostas têm regras próprias. Acompanhar cada etapa ajuda a distinguir uma ideia apresentada de uma lei em vigor.'] },
  { category: 'Legislativo', title: 'O papel das comissões no Congresso', description: 'Saiba como funcionam as comissões temáticas e por que elas são importantes no processo legislativo.', image: 'committee', alt: 'Reunião de comissão legislativa no Congresso', paragraphs: ['As comissões são grupos de parlamentares que examinam assuntos específicos, como educação, saúde e orçamento. Elas permitem uma análise mais detalhada das propostas antes da decisão final.', 'O relator estuda o texto e apresenta um parecer. As comissões também podem realizar audiências públicas e ouvir especialistas e representantes da sociedade.', 'Nem toda proposta precisa passar pelo plenário: algumas podem ser decididas nas comissões, conforme as regras de cada Casa e os recursos apresentados. Consulte sempre a tramitação oficial para entender a situação de cada projeto.'] },
  { category: 'Orçamento', title: 'Como acompanhar o orçamento público', description: 'Veja como o orçamento é construído, quais são suas etapas e como fiscalizar a sua execução.', image: 'budget', alt: 'Documento do Orçamento da União', paragraphs: ['O orçamento público define receitas estimadas e despesas autorizadas. No âmbito federal, o planejamento envolve o Plano Plurianual, a Lei de Diretrizes Orçamentárias e a Lei Orçamentária Anual.', 'A aprovação de uma despesa não significa que o dinheiro já foi gasto. Para acompanhar a execução, observe as etapas de empenho, liquidação e pagamento.', 'Compare os valores previstos e executados e consulte as informações do Portal da Transparência e do Siga Brasil. Contexto, período e fonte são essenciais para interpretar os números.'] },
]
const analyses: Article[] = [
  { category: 'Análise', title: 'Como interpretar uma votação', description: 'Entenda o que está por trás dos números, os diferentes tipos de votação e o que eles significam na prática.', image: 'congress-evening', alt: 'Congresso Nacional ao entardecer', paragraphs: ['Antes de interpretar o resultado, identifique o que estava sendo votado: o texto principal, uma emenda, um destaque ou uma questão de procedimento. Decisões distintas podem aparecer na mesma sessão.', 'Observe o tipo de votação, o quórum exigido e a presença dos parlamentares. Uma ausência não equivale automaticamente a um voto contrário, e uma abstenção é diferente de ambos.', 'Leia a proposta e o registro oficial da sessão. Esses documentos ajudam a relacionar o voto ao conteúdo efetivamente decidido.'] },
  { category: 'Análise', title: 'O que observar em um plano de governo', description: 'Veja os principais pontos para analisar propostas e identificar o que é viável e o que pode ser prioridade.', image: 'committee', alt: 'Reunião de trabalho parlamentar', paragraphs: ['Um plano de governo pode ser analisado pela clareza dos objetivos, pelos prazos e pela indicação de recursos. Promessas amplas ganham significado quando apresentam metas verificáveis.', 'Confira se a proposta está dentro das competências do cargo disputado. Muitas políticas dependem de outros poderes ou de cooperação entre municípios, estados e União.', 'Busque o documento oficial e compare os compromissos ao longo do tempo. O Radar Político propõe uma leitura do conteúdo, sem substituir sua avaliação.'] },
]
const topics: { title: string; description: string; icon: IconName; color: string }[] = [
  { title: 'Educação', description: 'Acompanhe propostas que tratam da educação no Brasil.', icon: 'book', color: 'blue' },
  { title: 'Saúde', description: 'Veja propostas sobre o sistema de saúde e acesso a serviços públicos.', icon: 'health', color: 'red' },
  { title: 'Segurança pública', description: 'Confira propostas voltadas à segurança e ao combate à violência.', icon: 'shield', color: 'green' },
]
const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const footerLinks = ['Sobre o Radar', 'Critérios editoriais', 'Fontes e metodologia', 'Correções', 'Contato', 'Privacidade']
const footerInfo: Record<string, string> = {
  'Sobre o Radar': 'O Radar Político facilita o acompanhamento da política brasileira reunindo notícias e dados consultados em fontes públicas identificadas.',
  'Critérios editoriais': 'Os conteúdos buscam explicar processos políticos com clareza, contexto e respeito à pluralidade. Informações factuais devem ser verificadas em documentos e fontes oficiais antes da publicação.',
  'Fontes e metodologia': 'As notícias são consultadas na Agência Brasil, Agência Câmara e Agência Senado. Propostas e representantes são obtidos dos Dados Abertos da Câmara. Cada item mantém indicação e link para a fonte original.',
  'Correções': 'O canal de correções será disponibilizado quando o portal for publicado. Nesta etapa, comentários e ajustes podem ser encaminhados à equipe responsável pelo projeto.',
  'Contato': 'O canal de contato oficial do Radar Político ainda está em preparação. Os dados de contato serão publicados aqui quando estiverem disponíveis.',
  'Privacidade': 'Esta versão não envia nem armazena os dados dos formulários em um servidor. O cadastro de atualizações ainda não está conectado a um serviço de envio. A política completa será apresentada antes de ativar a coleta de dados.',
}

export default function Home({ onNavigate, onOpenNews }: { onNavigate?: (page: 'home' | 'powers' | 'proposals' | 'analyses' | 'taxMeter') => void; onOpenNews?: (slug: string) => void }) {
  const [active, setActive] = useState('Notícias')
  const [menu, setMenu] = useState(false)
  const [modal, setModal] = useState<{ title: string; paragraphs: string[]; image?: string } | null>(null)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [state, setState] = useState('')
  const [searchMessage, setSearchMessage] = useState('')
  const [email, setEmail] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [newsSearch, setNewsSearch] = useState('')
  const [showNewsSearch, setShowNewsSearch] = useState(false)
  const searchInput = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const { data: liveNewsData, isLoading: newsLoading, isError: newsError } = useQuery<{ items: LiveNews[]; updatedAt: string }>({ queryKey: ['live-news-v9'], queryFn: () => fetchWithLocalCache('/api/news', 'news-v9'), initialData: () => loadLocalCache('news-v9'), staleTime: 5 * 60 * 1000, refetchInterval: 5 * 60 * 1000, retry: 2 })
  function navigate(label: string, id: string) { setActive(label); setMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  function openModal(content: NonNullable<typeof modal>) { setModal(content); dialogRef.current?.showModal() }
  function articleModal(article: Article) { openModal({ title: article.title, paragraphs: article.paragraphs, image: article.image }) }
  function topicModal(_title: string) { onNavigate?.('proposals') }
  const liveNews = liveNewsData?.items || []
  const heroNews = liveNews.find(article => /(?:escala\s*)?6\s*x\s*1/i.test(article.title)) || liveNews[0]
  const displayNews: LiveNews[] = liveNews.filter(article => article.id !== heroNews?.id).slice(0, 12)
  const filteredNews = displayNews.filter(article => `${article.title} ${article.description} ${article.category}`.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(newsSearch.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')))
  const usedImages = new Set(heroNews?.image ? [heroNews.image] : [])
  let fallbackCursor = 0
  const visualNews = filteredNews.map((article, index) => {
    const normalizedImage = article.image?.toLocaleLowerCase('pt-BR') || ''
    const remoteIsUsable = Boolean(normalizedImage) && !genericImagePatterns.some(pattern => normalizedImage.includes(pattern)) && !usedImages.has(article.image)
    const image = remoteIsUsable ? article.image : newsFallbackImages[fallbackCursor++ % newsFallbackImages.length]
    usedImages.add(image)
    return {
      ...article,
      cardTitle: cardText(article.title, 96),
      cardDescription: cardText(cardDescription(article), 160),
      visualImage: image,
      fallbackImage: newsFallbackImages[index % newsFallbackImages.length],
    }
  })
  return <>
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <header className="site-header home-header-with-ticker">
      <TaxTicker onOpen={() => onNavigate?.('taxMeter')} />
      <div className="header-inner container">
        <a className="brand" href="#conteudo" aria-label="Radar Político, início"><Logo /></a>
        <nav className={menu ? 'navigation open' : 'navigation'} aria-label="Navegação principal">
          {(['Notícias', 'Poderes', 'Propostas', 'Análises'] as const).map((label) => {
            const id = label === 'Notícias' ? 'noticias' : label === 'Poderes' ? 'poderes' : label === 'Propostas' ? 'propostas' : 'analises'
            const href = label === 'Poderes' ? '/poderes' : label === 'Propostas' ? '/propostas' : label === 'Análises' ? '/analises' : `#${id}`
            return <a key={id} href={href} className={active === label ? 'active' : ''} onClick={e => { e.preventDefault(); label === 'Poderes' ? onNavigate?.('powers') : label === 'Propostas' ? onNavigate?.('proposals') : label === 'Análises' ? onNavigate?.('analyses') : navigate(label, id) }}>{label}</a>
          })}
          <DossiersMenu />
          <a href="/impostometro" className={active === 'Impostômetro' ? 'active' : ''} onClick={e => { e.preventDefault(); onNavigate?.('taxMeter') }}>Impostômetro</a>
        </nav>
        <div className="header-actions">
          <button className="header-search" aria-label="Buscar notícias" onClick={() => { setShowNewsSearch(true); navigate('Notícias', 'noticias'); setTimeout(() => searchInput.current?.focus(), 50) }}><Icon name="search" /></button>
          <button className="mobile-menu" aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name={menu ? 'close' : 'menu'} /></button>
        </div>
      </div>
    </header>

    <main id="conteudo" className="main-content">
      {/* HERO */}
      <section className="hero" aria-label="Em destaque">
        <div className="hero-inner">
          <button className="hero-story" disabled={!heroNews} onClick={() => heroNews && onOpenNews?.(heroNews.slug)}>
            <img className="hero-image" src={heroNews?.image ? proxiedImage(heroNews.image) : '/images/congress.jpg'} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/congress.jpg' }} alt={heroNews?.title || 'Congresso Nacional de Brasília e espelho d’água'} fetchPriority="high" />
            <div className="hero-caption">
              <span className="eyebrow">{heroNews ? heroNews.category : 'Atualização'}</span>
              <h1>{heroNews?.title || (newsLoading ? 'Consultando fontes oficiais…' : 'Notícias temporariamente indisponíveis')}</h1>
            </div>
          </button>
          <aside className="politician-banner">
            <img className="brand-element brand-element--card" src="/elemento-radar.png" alt="" aria-hidden="true" />
            <h2>Conheça quem<br />representa você</h2>
            <a className="button yellow" href="/poderes" onClick={e => { e.preventDefault(); onNavigate?.('powers') }}>Explorar poderes <Icon name="arrow" /></a>
          </aside>
        </div>
      </section>

      {/* QUICK ACCESS */}
      <section className="quick-section" aria-labelledby="quick-title">
          <h2 id="quick-title">Acompanhe além do discurso</h2>
          <div className="quick-grid">
            {([
              { title: 'Propostas', icon: 'document' as IconName, action: () => onNavigate?.('proposals') },
              { title: 'Votações', icon: 'chart' as IconName, action: () => articleModal(analyses[0]) },
              { title: 'Histórico', icon: 'person' as IconName, action: () => { navigate('Políticos', 'politicos'); document.getElementById('politician-name')?.focus() } },
            ]).map(item => (
              <button className="quick-card" key={item.title} onClick={item.action}>
                <span className="icon-circle"><Icon name={item.icon} /></span>
                <span className="quick-label">{item.title}</span>
                <Icon name="arrow" />
              </button>
            ))}
          </div>
      </section>

      {/* NEWS */}
      <section id="noticias" className="news-section" aria-labelledby="news-title">
          <div className="section-heading">
            <h2 id="news-title">Últimas notícias</h2>
            <button className="text-link" onClick={() => { setShowNewsSearch(!showNewsSearch); setNewsSearch('') }}>
              {showNewsSearch ? 'Fechar busca' : 'Ver todas'}<Icon name="arrow" />
            </button>
          </div>
          {showNewsSearch && (
            <div className="news-search">
              <label htmlFor="news-query">Buscar nos conteúdos do Radar</label>
              <div className="input-with-icon">
                <Icon name="search" />
                <input ref={searchInput} id="news-query" type="search" placeholder="Busque por assunto ou palavra-chave" value={newsSearch} onChange={e => setNewsSearch(e.target.value)} />
              </div>
              <small>Resultados publicados pelas fontes oficiais identificadas em cada card.</small>
            </div>
          )}
          {newsLoading && <p className="news-status" role="status">Consultando as fontes oficiais…</p>}
          {newsError && <p className="empty-state" role="alert">Não foi possível consultar as fontes agora. Tente novamente em alguns minutos.</p>}
          <div className="news-grid">
            {visualNews.map((article) => (
              <button className="article-card" key={article.id} onClick={() => onOpenNews?.(article.slug)}>
                <img src={proxiedImage(article.visualImage)} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = article.fallbackImage }} alt={article.title} loading="lazy" />
                <span className="article-body">
                  <span className="eyebrow">{article.category}</span>
                  <h3>{article.cardTitle}</h3>
                  <p>{article.cardDescription}</p>
                  {article.publishedAt && <time className="news-date" dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleDateString('pt-BR')}</time>}
                </span>
              </button>
            ))}
          </div>
          {visualNews.length === 0 && <p className="empty-state" role="status">Nenhum conteúdo encontrado. Tente outra palavra-chave.</p>}
      </section>

      {/* POLITICIAN SEARCH */}
      <section id="politicos" className="politician-search" aria-labelledby="politician-title">
          <h2 id="politician-title">Encontre um político</h2>
          <p>Consulte trajetória, propostas e atuação pública.</p>
          <form className="politician-form" onSubmit={e => { e.preventDefault(); setSearchMessage(`A busca${name.trim() ? ` por "${name.trim()}"` : ''}${role ? ` para ${role.toLocaleLowerCase('pt-BR')}` : ''}${state ? ` em ${state}` : ''} estará disponível após a integração com os dados oficiais. Nenhum perfil foi consultado nesta versão.`) }}>
            <div className="input-with-icon">
              <Icon name="search" />
              <input id="politician-name" aria-label="Nome do político" placeholder="Nome do político" value={name} onChange={e => setName(e.target.value)} maxLength={100} />
            </div>
            <select aria-label="Cargo" value={role} onChange={e => setRole(e.target.value)}>
              <option value="">Cargo</option>
              <option>Deputado federal</option>
              <option>Senador</option>
              <option>Governador</option>
              <option>Prefeito</option>
              <option>Vereador</option>
            </select>
            <select aria-label="Estado" value={state} onChange={e => setState(e.target.value)}>
              <option value="">Estado</option>
              {states.map(uf => <option key={uf}>{uf}</option>)}
            </select>
            <button className="button yellow" type="submit">Buscar</button>
          </form>
          {searchMessage && <p className="form-message" role="status">{searchMessage}</p>}
      </section>

      {/* PROPOSALS */}
      <section id="propostas" className="proposals-section" aria-labelledby="proposals-title">
          <h2 id="proposals-title">Propostas em acompanhamento</h2>
          <div className="topic-grid">
            {topics.map(topic => (
              <article className="topic-card" key={topic.title}>
                <div className="topic-heading">
                  <span className={`topic-icon ${topic.color}`}><Icon name={topic.icon} /></span>
                  <h3>{topic.title}</h3>
                </div>
                <p>{topic.description}</p>
                <button className="text-link" onClick={() => topicModal(topic.title)}>Explorar propostas <Icon name="arrow" /></button>
              </article>
            ))}
          </div>
      </section>

      {/* ANALYSES */}
      <section id="analises" className="analysis-section" aria-labelledby="analysis-title">
          <h2 id="analysis-title">Análises e contexto</h2>
          <div className="analysis-grid">
            {analyses.map(article => (
              <button className="article-card" key={article.title} onClick={() => articleModal(article)}>
                <img src={`/images/${article.image}.jpg`} alt={article.alt} loading="lazy" />
                <span className="article-body">
                  <span className="eyebrow">{article.category}</span>
                  <h3>{article.title}</h3>
                  <p>{article.description}</p>
                </span>
              </button>
            ))}
          </div>
      </section>
    </main>

    {/* NEWSLETTER */}
    <section className="newsletter" aria-labelledby="newsletter-title">
      <img className="brand-element brand-element--newsletter" src="/elemento-radar.png" alt="" aria-hidden="true" />
      <div className="newsletter-inner">
        <h2 id="newsletter-title">Acompanhe os próximos<br />movimentos</h2>
        <p>Receba análises, conteúdos e destaques sobre o cenário político.</p>
        <form onSubmit={e => { e.preventDefault(); setEmailMessage('O cadastro de atualizações ainda está em preparação. Seu e-mail não foi enviado nem armazenado.') }}>
          <div className="input-with-icon">
            <Icon name="mail" />
            <input type="email" aria-label="Seu e-mail" placeholder="Seu e-mail" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} />
          </div>
          <button className="button yellow" type="submit">Receber atualizações</button>
        </form>
        {emailMessage && <p className="newsletter-message" role="status">{emailMessage}</p>}
      </div>
    </section>

    {/* FOOTER */}
    <footer className="site-footer">
      <div className="footer-inner">
        <a className="brand" href="#conteudo" aria-label="Radar Político, início"><Logo size="small" /></a>
        <nav aria-label="Informações institucionais">
          {footerLinks.map(label => (
            <button key={label} onClick={() => openModal({ title: label, paragraphs: [footerInfo[label]] })}>{label}</button>
          ))}
        </nav>
      </div>
    </footer>

    {/* MODAL */}
    <dialog ref={dialogRef} className="content-dialog" onClick={e => { if (e.target === e.currentTarget) dialogRef.current?.close() }} aria-labelledby="dialog-title">
      <button className="dialog-close" aria-label="Fechar" onClick={() => dialogRef.current?.close()}><Icon name="close" /></button>
      {modal?.image && <img className="dialog-image" src={`/images/${modal.image}.jpg`} alt="" />}
      <div className="dialog-body">
        <span className="eyebrow">Radar Político</span>
        <h2 id="dialog-title">{modal?.title}</h2>
        {modal?.paragraphs.map(p => <p key={p}>{p}</p>)}
        <button className="button navy" onClick={() => dialogRef.current?.close()}>Voltar à página inicial</button>
      </div>
    </dialog>
  </>
}
