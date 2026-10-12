import React, { useRef, useState } from 'react'

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
function Logo() { return <span className="logo"><span>Radar<span className="logo-signal">◢</span></span><small>POLÍTICO</small></span> }

type Article = { category: string; title: string; description: string; image: string; alt: string; paragraphs: string[] }
const news: Article[] = [
  { category: 'Congresso', title: 'Como uma proposta vira lei', description: 'Entenda as etapas que um projeto precisa percorrer até se tornar uma lei no Brasil.', image: 'chamber', alt: 'Ilustração do plenário do Congresso Nacional', paragraphs: ['Uma proposta de lei começa com a apresentação de um projeto. Deputados, senadores, o presidente da República e outros atores previstos na Constituição podem iniciar esse processo, conforme o assunto.', 'O texto passa pela análise das comissões, que examinam seu conteúdo e sua constitucionalidade. Dependendo do procedimento, pode ser votado nas próprias comissões ou seguir para o plenário.', 'Em geral, Câmara e Senado precisam aprovar o texto. Depois, ele segue para sanção ou veto do presidente. Emendas à Constituição e outras espécies de propostas têm regras próprias. Acompanhar cada etapa ajuda a distinguir uma ideia apresentada de uma lei em vigor.'] },
  { category: 'Legislativo', title: 'O papel das comissões no Congresso', description: 'Saiba como funcionam as comissões temáticas e por que elas são importantes no processo legislativo.', image: 'committee', alt: 'Ilustração de uma reunião de comissão legislativa', paragraphs: ['As comissões são grupos de parlamentares que examinam assuntos específicos, como educação, saúde e orçamento. Elas permitem uma análise mais detalhada das propostas antes da decisão final.', 'O relator estuda o texto e apresenta um parecer. As comissões também podem realizar audiências públicas e ouvir especialistas e representantes da sociedade.', 'Nem toda proposta precisa passar pelo plenário: algumas podem ser decididas nas comissões, conforme as regras de cada Casa e os recursos apresentados. Consulte sempre a tramitação oficial para entender a situação de cada projeto.'] },
  { category: 'Orçamento', title: 'Como acompanhar o orçamento público', description: 'Veja como o orçamento é construído, quais são suas etapas e como fiscalizar a sua execução.', image: 'budget', alt: 'Ilustração de um documento do Orçamento da União', paragraphs: ['O orçamento público define receitas estimadas e despesas autorizadas. No âmbito federal, o planejamento envolve o Plano Plurianual, a Lei de Diretrizes Orçamentárias e a Lei Orçamentária Anual.', 'A aprovação de uma despesa não significa que o dinheiro já foi gasto. Para acompanhar a execução, observe as etapas de empenho, liquidação e pagamento.', 'Compare os valores previstos e executados e consulte as informações do Portal da Transparência e do Siga Brasil. Contexto, período e fonte são essenciais para interpretar os números.'] },
]
const analyses: Article[] = [
  { category: 'Análise', title: 'Como interpretar uma votação', description: 'Entenda o que está por trás dos números, os diferentes tipos de votação e o que eles significam na prática.', image: 'congress-evening', alt: 'Ilustração do Congresso Nacional ao entardecer', paragraphs: ['Antes de interpretar o resultado, identifique o que estava sendo votado: o texto principal, uma emenda, um destaque ou uma questão de procedimento. Decisões distintas podem aparecer na mesma sessão.', 'Observe o tipo de votação, o quórum exigido e a presença dos parlamentares. Uma ausência não equivale automaticamente a um voto contrário, e uma abstenção é diferente de ambos.', 'Leia a proposta e o registro oficial da sessão. Esses documentos ajudam a relacionar o voto ao conteúdo efetivamente decidido.'] },
  { category: 'Análise', title: 'O que observar em um plano de governo', description: 'Veja os principais pontos para analisar propostas e identificar o que é viável e o que pode ser prioridade.', image: 'ballot', alt: 'Ilustração de uma urna eletrônica brasileira', paragraphs: ['Um plano de governo pode ser analisado pela clareza dos objetivos, pelos prazos e pela indicação de recursos. Promessas amplas ganham significado quando apresentam metas verificáveis.', 'Confira se a proposta está dentro das competências do cargo disputado. Muitas políticas dependem de outros poderes ou de cooperação entre municípios, estados e União.', 'Busque o documento oficial e compare os compromissos ao longo do tempo. O Radar Político propõe uma leitura do conteúdo, sem substituir sua avaliação.'] },
]
const topics: { title: string; description: string; icon: IconName; color: string }[] = [
  { title: 'Educação', description: 'Acompanhe propostas que tratam da educação no Brasil.', icon: 'book', color: 'blue' },
  { title: 'Saúde', description: 'Veja propostas sobre o sistema de saúde e acesso a serviços públicos.', icon: 'health', color: 'red' },
  { title: 'Segurança pública', description: 'Confira propostas voltadas à segurança e ao combate à violência.', icon: 'shield', color: 'green' },
]
const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const footerInfo: Record<string, string> = {
  'Sobre o Radar': 'O Radar Político é um projeto em construção para facilitar o entendimento da política brasileira e o acompanhamento da atuação pública. Esta primeira versão apresenta conteúdos educativos e a estrutura inicial do portal.',
  'Critérios editoriais': 'Os conteúdos buscam explicar processos políticos com clareza, contexto e respeito à pluralidade. Informações factuais devem ser verificadas em documentos e fontes oficiais antes da publicação.',
  'Fontes e metodologia': 'As bases previstas para o projeto incluem Câmara dos Deputados, Senado Federal, Tribunal Superior Eleitoral e Portal da Transparência. A integração com essas bases ainda não está disponível nesta versão. As imagens atuais são ilustrações provisórias.',
  'Correções': 'O canal de correções será disponibilizado quando o portal for publicado. Nesta etapa, comentários e ajustes podem ser encaminhados à equipe responsável pelo projeto.',
  'Contato': 'O canal de contato oficial do Radar Político ainda está em preparação. Os dados de contato serão publicados aqui quando estiverem disponíveis.',
  'Privacidade': 'Esta versão não envia nem armazena os dados dos formulários em um servidor. O cadastro de atualizações ainda não está conectado a um serviço de envio. A política completa será apresentada antes de ativar a coleta de dados.',
}

