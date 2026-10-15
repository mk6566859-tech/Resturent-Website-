const jwt = require('jsonwebtoken')
const Manager = require('../models/Manager')

function verifyToken(req, res) {
  const header = req.get('authorization') || ''
  const [scheme, token] = header.split(' ')
  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ message: 'Sign in is required for this action.' })
    return null
  }
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'haden-restaurantos',
      audience: 'restaurant-admin',
    })
  } catch {
    res.status(401).json({ message: 'Your session is invalid or expired. Please sign in again.' })
    return null
  }
}

function requireAdmin(req, res, next) {
  const payload = verifyToken(req, res)
  if (!payload) return
  if (payload.role !== 'admin') return res.status(403).json({ message: 'Administrator access is required.' })
  req.admin = { email: payload.sub, role: 'admin' }
  return next()
}

async function requireStaff(req, res, next) {
  const payload = verifyToken(req, res)
  if (!payload) return
  if (payload.role === 'admin') {
    req.admin = { email: payload.sub, role: 'admin' }
    return next()
  }
  if (payload.role !== 'manager' || !payload.sub) {
    return res.status(403).json({ message: 'Restaurant staff access is required.' })
  }
  try {
    const manager = await Manager.findOne({ _id: payload.sub, active: true }).select('_id name email tokenVersion').lean()
    if (!manager || manager.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ message: 'Your staff account is inactive, changed, or no longer exists.' })
    }
    req.admin = { id: String(manager._id), email: manager.email, name: manager.name, role: 'manager' }
    return next()
  } catch (error) {
    return next(error)
  }
}

module.exports = { requireAdmin, requireStaff }
