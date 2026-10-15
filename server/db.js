import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

export const databaseEnabled = Boolean(process.env.DATABASE_URL)
const connectionString = process.env.DATABASE_URL?.replace(/([?&])sslmode=require(?=&|$)/, '$1sslmode=verify-full')

export const pool = databaseEnabled
  ? new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_SIZE || 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: process.env.NODE_ENV === 'development' && process.env.DATABASE_SSL === 'false'
        ? false
        : { rejectUnauthorized: false },
    })
  : null

export async function query(text, values = []) {
  if (!pool) throw new Error('DATABASE_URL não configurada')
  return pool.query(text, values)
}

export async function withTransaction(callback) {
  if (!pool) throw new Error('DATABASE_URL não configurada')
  const client = await pool.connect()
  try {
    await client.query('begin')
    const result = await callback(client)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}