export default function Home() {
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
  function navigate(label: string, id: string) { setActive(label); setMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  function openModal(content: NonNullable<typeof modal>) { setModal(content); dialogRef.current?.showModal() }
  function articleModal(article: Article) { openModal({ title: article.title, paragraphs: article.paragraphs, image: article.image }) }
  function topicModal(title: string) { openModal({ title: `Propostas: ${title}`, paragraphs: [`Esta área reunirá propostas sobre ${title.toLocaleLowerCase('pt-BR')}, com autor, situação e histórico de tramitação.`, 'A integração com as bases oficiais está em preparação. Nenhum projeto ou resultado de votação é apresentado como dado real nesta versão.'] }) }
  const filteredNews = news.filter(article => `${article.title} ${article.description} ${article.category}`.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(newsSearch.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')))
  return <>
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <header className="site-header">
      <div className="header-inner container">
        <a className="brand" href="#conteudo" aria-label="Radar Político, início"><Logo /></a>
        <nav className={menu ? 'navigation open' : 'navigation'} aria-label="Navegação principal">
          {([['Notícias','noticias'],['Políticos','politicos'],['Propostas','propostas'],['Análises','analises']] as const).map(([label,id]) => <a key={id} href={`#${id}`} className={active === label ? 'active' : ''} onClick={event => { event.preventDefault(); navigate(label,id) }}>{label}</a>)}
        </nav>
        <div className="header-actions"><button className="header-search" aria-label="Buscar notícias" onClick={() => { setShowNewsSearch(true); navigate('Notícias','noticias'); setTimeout(() => searchInput.current?.focus(), 50) }}><Icon name="search" /></button><button className="mobile-menu" aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name={menu ? 'close' : 'menu'} /></button></div>
      </div>
    </header>
    <main id="conteudo" className="container">
      <section className="hero" aria-label="Em destaque">
        <button className="hero-story" onClick={() => openModal({ title: 'O que acompanhar no Congresso', image: 'congress', paragraphs: ['Acompanhar o Congresso começa pela agenda de votações, pelas reuniões de comissões e pela tramitação das propostas. Esses registros permitem entender o que está em discussão e o que já foi decidido.', 'Consulte a pauta da Câmara e do Senado, leia os textos dos projetos e acompanhe os pareceres. As agendas podem mudar: confira sempre a atualização nas fontes oficiais.', 'O Radar Político está preparando ferramentas para reunir esse acompanhamento em um só lugar. Enquanto isso, os guias abaixo ajudam a entender o processo legislativo.'] })}>
          <img className="hero-image" src="/images/congress.svg" alt="Ilustração do Congresso Nacional e seu espelho d’água" fetchPriority="high" />
          <span className="eyebrow">Em pauta</span><h1>O que acompanhar no Congresso</h1>
        </button>
        <aside className="politician-banner"><div className="ribbon" aria-hidden="true" /><h2>Conheça quem<br />representa você</h2><a className="button yellow" href="#politicos" onClick={() => setActive('Políticos')}>Explorar políticos <Icon name="arrow" /></a></aside>
      </section>
      <section className="quick-section" aria-labelledby="quick-title"><h2 id="quick-title">Acompanhe além do discurso</h2><div className="quick-grid">
        {([{ title: 'Propostas', icon: 'document', action: () => navigate('Propostas','propostas') }, { title: 'Votações', icon: 'chart', action: () => articleModal(analyses[0]) }, { title: 'Histórico', icon: 'person', action: () => { navigate('Políticos','politicos'); document.getElementById('politician-name')?.focus() } }] as { title: string; icon: IconName; action: () => void }[]).map(item => <button className="quick-card" key={item.title} onClick={item.action}><span className="icon-circle"><Icon name={item.icon} /></span><span className="quick-label">{item.title}</span><Icon name="arrow" /></button>)}
      </div></section>
      <section id="noticias" className="news-section" aria-labelledby="news-title"><div className="section-heading"><h2 id="news-title">Últimas notícias</h2><button className="text-link" onClick={() => { setShowNewsSearch(!showNewsSearch); setNewsSearch('') }}>{showNewsSearch ? 'Fechar busca' : 'Ver todas'}<Icon name="arrow" /></button></div>
        {showNewsSearch && <div className="news-search"><label htmlFor="news-query">Buscar nos conteúdos do Radar</label><div className="input-with-icon"><Icon name="search" /><input ref={searchInput} id="news-query" type="search" placeholder="Busque por assunto ou palavra-chave" value={newsSearch} onChange={event => setNewsSearch(event.target.value)} /></div><small>Conteúdos educativos desta primeira versão. O feed de notícias será integrado posteriormente.</small></div>}
        <div className="news-grid">{filteredNews.map(article => <button className="article-card" key={article.title} onClick={() => articleModal(article)}><img src={`/images/${article.image}.svg`} alt={article.alt} loading="lazy" /><span className="article-body"><span className="eyebrow">{article.category}</span><h3>{article.title}</h3><p>{article.description}</p></span></button>)}</div>
        {filteredNews.length === 0 && <p className="empty-state" role="status">Nenhum conteúdo encontrado. Tente outra palavra-chave.</p>}
      </section>
      <section id="politicos" className="politician-search" aria-labelledby="politician-title"><h2 id="politician-title">Encontre um político</h2><p>Consulte trajetória, propostas e atuação pública.</p><form className="politician-form" onSubmit={event => { event.preventDefault(); setSearchMessage(`A busca${name.trim() ? ` por “${name.trim()}”` : ''}${role ? ` para ${role.toLocaleLowerCase('pt-BR')}` : ''}${state ? ` em ${state}` : ''} estará disponível após a integração com os dados oficiais. Nenhum perfil foi consultado nesta versão.`) }}>
        <div className="input-with-icon"><Icon name="search" /><input id="politician-name" aria-label="Nome do político" placeholder="Nome do político" value={name} onChange={event => setName(event.target.value)} maxLength={100} /></div>
        <select aria-label="Cargo" value={role} onChange={event => setRole(event.target.value)}><option value="">Cargo</option><option>Deputado federal</option><option>Senador</option><option>Governador</option><option>Prefeito</option><option>Vereador</option></select>
        <select aria-label="Estado" value={state} onChange={event => setState(event.target.value)}><option value="">Estado</option>{states.map(uf => <option key={uf}>{uf}</option>)}</select><button className="button yellow" type="submit">Buscar</button>
      </form>{searchMessage && <p className="form-message" role="status">{searchMessage}</p>}</section>
      <section id="propostas" className="proposals-section" aria-labelledby="proposals-title"><h2 id="proposals-title">Propostas em acompanhamento</h2><div className="topic-grid">{topics.map(topic => <article className="topic-card" key={topic.title}><div className="topic-heading"><span className={`topic-icon ${topic.color}`}><Icon name={topic.icon} /></span><h3>{topic.title}</h3></div><p>{topic.description}</p><button className="text-link" onClick={() => topicModal(topic.title)}>Explorar propostas <Icon name="arrow" /></button></article>)}</div></section>
      <section id="analises" className="analysis-section" aria-labelledby="analysis-title"><h2 id="analysis-title">Análises e contexto</h2><div className="analysis-grid">{analyses.map(article => <button className="article-card" key={article.title} onClick={() => articleModal(article)}><img src={`/images/${article.image}.svg`} alt={article.alt} loading="lazy" /><span className="article-body"><span className="eyebrow">{article.category}</span><h3>{article.title}</h3><p>{article.description}</p></span></button>)}</div></section>
    </main>
    <section className="newsletter" aria-labelledby="newsletter-title"><div className="ribbon" aria-hidden="true" /><div className="container newsletter-inner"><h2 id="newsletter-title">Acompanhe os próximos<br />movimentos</h2><p>Receba análises, conteúdos e destaques sobre o cenário político.</p><form onSubmit={event => { event.preventDefault(); setEmailMessage('O cadastro de atualizações ainda está em preparação. Seu e-mail não foi enviado nem armazenado.') }}><div className="input-with-icon"><Icon name="mail" /><input type="email" aria-label="Seu e-mail" placeholder="Seu e-mail" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} /></div><button className="button yellow" type="submit">Receber atualizações</button></form>{emailMessage && <p className="newsletter-message" role="status">{emailMessage}</p>}</div></section>
    <footer className="site-footer"><div className="container footer-inner"><a className="brand" href="#conteudo" aria-label="Radar Político, início"><Logo /></a><nav aria-label="Informações institucionais">{Object.keys(footerInfo).map(label => <button key={label} onClick={() => openModal({ title: label, paragraphs: [footerInfo[label]] })}>{label}</button>)}</nav></div></footer>
    <dialog ref={dialogRef} className="content-dialog" onClick={event => { if (event.target === event.currentTarget) dialogRef.current?.close() }} aria-labelledby="dialog-title"><button className="dialog-close" aria-label="Fechar" onClick={() => dialogRef.current?.close()}><Icon name="close" /></button>{modal?.image && <img className="dialog-image" src={`/images/${modal.image}.svg`} alt="" />}<div className="dialog-body"><span className="eyebrow">Radar Político</span><h2 id="dialog-title">{modal?.title}</h2>{modal?.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<button className="button navy" onClick={() => dialogRef.current?.close()}>Voltar à página inicial</button></div></dialog>
  </>
}
