import 'dotenv/config'
import fs from 'node:fs/promises'

const file = process.argv[2]
if (!file) throw new Error('Informe o caminho do arquivo JSON.')
if (!process.env.INGEST_TOKEN) throw new Error('INGEST_TOKEN não configurado.')

const draft = JSON.parse(await fs.readFile(file, 'utf8'))
const baseUrl = process.env.RADAR_API_URL || `http://127.0.0.1:${process.env.RADAR_PORT || process.env.PORT || 4000}`
const response = await fetch(`${baseUrl}/api/admin/articles`, {
  method: 'POST',
  headers: { authorization: `Bearer ${process.env.INGEST_TOKEN}`, 'content-type': 'application/json' },
  body: JSON.stringify(draft),
})
const result = await response.json()
if (!response.ok) throw new Error(result.error || `Falha HTTP ${response.status}`)
console.log(JSON.stringify(result, null, 2))
