const { Router } = require('express')
const { z } = require('zod')
const RestaurantSettings = require('../models/RestaurantSettings')
const { requireAdmin } = require('../middleware/auth')
const { validate } = require('../middleware/validate')

const router = Router()
const isHttpUrl = (value) => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol) }
  catch { return false }
}
const httpUrl = z.string().url().refine(isHttpUrl, 'URL must use HTTP or HTTPS.')
const settingsInput = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  logo: httpUrl.max(1000).or(z.literal('')).optional(),
  locationLabel: z.string().trim().max(100).optional(),
  address: z.string().trim().max(250).optional(),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  email: z.string().email().max(150).optional(),
  instagram: httpUrl.max(250).optional(),
  hours: z.array(z.object({ days: z.string().max(50), hours: z.string().max(50) })).max(14).optional(),
  palette: z.object({
    ink: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    panel: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    ivory: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    muted: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    copper: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }).optional(),
  hero: z.object({
    eyebrow: z.string().max(100).optional(),
    title: z.string().max(180).optional(),
    description: z.string().max(400).optional(),
    image: httpUrl.max(1000).optional(),
  }).optional(),
  offer: z.object({
    eyebrow: z.string().max(100).optional(),
    title: z.string().max(180).optional(),
    description: z.string().max(300).optional(),
  }).optional(),
  sections: z.object({
    signature: z.boolean().optional(),
    menu: z.boolean().optional(),
    story: z.boolean().optional(),
    offer: z.boolean().optional(),
    gallery: z.boolean().optional(),
    reservations: z.boolean().optional(),
    visit: z.boolean().optional(),
  }).optional(),
  images: z.object({
    story: httpUrl.max(1000).optional(),
    gallery: z.array(httpUrl.max(1000)).max(8).optional(),
  }).optional(),
})

router.get('/', async (_req, res, next) => {
  try {
    const settings = await RestaurantSettings.findById('default').lean()
    return res.json(settings || {})
  } catch (error) { return next(error) }
})
router.patch('/', requireAdmin, validate(settingsInput.refine((data) => Object.keys(data).length > 0, 'At least one setting is required.')), async (req, res, next) => {
  try {
    const update = {}
    for (const [key, value] of Object.entries(req.body)) {
      if (key === 'palette' || key === 'hero') {
        for (const [nestedKey, nestedValue] of Object.entries(value)) update[`${key}.${nestedKey}`] = nestedValue
      } else update[key] = value
    }
    const settings = await RestaurantSettings.findByIdAndUpdate('default', { $set: update }, {
      new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true,
    })
    return res.json(settings)
  } catch (error) { return next(error) }
})

module.exports = router
