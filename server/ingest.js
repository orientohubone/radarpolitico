import 'dotenv/config'
import { pool } from './db.js'
import { collectNews } from './newsSources.js'
import { ingestNews } from './newsRepository.js'
import { reconcileArticleImages } from './imageDedup.js'

const collected = await collectNews()
const result = await ingestNews(collected.items)
const images = await reconcileArticleImages()
console.log(JSON.stringify({ ...result, images, errors: collected.errors }, null, 2))
await pool?.end()
