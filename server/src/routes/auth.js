const { Router } = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { z } = require('zod')
const { rateLimit } = require('express-rate-limit')
const { validate } = require('../middleware/validate')
const Manager = require('../models/Manager')

const router = Router()
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again later.' },
})

router.post('/login', loginLimit, validate(z.object({
  email: z.string().email().max(150),
  password: z.string().min(1).max(200),
})), async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase()
    const isAdmin = email === process.env.ADMIN_EMAIL.toLowerCase()
    const manager = isAdmin ? null : await Manager.findOne({ email, active: true }).select('+passwordHash')
    const passwordHash = isAdmin ? process.env.ADMIN_PASSWORD_HASH : manager?.passwordHash
    const passwordMatches = passwordHash ? await bcrypt.compare(req.body.password, passwordHash) : false
    if ((!isAdmin && !manager) || !passwordMatches) {
      return res.status(401).json({ message: 'Email or password is incorrect.' })
    }
    const role = isAdmin ? 'admin' : 'manager'
    const token = jwt.sign({
      role,
      ...(manager ? { tokenVersion: manager.tokenVersion } : {}),
    }, process.env.JWT_SECRET, {
      subject: isAdmin ? process.env.ADMIN_EMAIL : String(manager._id),
      expiresIn: '8h',
      issuer: 'haden-restaurantos',
      audience: 'restaurant-admin',
    })
    return res.json({
      token,
      expiresIn: 28800,
      user: isAdmin
        ? { role, email: process.env.ADMIN_EMAIL }
        : { role, id: String(manager._id), name: manager.name, email: manager.email },
    })
  } catch (error) {
    return next(error)
  }
})

module.exports = router
