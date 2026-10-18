const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { rateLimit } = require('express-rate-limit')
const authRoutes = require('./routes/auth')
const categoryRoutes = require('./routes/categories')
const dishRoutes = require('./routes/dishes')
const reservationRoutes = require('./routes/reservations')
const settingsRoutes = require('./routes/settings')
const staffRoutes = require('./routes/staff')
const operationsRoutes = require('./routes/operations')

const app = express()
app.disable('x-powered-by')
app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    const allowed = process.env.CLIENT_ORIGIN?.split(',').map((value) => value.trim()) || []
    if (!origin || allowed.includes(origin)) return callback(null, true)
    return callback(new Error('This origin is not allowed by the API CORS policy.'))
  },
}))
app.use(express.json({ limit: '20kb' }))
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }))
app.get('/', (_req, res) => res.json({
  name: 'Restaurant API',
  status: 'online',
  health: '/api/health',
  timestamp: new Date().toISOString()
}))
app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected' }))
app.use('/api/auth', authRoutes)
app.use('/api/dishes', dishRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/reservations', reservationRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/staff', staffRoutes)
app.use('/api/operations', operationsRoutes)
app.use((_req, res) => res.status(404).json({ message: 'API route not found.' }))
app.use((error, _req, res, _next) => {
  if (error.message.includes('CORS policy')) return res.status(403).json({ message: error.message })
  if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid resource identifier.' })
  if (error.name === 'ValidationError') return res.status(400).json({ message: 'Submitted data is invalid.' })
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 600) {
    return res.status(error.status).json({ message: error.message })
  }
  console.error(error)
  return res.status(500).json({ message: 'An unexpected server error occurred.' })
})

module.exports = app
