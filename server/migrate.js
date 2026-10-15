import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './db.js'

if (!pool) throw new Error('Defina DATABASE_URL antes de executar a migração.')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationsDir = path.join(root, 'database', 'migrations')
await pool.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())')
for (const name of (await fs.readdir(migrationsDir)).filter(name => name.endsWith('.sql')).sort()) {
  const exists = await pool.query('select 1 from schema_migrations where name=$1', [name])
  if (exists.rowCount) continue
  const sql = await fs.readFile(path.join(migrationsDir, name), 'utf8')
  const client = await pool.connect()
  try { await client.query('begin'); await client.query(sql); await client.query('insert into schema_migrations(name) values($1)', [name]); await client.query('commit'); console.log(`Aplicada: ${name}`) }
  catch (error) { await client.query('rollback'); throw error }
  finally { client.release() }
}
await pool.end()

