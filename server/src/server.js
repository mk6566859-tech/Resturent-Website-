require('dotenv').config()
const dns = require('node:dns')

dns.setServers((process.env.MONGODB_DNS_SERVERS || '8.8.8.8').split(',').map((server) => server.trim()))

const mongoose = require('mongoose')
const app = require('./app')

const required = ['MONGODB_URI', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD_HASH', 'CLIENT_ORIGIN']
const missing = required.filter((name) => !process.env[name])
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`)
  process.exit(1)
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters long.')
  process.exit(1)
}
if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(process.env.ADMIN_PASSWORD_HASH)) {
  console.error('ADMIN_PASSWORD_HASH must be a valid bcrypt hash.')
  process.exit(1)
}

const port = Number(process.env.PORT || 5000)
function describeMongoConnectionError(error) {
  const message = typeof error?.message === 'string' ? error.message : ''
  const code = error?.code

  if (/query(?:Srv|Txt)/i.test(message) || ['ENOTFOUND', 'EAI_AGAIN'].includes(code)) {
    return `MongoDB DNS resolution failed${code ? ` (${code})` : ''}. Check MONGODB_DNS_SERVERS and DNS access.`
  }
  if (
    code === 18 ||
    error?.codeName === 'AuthenticationFailed' ||
    /authentication failed|bad auth/i.test(message)
  ) {
    return 'MongoDB authentication failed. Check the Atlas database user and authentication settings.'
  }
  if (
    ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH'].includes(code) ||
    /MongoNetwork|MongoServerSelection/.test(error?.name || '')
  ) {
    return `MongoDB network connection failed${code ? ` (${code})` : ''}. Check Atlas network access and outbound connectivity.`
  }
  return `MongoDB connection failed${error?.name ? ` (${error.name})` : ''}${code ? ` (${code})` : ''}.`
}

async function start() {
  console.log('Starting restaurant API...')
  console.log('Connecting to MongoDB...')
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  })
  console.log('MongoDB connected successfully')
  const server = app.listen(port, '0.0.0.0', () => console.log(`Restaurant API listening on port ${port}`))
  const shutdown = async () => {
    server.close(async () => {
      await mongoose.disconnect()
      process.exit(0)
    })
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch((error) => {
  console.error('Could not start the API:', describeMongoConnectionError(error))
  process.exit(1)
})
