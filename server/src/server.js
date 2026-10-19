require('dotenv').config()
const dns = require('node:dns')

try {
  const dnsServers = (process.env.MONGODB_DNS_SERVERS || '8.8.8.8')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean)
  if (dnsServers.length > 0) {
    dns.setServers(dnsServers)
  }
} catch (dnsErr) {
  console.warn('Custom DNS setup skipped:', dnsErr?.message || dnsErr)
}

const mongoose = require('mongoose')
const app = require('./app')

const required = ['MONGODB_URI', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD_HASH', 'CLIENT_ORIGIN']
const missing = required.filter((name) => !process.env[name])
if (missing.length) {
  console.error(`⚠️ Missing required environment variables: ${missing.join(', ')}`)
  console.error('👉 Please configure these in Railway: Project -> Service -> Variables.')
}
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('⚠️ JWT_SECRET must be at least 32 characters long.')
}
if (process.env.ADMIN_PASSWORD_HASH && !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(process.env.ADMIN_PASSWORD_HASH)) {
  console.error('⚠️ ADMIN_PASSWORD_HASH must be a valid bcrypt hash.')
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
    return `MongoDB network connection failed${code ? ` (${code})` : ''}. In MongoDB Atlas -> Network Access, ensure 0.0.0.0/0 (Allow Access from Anywhere) is allowed for cloud hosts.`
  }
  return `MongoDB connection failed${error?.name ? ` (${error.name})` : ''}${code ? ` (${code})` : ''}.`
}

// Bind and listen to port immediately so Railway detects the live service
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Restaurant API listening on port ${port}`)
})

async function connectToMongo() {
  if (!process.env.MONGODB_URI) {
    console.error('⚠️ Cannot connect: MONGODB_URI environment variable is missing.')
    return
  }
  try {
    console.log('Connecting to MongoDB Atlas...')
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    })
    console.log('✅ MongoDB connected successfully')
  } catch (error) {
    console.error('❌ Could not connect to MongoDB:', describeMongoConnectionError(error))
  }
}

connectToMongo()

const shutdown = async () => {
  server.close(async () => {
    await mongoose.disconnect()
    process.exit(0)
  })
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
