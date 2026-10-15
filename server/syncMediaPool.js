import 'dotenv/config'
import { pool } from './db.js'
import { syncCamaraMediaPool } from './imageDedup.js'

console.log(JSON.stringify(await syncCamaraMediaPool(), null, 2))
await pool?.end()
