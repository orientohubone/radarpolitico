export function loadLocalCache<T>(key: string): T | undefined {
  try {
    const value = localStorage.getItem(`radar:${key}`)
    return value ? JSON.parse(value) as T : undefined
  } catch { return undefined }
}

export async function fetchWithLocalCache<T>(url: string, key: string): Promise<T> {
  const isValid = (value: unknown): value is T => {
    if (!value || typeof value !== 'object') return false
    if (key === 'news-v6') return Array.isArray((value as { items?: unknown }).items) && (value as { items: unknown[] }).items.length > 0
    if (key === 'representatives-v6') {
      const items = (value as { items?: unknown }).items
      return Array.isArray(items) && items.length > 0 && items.every(item => {
        if (!item || typeof item !== 'object') return false
        const profile = item as { name?: unknown; institution?: unknown; role?: unknown }
        return typeof profile.name === 'string' && typeof profile.institution === 'string' && typeof profile.role === 'string'
      })
    }
    return true
  }

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) throw new Error('Resposta da API não é JSON')
    const data = await response.json() as T
    if (!isValid(data)) throw new Error('Resposta da API sem conteúdo válido')
    localStorage.setItem(`radar:${key}`, JSON.stringify(data))
    return data
  } catch (error) {
    const cached = loadLocalCache<T>(key)
    if (cached && isValid(cached)) return cached
    if (key === 'news-v6') {
      const snapshotResponse = await fetch('/data/news.json')
      if (snapshotResponse.ok) {
        const snapshot = await snapshotResponse.json() as T
        if (isValid(snapshot)) {
          localStorage.setItem(`radar:${key}`, JSON.stringify(snapshot))
          return snapshot
        }
      }
    }
    throw error
  }
}
