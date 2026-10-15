const { Router } = require('express')
const { z } = require('zod')
const Category = require('../models/Category')
const { requireAdmin } = require('../middleware/auth')
const { validate } = require('../middleware/validate')

const router = Router()
router.get('/', async (_req, res, next) => {
  try { return res.json(await Category.find().sort({ name: 1 }).lean()) }
  catch (error) { return next(error) }
})
router.post('/', requireAdmin, validate(z.object({ name: z.string().trim().min(2).max(60) })), async (req, res, next) => {
  try { return res.status(201).json(await Category.create(req.body)) }
  catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'That category already exists.' })
    return next(error)
  }
})
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id)
    if (!category) return res.status(404).json({ message: 'Category not found.' })
    return res.status(204).end()
  } catch (error) { return next(error) }
})
module.exports = router
