const { Router } = require('express')
const bcrypt = require('bcryptjs')
const { z } = require('zod')
const Activity = require('../models/Activity')
const Manager = require('../models/Manager')
const { requireAdmin } = require('../middleware/auth')
const { validate } = require('../middleware/validate')

const router = Router()
const createManagerInput = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(150),
  password: z.string().min(12).max(200),
})
const updateManagerInput = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(150).optional(),
  password: z.string().min(12).max(200).optional(),
  active: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, 'At least one staff field is required.')

router.use(requireAdmin)

router.get('/', async (_req, res, next) => {
  try {
    const managers = await Manager.find().select('name email active createdAt updatedAt').sort({ name: 1 }).lean()
    return res.json(managers)
  } catch (error) {
    return next(error)
  }
})

router.post('/', validate(createManagerInput), async (req, res, next) => {
  try {
    const email = req.body.email.toLowerCase()
    if (email === process.env.ADMIN_EMAIL.toLowerCase()) {
      return res.status(409).json({ message: 'That email belongs to the restaurant administrator.' })
    }
    const passwordHash = await bcrypt.hash(req.body.password, 12)
    const manager = await Manager.create({ name: req.body.name, email, passwordHash })
    await Activity.create({
      actorId: req.admin.id || null,
      actorEmail: req.admin.email,
      actorRole: req.admin.role,
      action: 'manager.created',
      targetType: 'manager',
      targetId: String(manager._id),
      details: { email: manager.email },
    })
    return res.status(201).json({
      _id: manager._id,
      name: manager.name,
      email: manager.email,
      active: manager.active,
      createdAt: manager.createdAt,
      updatedAt: manager.updatedAt,
    })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A staff account with that email already exists.' })
    return next(error)
  }
})

router.patch('/:id', validate(updateManagerInput), async (req, res, next) => {
  try {
    const update = { ...req.body }
    if (update.email) {
      update.email = update.email.toLowerCase()
      if (update.email === process.env.ADMIN_EMAIL.toLowerCase()) {
        return res.status(409).json({ message: 'That email belongs to the restaurant administrator.' })
      }
    }
    if (update.password) {
      update.passwordHash = await bcrypt.hash(update.password, 12)
      update.$inc = { tokenVersion: 1 }
      delete update.password
    }
    const manager = await Manager.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).select('name email active createdAt updatedAt').lean()
    if (!manager) return res.status(404).json({ message: 'Staff account not found.' })
    await Activity.create({
      actorId: req.admin.id || null,
      actorEmail: req.admin.email,
      actorRole: req.admin.role,
      action: 'manager.updated',
      targetType: 'manager',
      targetId: String(manager._id),
      details: { fields: Object.keys(req.body), active: manager.active },
    })
    return res.json(manager)
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A staff account with that email already exists.' })
    return next(error)
  }
})

module.exports = router
