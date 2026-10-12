import express from 'express'

const app = express()
app.use(express.json())

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong', now: new Date().toISOString() })
})

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`API server running on http://localhost:${port}`))
