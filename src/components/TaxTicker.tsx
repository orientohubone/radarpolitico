import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

type TaxTickerData = { estimatedTotal: number; dailyPace: number; year: number; lastClosedMonth: string }
const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(value)

export default function TaxTicker({ onOpen }: { onOpen?: () => void }) {
  const { data } = useQuery<TaxTickerData>({
    queryKey: ['tax-meter'],
    queryFn: async () => { const response = await fetch('/api/tax-meter'); if (!response.ok) throw new Error(); return response.json() },
    staleTime: 5 * 60 * 1000,
  })
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!data) return
    const started = Date.now(); setValue(data.estimatedTotal)
    const timer = window.setInterval(() => setValue(data.estimatedTotal + (Date.now() - started) / 86400000 * data.dailyPace), 250)
    return () => window.clearInterval(timer)
  }, [data])

  return <button className="tax-ticker" onClick={onOpen} aria-label="Abrir o Impostômetro do Radar">
    <span className="tax-ticker-label"><i /> Impostômetro do Radar</span>
    <strong>{data ? money(value) : 'Carregando arrecadação…'}</strong>
    {data && <span className="tax-ticker-meta">Estimativa federal em {data.year} • oficial até {data.lastClosedMonth.toLocaleLowerCase('pt-BR')}</span>}
    <span className="tax-ticker-link">Ver painel <b aria-hidden="true">→</b></span>
  </button>
}
