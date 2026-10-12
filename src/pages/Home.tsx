import React from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

async function fetchPing() {
  const res = await axios.get('/api/ping')
  return res.data
}

export default function Home() {
  const { data, isLoading, error } = useQuery({ queryKey: ['ping'], queryFn: fetchPing })

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl p-8 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Radar Político</h1>
        {isLoading ? (
          <p>Carregando...</p>
        ) : error ? (
          <p role="alert">Erro: {error.message}</p>
        ) : (
          <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  )
}
