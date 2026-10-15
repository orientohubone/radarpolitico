import 'dotenv/config'
import { pool } from './db.js'
import { reconcileArticleImages } from './imageDedup.js'

console.log(JSON.stringify(await reconcileArticleImages(), null, 2))
await pool?.end()

