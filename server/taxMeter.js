const SOURCE_URL = 'https://www.gov.br/receitafederal/dados/arrecadacao-estado.csv/@@download/file'
const SOURCE_PAGE = 'https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/dados-abertos/receitadata/arrecadacao'
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

// Snapshot oficial usado somente se a Receita estiver temporariamente indisponível.
const FALLBACK_2026 = [325751250550.94, 222117309569.57, 224621234299.72, 278822730883.34, 257052083252.86, 258770327540.21, 278142496235.13]

const number = value => Number(String(value || '').replace(',', '.')) || 0
const firstOrParts = (cells, total, ...parts) => number(cells[total]) || parts.reduce((sum, index) => sum + number(cells[index]), 0)

function rowTotal(cells) {
  const direct = [3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,30,31,33,34,35,36,37,38,39,40,44]
  return direct.reduce((sum, index) => sum + number(cells[index]), 0)
    + firstOrParts(cells, 21, 22, 23)
    + firstOrParts(cells, 24, 25, 26)
    + firstOrParts(cells, 27, 28, 29)
    + firstOrParts(cells, 41, 42, 43)
}

function buildResult(rows, fetchedAt, fallback = false) {
  const years = rows.map(row => Number(row[0])).filter(Boolean)
  const year = years.length ? Math.max(...years) : 2026
  const monthly = MONTHS.map((month, monthIndex) => ({
    month,
    monthIndex,
    value: rows.filter(row => Number(row[0]) === year && row[1] === month).reduce((sum, row) => sum + rowTotal(row), 0),
  })).filter(item => item.value > 0)
  const previous = MONTHS.map(month => rows.filter(row => Number(row[0]) === year - 1 && row[1] === month).reduce((sum, row) => sum + rowTotal(row), 0))
  const officialTotal = monthly.reduce((sum, item) => sum + item.value, 0)
  const closedThrough = monthly.at(-1)?.monthIndex ?? 0
  const closedDate = new Date(Date.UTC(year, closedThrough + 1, 0, 23, 59, 59))
  const dailyPace = officialTotal / Math.max(1, Math.round((closedDate - Date.UTC(year, 0, 1)) / 86400000) + 1)
  const now = new Date()
  const estimateUntil = now.getUTCFullYear() === year ? now : new Date(Date.UTC(year, 11, 31))
  const estimatedDays = Math.max(0, (estimateUntil - closedDate) / 86400000)
  const estimatedTotal = officialTotal + dailyPace * estimatedDays
  const previousComparable = previous.slice(0, monthly.length).reduce((sum, value) => sum + value, 0)

  return {
    scope: 'Arrecadação das Receitas Federais', year, officialTotal, estimatedTotal, dailyPace,
    lastClosedMonth: monthly.at(-1)?.month || 'Julho',
    monthly: monthly.map((item, index) => ({ ...item, previousValue: previous[index] || null })),
    variation: previousComparable ? (officialTotal / previousComparable - 1) * 100 : null,
    fetchedAt, fallback,
    source: { name: 'Receita Federal do Brasil', url: SOURCE_PAGE, downloadUrl: SOURCE_URL },
    methodology: 'O valor oficial soma a arrecadação federal publicada pela Receita até o último mês disponível. Depois desse fechamento, o contador é uma projeção linear baseada na média diária do próprio ano e não representa arrecadação em tempo real.',
  }
}

export async function loadTaxMeter() {
  try {
    const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(25_000), headers: { 'user-agent': 'RadarPolitico/1.0', accept: 'text/csv' } })
    if (!response.ok) throw new Error(`Receita respondeu ${response.status}`)
    const csv = new TextDecoder('windows-1252').decode(await response.arrayBuffer())
    const rows = csv.trim().split(/\r?\n/).slice(1).map(line => line.split(';'))
    return buildResult(rows, new Date().toISOString())
  } catch (error) {
    const rows = FALLBACK_2026.flatMap((value, index) => {
      const row = Array(45).fill('')
      row[0] = '2026'; row[1] = MONTHS[index]; row[2] = 'BR'; row[3] = String(value)
      return [row]
    })
    return { ...buildResult(rows, '2026-09-01T14:46:00-03:00', true), warning: error.message }
  }
}
