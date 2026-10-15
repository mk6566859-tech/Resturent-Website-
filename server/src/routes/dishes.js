const { Router } = require('express')
const { z } = require('zod')
const Dish = require('../models/Dish')
const { requireAdmin } = require('../middleware/auth')
const { validate } = require('../middleware/validate')

const router = Router()
const isHttpUrl = (value) => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol) }
  catch { return false }
}
const httpUrl = z.string().url().refine(isHttpUrl, 'Image URL must use HTTP or HTTPS.')
const dishInput = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.string().trim().min(1).max(60),
  description: z.string().trim().min(3).max(300),
  price: z.number().finite().min(1).max(1000000),
  image: httpUrl.max(1000),
  available: z.boolean().default(true),
  featured: z.boolean().default(false),
})

router.get('/', async (_req, res, next) => {
  try { return res.json(await Dish.find().sort({ category: 1, name: 1 }).lean()) }
  catch (error) { return next(error) }
})

router.post('/', requireAdmin, validate(dishInput), async (req, res, next) => {
  try { return res.status(201).json(await Dish.create(req.body)) }
  catch (error) { return next(error) }
})

router.patch('/:id', requireAdmin, validate(dishInput.partial()), async (req, res, next) => {
  try {
    const dish = await Dish.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!dish) return res.status(404).json({ message: 'Dish not found.' })
    return res.json(dish)
  } catch (error) { return next(error) }
})

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const dish = await Dish.findByIdAndDelete(req.params.id)
    if (!dish) return res.status(404).json({ message: 'Dish not found.' })
    return res.status(204).end()
  } catch (error) { return next(error) }
})

module.exports = router
