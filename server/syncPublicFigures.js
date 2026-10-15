import 'dotenv/config'
import { pool } from './db.js'
import { syncPublicFigures } from './publicFigures.js'

try { console.log(JSON.stringify(await syncPublicFigures(), null, 2)) }
finally { await pool?.end() }
