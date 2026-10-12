import React, { useEffect, useState } from 'react'
import Home from './pages/Home'
import Powers from './pages/Powers'
import Proposals from './pages/Proposals'
import Analyses from './pages/Analyses'
import NewsArticle from './pages/NewsArticle'

export type PageName = 'home' | 'powers' | 'proposals' | 'analyses' | 'newsArticle'

function pageFromPath(): PageName {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/poderes') return 'powers'
  if (path === '/propostas') return 'proposals'
  if (path.startsWith('/propostas/')) return 'proposals'
  if (path === '/analises') return 'analyses'
  if (path.startsWith('/analises/')) return 'analyses'
  if (path.startsWith('/noticias/')) return 'newsArticle'
  return 'home'
}

export default function App() {
  const [page, setPage] = useState<PageName>(pageFromPath)

  useEffect(() => {
    const handlePopState = () => setPage(pageFromPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function navigate(nextPage: PageName) {
    const path = nextPage === 'powers' ? '/poderes' : nextPage === 'proposals' ? '/propostas' : nextPage === 'analyses' ? '/analises' : '/'
    if (window.location.pathname !== path) window.history.pushState({}, '', path)
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (page === 'powers') return <Powers onNavigate={navigate} />
  if (page === 'proposals') return <Proposals onNavigate={navigate} />
  if (page === 'analyses') return <Analyses onNavigate={navigate} />
  if (page === 'newsArticle') return <NewsArticle onNavigate={navigate} />
  return <Home onNavigate={navigate} onOpenNews={id => { window.history.pushState({}, '', `/noticias/${encodeURIComponent(id)}`); setPage('newsArticle'); window.scrollTo({ top: 0 }) }} />
}
