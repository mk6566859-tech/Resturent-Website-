const { Router } = require('express')
const { z } = require('zod')
const Activity = require('../models/Activity')
const BookingSettings = require('../models/BookingSettings')
const Reservation = require('../models/Reservation')
const Table = require('../models/Table')
const { requireAdmin, requireStaff } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const { activeStatuses, withBookingLock } = require('../lib/booking')

const router = Router()
const tableInput = z.object({
  label: z.string().trim().min(1).max(30),
  section: z.string().trim().min(1).max(60),
  capacity: z.coerce.number().int().min(1).max(30),
  combinationGroup: z.string().trim().max(60).optional().default(''),
  active: z.boolean().optional().default(true),
})
const tablePatch = tableInput.partial().refine((data) => Object.keys(data).length > 0, 'At least one table field is required.')
const bookingSettingsInput = z.object({
  slotIntervalMinutes: z.number().int().min(15).max(120).optional(),
  seatingDurationMinutes: z.number().int().min(30).max(360).optional(),
  advanceBookingDays: z.number().int().min(1).max(365).optional(),
  minimumPartySize: z.number().int().min(1).max(20).optional(),
  maximumPartySize: z.number().int().min(1).max(20).optional(),
  cancellationWindowHours: z.number().int().min(0).max(720).optional(),
  timezone: z.string().trim().min(1).max(100).refine((value) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value })
      return true
    } catch {
      return false
    }
  }, 'Timezone must be a valid IANA timezone.').optional(),
  openingHours: z.array(z.object({
    day: z.number().int().min(0).max(6),
    open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })).max(7).optional(),
  closures: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().trim().max(120).optional().default(''),
  })).max(100).optional(),
}).refine((data) => Object.keys(data).length > 0, 'At least one booking setting is required.')

router.get('/tables', requireStaff, async (_req, res, next) => {
  try {
    return res.json(await Table.find().sort({ section: 1, label: 1 }).lean())
  } catch (error) {
    return next(error)
  }
})

router.post('/tables', requireAdmin, validate(tableInput), async (req, res, next) => {
  try {
    const table = await withBookingLock(async (assertLock) => {
      assertLock()
      const created = await Table.create(req.body)
      return created
    })
    await Activity.create({
      actorId: req.admin.id || null,
      actorEmail: req.admin.email,
      actorRole: req.admin.role,
      action: 'table.created',
      targetType: 'table',
      targetId: String(table._id),
      details: { label: table.label, section: table.section, capacity: table.capacity },
    })
    return res.status(201).json(table)
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A table with that label already exists.' })
    return next(error)
  }
})

router.patch('/tables/:id', requireAdmin, validate(tablePatch), async (req, res, next) => {
  try {
    const table = await withBookingLock(async (assertLock) => {
      const existing = await Reservation.exists({
        tableIds: req.params.id,
        status: { $in: activeStatuses },
      })
      if (existing) {
        const error = new Error('This table is assigned to an active reservation and cannot be changed.')
        error.status = 409
        throw error
      }
      assertLock()
      const updated = await Table.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      })
      return updated
    })
    if (!table) return res.status(404).json({ message: 'Table not found.' })
    await Activity.create({
      actorId: req.admin.id || null,
      actorEmail: req.admin.email,
      actorRole: req.admin.role,
      action: 'table.updated',
      targetType: 'table',
      targetId: String(table._id),
      details: req.body,
    })
    return res.json(table)
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A table with that label already exists.' })
    return next(error)
  }
})

router.delete('/tables/:id', requireAdmin, async (req, res, next) => {
  try {
    const table = await withBookingLock(async (assertLock) => {
      const found = await Table.findById(req.params.id)
      if (!found) return null
      const existing = await Reservation.exists({
        tableIds: found._id,
        status: { $in: activeStatuses },
      })
      if (existing) {
        const error = new Error('This table is assigned to an active reservation.')
        error.status = 409
        throw error
      }
      assertLock()
      found.active = false
      await found.save()
      return found
    })
    if (!table) return res.status(404).json({ message: 'Table not found.' })
    await Activity.create({
      actorId: req.admin.id || null,
      actorEmail: req.admin.email,
      actorRole: req.admin.role,
      action: 'table.deactivated',
      targetType: 'table',
      targetId: String(table._id),
    })
    return res.status(204).end()
  } catch (error) {
    return next(error)
  }
})

router.get('/booking-settings', requireStaff, async (_req, res, next) => {
  try {
    return res.json(await BookingSettings.findById('default').lean() || {
      slotIntervalMinutes: 30,
      seatingDurationMinutes: 90,
      advanceBookingDays: 60,
      minimumPartySize: 1,
      maximumPartySize: 20,
      cancellationWindowHours: 0,
      timezone: 'Asia/Karachi',
      openingHours: [],
      closures: [],
    })
  } catch (error) {
    return next(error)
  }
})

router.patch('/booking-settings', requireAdmin, validate(bookingSettingsInput), async (req, res, next) => {
  try {
    const update = { ...req.body }
    if (
      update.minimumPartySize !== undefined &&
      update.maximumPartySize !== undefined &&
      update.minimumPartySize > update.maximumPartySize
    ) {
      return res.status(400).json({ message: 'Minimum party size cannot exceed maximum party size.' })
    }
    const current = await BookingSettings.findById('default').lean()
    const minimum = update.minimumPartySize ?? current?.minimumPartySize ?? 1
    const maximum = update.maximumPartySize ?? current?.maximumPartySize ?? 20
    if (minimum > maximum) return res.status(400).json({ message: 'Minimum party size cannot exceed maximum party size.' })
    for (const hours of update.openingHours || []) {
      if (hours.open >= hours.close) return res.status(400).json({ message: 'Opening time must be earlier than closing time.' })
    }
    if (update.openingHours) {
      const days = update.openingHours.map((hours) => hours.day)
      if (new Set(days).size !== days.length) return res.status(400).json({ message: 'Only one opening-hours entry is allowed per weekday.' })
    }
    const settings = await withBookingLock(async (assertLock) => {
      assertLock()
      const saved = await BookingSettings.findByIdAndUpdate(
        'default',
        { $set: update },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
      )
      return saved
    })
    await Activity.create({
      actorId: req.admin.id || null,
      actorEmail: req.admin.email,
      actorRole: req.admin.role,
      action: 'booking_settings.updated',
      targetType: 'booking_settings',
      targetId: 'default',
      details: Object.keys(update),
    })
    return res.json(settings)
  } catch (error) {
    return next(error)
  }
})

router.get('/activity', requireAdmin, async (req, res, next) => {
  try {
    const parsedLimit = Number(req.query.limit || 100)
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 500) {
      return res.status(400).json({ message: 'Activity limit must be between 1 and 500.' })
    }
    return res.json(await Activity.find().sort({ createdAt: -1 }).limit(parsedLimit).lean())
  } catch (error) {
    return next(error)
  }
})

module.exports = router
