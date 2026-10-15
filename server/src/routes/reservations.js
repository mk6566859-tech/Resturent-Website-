const { Router } = require('express')
const { z } = require('zod')
const Activity = require('../models/Activity')
const BookingSettings = require('../models/BookingSettings')
const Reservation = require('../models/Reservation')
const Table = require('../models/Table')
const WaitlistEntry = require('../models/WaitlistEntry')
const { requireStaff } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const {
  bookingDateTime,
  dateKey,
  dateKeyAt,
  findAvailableTables,
  parseTime,
  timeKeyAt,
  validateBookingRules,
  validateTableAssignment,
  withBookingLock,
} = require('../lib/booking')

const router = Router()
const phoneSchema = z.string().trim().min(8).max(20).regex(/^[+0-9 ()-]+$/)
const reservationInput = z.object({
  name: z.string().trim().min(2).max(100),
  phone: phoneSchema,
  date: z.coerce.date(),
  time: z.string().trim().min(1).max(20),
  guests: z.coerce.number().int().min(1).max(20),
  notes: z.string().trim().max(300).optional().default(''),
})
const statusTransitions = {
  requested: ['confirmed', 'cancelled', 'checked_in', 'no_show'],
  confirmed: ['cancelled', 'checked_in', 'no_show'],
  checked_in: ['completed'],
  cancelled: [],
  completed: [],
  no_show: [],
}
const reservationPatch = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: phoneSchema.optional(),
  date: z.coerce.date().optional(),
  time: z.string().trim().min(1).max(20).optional(),
  guests: z.coerce.number().int().min(1).max(20).optional(),
  notes: z.string().trim().max(300).optional(),
  internalNotes: z.string().trim().max(1000).optional(),
  status: z.enum(['requested', 'confirmed', 'cancelled', 'checked_in', 'completed', 'no_show']).optional(),
  tableIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(4).optional(),
}).refine((data) => Object.keys(data).length > 0, 'At least one reservation field is required.')
const waitlistInput = z.object({
  name: z.string().trim().min(2).max(100),
  phone: phoneSchema,
  date: z.coerce.date(),
  guests: z.coerce.number().int().min(1).max(20),
  notes: z.string().trim().max(300).optional().default(''),
})
const walkInInput = waitlistInput.extend({
  time: z.string().trim().min(1).max(20),
})
const staffReservationInput = reservationInput.extend({
  status: z.enum(['requested', 'confirmed']).optional().default('requested'),
})
const referenceInput = z.object({
  reference: z.string().trim().min(20).max(40),
  phone: phoneSchema,
})
const customerChangeInput = z.object({
  phone: phoneSchema,
  action: z.enum(['cancel', 'reschedule']),
  date: z.coerce.date().optional(),
  time: z.string().trim().min(1).max(20).optional(),
  guests: z.coerce.number().int().min(1).max(20).optional(),
}).refine((data) => data.action !== 'reschedule' || (data.date && data.time), 'A new date and time are required to reschedule.')

function activityActor(actor) {
  return {
    actorId: actor.id || null,
    actorEmail: actor.email,
    actorRole: actor.role,
  }
}

function systemActor() {
  return { actorId: null, actorEmail: 'public booking', actorRole: 'system' }
}

async function recordActivity(actor, action, targetType, targetId, details = {}) {
  await Activity.create({ ...activityActor(actor), action, targetType, targetId: String(targetId || ''), details })
}

function publicReservation(reservation) {
  return {
    bookingReference: reservation.bookingReference,
    name: reservation.name,
    date: reservation.date,
    time: reservation.time,
    guests: reservation.guests,
    status: reservation.status,
  }
}

const availabilityInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1).max(20),
})

router.get('/availability', async (req, res, next) => {
  try {
    const result = availabilityInput.safeParse(req.query)
    if (!result.success) {
      return res.status(400).json({
        message: 'Please check the submitted fields.',
        errors: result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
      })
    }
    const { date, guests } = result.data
    if (Number.isNaN(new Date(`${date}T00:00:00.000Z`).getTime())) {
      return res.status(400).json({ message: 'Invalid service date.' })
    }
    const settings = await BookingSettings.findById('default').lean()
    const tablesConfigured = await Table.exists({ active: true })
    if (!settings?.openingHours?.length) return res.json({ date, slots: [], tablesConfigured: Boolean(tablesConfigured) })
    const timezone = settings.timezone || 'Asia/Karachi'
    if (guests < (settings.minimumPartySize ?? 1) || guests > (settings.maximumPartySize ?? 20)) {
      return res.status(400).json({ message: 'Party size is outside the configured booking limits.' })
    }
    const today = dateKeyAt(new Date(), timezone)
    const latestDate = new Date(`${today}T00:00:00.000Z`)
    latestDate.setUTCDate(latestDate.getUTCDate() + (settings.advanceBookingDays ?? 60))
    if (date < today || date > dateKey(latestDate)) {
      return res.json({ date, slots: [], tablesConfigured: Boolean(tablesConfigured) })
    }
    const selected = new Date(`${date}T00:00:00.000Z`)
    const dayHours = settings.openingHours.find((hours) => hours.day === selected.getUTCDay())
    if (!dayHours || (settings.closures || []).some((closure) => closure.date === date)) {
      return res.json({ date, slots: [], tablesConfigured: Boolean(tablesConfigured) })
    }
    const open = parseTime(dayHours.open)
    const close = parseTime(dayHours.close)
    const slots = []
    for (let minute = open; minute + settings.seatingDurationMinutes <= close; minute += settings.slotIntervalMinutes) {
      const hour24 = Math.floor(minute / 60)
      const minutePart = minute % 60
      const labelHour = hour24 % 12 || 12
      const label = `${labelHour}:${String(minutePart).padStart(2, '0')} ${hour24 < 12 ? 'AM' : 'PM'}`
      const tableIds = tablesConfigured
        ? bookingDateTime(date, label, timezone) > new Date()
          ? await findAvailableTables({ date, time: label, guests })
          : []
        : []
      slots.push({ time: label, available: tablesConfigured ? Boolean(tableIds?.length) : false })
    }
    return res.json({ date, slots, tablesConfigured: Boolean(tablesConfigured) })
  } catch (error) {
    return next(error)
  }
})

router.post('/lookup', validate(referenceInput), async (req, res, next) => {
  try {
    const reservation = await Reservation.findOne({
      bookingReference: req.body.reference,
      phone: req.body.phone,
    })
    if (!reservation) return res.status(404).json({ message: 'Booking reference or phone number is incorrect.' })
    return res.json(publicReservation(reservation))
  } catch (error) {
    return next(error)
  }
})

router.post('/', validate(reservationInput), async (req, res, next) => {
  try {
    if (parseTime(req.body.time) === null) return res.status(400).json({ message: 'Please choose a valid reservation time.' })
    const reservation = await withBookingLock(async (assertLock) => {
      await validateBookingRules(req.body.date, req.body.time, req.body.guests)
      const activeTables = await Table.exists({ active: true })
      const tableIds = activeTables
        ? await findAvailableTables(req.body)
        : []
      if (activeTables && !tableIds?.length) {
        const error = new Error('No compatible table is available for the selected time. Please choose another time.')
        error.status = 409
        throw error
      }
      assertLock()
      return Reservation.create({ ...req.body, tableIds })
    })
    await Activity.create({
      ...systemActor(),
      action: 'reservation.requested',
      targetType: 'reservation',
      targetId: String(reservation._id),
      details: { source: 'online' },
    })
    return res.status(201).json({
      bookingReference: reservation.bookingReference,
      status: reservation.status,
      date: reservation.date,
      time: reservation.time,
    })
  } catch (error) {
    return next(error)
  }
})

router.post('/staff', requireStaff, validate(staffReservationInput), async (req, res, next) => {
  try {
    if (parseTime(req.body.time) === null) return res.status(400).json({ message: 'Please choose a valid reservation time.' })
    const reservation = await withBookingLock(async (assertLock) => {
      await validateBookingRules(req.body.date, req.body.time, req.body.guests)
      const activeTables = await Table.exists({ active: true })
      const tableIds = activeTables
        ? await findAvailableTables(req.body)
        : []
      if (activeTables && !tableIds?.length) {
        const error = new Error('No compatible table is available for the selected time.')
        error.status = 409
        throw error
      }
      if (req.body.status === 'confirmed' && activeTables && !tableIds.length) {
        const error = new Error('A table must be available before confirming this reservation.')
        error.status = 409
        throw error
      }
      assertLock()
      return Reservation.create({
        ...req.body,
        tableIds,
        source: 'staff',
        createdBy: req.admin.id || null,
      })
    })
    await recordActivity(req.admin, 'reservation.created', 'reservation', reservation._id, { source: 'staff', guests: reservation.guests })
    return res.status(201).json(reservation)
  } catch (error) {
    return next(error)
  }
})

router.patch('/reference/:reference', validate(customerChangeInput), async (req, res, next) => {
  try {
    const reservation = await withBookingLock(async (assertLock) => {
      const current = await Reservation.findOne({
        bookingReference: req.params.reference,
        phone: req.body.phone,
      })
      if (!current) return null
      if (!['requested', 'confirmed'].includes(current.status)) {
        const error = new Error('This booking can no longer be changed online.')
        error.status = 409
        throw error
      }
      const settings = await BookingSettings.findById('default').lean()
      const startsAt = bookingDateTime(current.date, current.time, settings?.timezone || 'Asia/Karachi')
      const hoursBefore = startsAt ? (startsAt.getTime() - Date.now()) / 3600000 : 0
      if (settings && hoursBefore < settings.cancellationWindowHours) {
        const error = new Error('The online cancellation or change window has passed. Please contact the restaurant.')
        error.status = 409
        throw error
      }
      if (req.body.action === 'cancel') {
        assertLock()
        current.status = 'cancelled'
      } else {
        const date = req.body.date
        const time = req.body.time
        const guests = req.body.guests || current.guests
        if (parseTime(time) === null) {
          const error = new Error('Please choose a valid reservation time.')
          error.status = 400
          throw error
        }
        await validateBookingRules(date, time, guests)
        const activeTables = await Table.exists({ active: true })
        const tableIds = activeTables
          ? await findAvailableTables({ date, time, guests, excludeReservationId: current._id })
          : []
        if (activeTables && !tableIds?.length) {
          const error = new Error('No compatible table is available for the new time.')
          error.status = 409
          throw error
        }
        assertLock()
        current.date = date
        current.time = time
        current.guests = guests
        current.tableIds = tableIds
      }
      await current.save()
      return current
    })
    if (!reservation) return res.status(404).json({ message: 'Booking reference or phone number is incorrect.' })
    await Activity.create({
      ...systemActor(),
      action: `reservation.${req.body.action === 'cancel' ? 'cancelled' : 'rescheduled'}`,
      targetType: 'reservation',
      targetId: String(reservation._id),
      details: { source: 'customer' },
    })
    return res.json(publicReservation(reservation))
  } catch (error) {
    return next(error)
  }
})

router.get('/', requireStaff, async (req, res, next) => {
  try {
    const query = {}
    if (req.query.date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
        return res.status(400).json({ message: 'Invalid service date.' })
      }
      const selected = new Date(`${req.query.date}T00:00:00.000Z`)
      if (Number.isNaN(selected.getTime())) return res.status(400).json({ message: 'Invalid service date.' })
      query.date = { $gte: selected, $lt: new Date(selected.getTime() + 86400000) }
    }
    if (req.query.status) {
      if (!['requested', 'confirmed', 'cancelled', 'checked_in', 'completed', 'no_show'].includes(req.query.status)) {
        return res.status(400).json({ message: 'Invalid reservation status.' })
      }
      query.status = req.query.status
    }
    if (req.query.guests) {
      const guests = Number(req.query.guests)
      if (!Number.isInteger(guests) || guests < 1 || guests > 20) {
        return res.status(400).json({ message: 'Guest filter must be between 1 and 20.' })
      }
      query.guests = guests
    }
    if (req.query.search) {
      if (typeof req.query.search !== 'string' || req.query.search.length > 100) {
        return res.status(400).json({ message: 'Search text must be at most 100 characters.' })
      }
      const escaped = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
        { bookingReference: { $regex: escaped, $options: 'i' } },
      ]
    }
    return res.json(await Reservation.find(query).sort({ date: 1, time: 1, createdAt: -1 }).lean())
  } catch (error) {
    return next(error)
  }
})

router.patch('/:id', requireStaff, validate(reservationPatch), async (req, res, next) => {
  try {
    const reservation = await withBookingLock(async (assertLock) => {
      const current = await Reservation.findById(req.params.id)
      if (!current) return null
      const update = { ...req.body }
      if (update.status && update.status !== current.status && !statusTransitions[current.status]?.includes(update.status)) {
        const error = new Error(`A reservation cannot move from ${current.status} to ${update.status}.`)
        error.status = 409
        throw error
      }
      const date = update.date || current.date
      const time = update.time || current.time
      const guests = update.guests ?? current.guests
      const reschedule = update.date || update.time || update.guests
      if (reschedule) {
        if (!['requested', 'confirmed'].includes(current.status)) {
          const error = new Error('Only requested or confirmed reservations can be rescheduled.')
          error.status = 409
          throw error
        }
        if (parseTime(time) === null) {
          const error = new Error('Please choose a valid reservation time.')
          error.status = 400
          throw error
        }
        await validateBookingRules(date, time, guests)
        if (update.tableIds) {
          const valid = await validateTableAssignment({
            date,
            time,
            guests,
            tableIds: update.tableIds,
            excludeReservationId: current._id,
          })
          if (!valid) {
            const error = new Error('The selected tables are unavailable or are not a compatible combination.')
            error.status = 409
            throw error
          }
        } else if (await Table.exists({ active: true })) {
          const tableIds = await findAvailableTables({ date, time, guests, excludeReservationId: current._id })
          if (!tableIds?.length) {
            const error = new Error('No compatible table is available for the selected time.')
            error.status = 409
            throw error
          }
          update.tableIds = tableIds
        }
      } else if (update.tableIds) {
        const valid = await validateTableAssignment({
          date,
          time,
          guests,
          tableIds: update.tableIds,
          excludeReservationId: current._id,
        })
        if (!valid) {
          const error = new Error('The selected tables are unavailable or are not a compatible combination.')
          error.status = 409
          throw error
        }
      }
      const nextStatus = update.status || current.status
      if (
        ['confirmed', 'checked_in'].includes(nextStatus) &&
        await Table.exists({ active: true }) &&
        !(update.tableIds || current.tableIds || []).length
      ) {
        const error = new Error('Assign a table before confirming or checking in this reservation.')
        error.status = 409
        throw error
      }
      Object.assign(current, update)
      assertLock()
      await current.save()
      return current
    })
    if (!reservation) return res.status(404).json({ message: 'Reservation not found.' })
    await recordActivity(req.admin, 'reservation.updated', 'reservation', reservation._id, { status: reservation.status })
    return res.json(reservation)
  } catch (error) {
    return next(error)
  }
})

router.post('/walk-ins', requireStaff, validate(walkInInput), async (req, res, next) => {
  try {
    if (parseTime(req.body.time) === null) return res.status(400).json({ message: 'Please choose a valid seating time.' })
    const reservation = await withBookingLock(async (assertLock) => {
      const settings = await BookingSettings.findById('default').lean()
      const timezone = settings?.timezone || 'Asia/Karachi'
      const currentDate = dateKeyAt(new Date(), timezone)
      if (dateKey(req.body.date) !== currentDate) {
        const error = new Error('Walk-in parties must be recorded for today’s service date.')
        error.status = 400
        throw error
      }
      const time = timeKeyAt(new Date(), timezone)
      const tableIds = await findAvailableTables({ ...req.body, date: currentDate, time })
      if (!tableIds?.length) {
        const error = new Error('No table is currently available. Add this party to the waitlist instead.')
        error.status = 409
        throw error
      }
      assertLock()
      return Reservation.create({
        ...req.body,
        date: new Date(`${currentDate}T00:00:00.000Z`),
        time,
        tableIds,
        status: 'confirmed',
        source: 'walk_in',
        createdBy: req.admin.id || null,
      })
    })
    await recordActivity(req.admin, 'walk_in.created', 'reservation', reservation._id, { guests: reservation.guests })
    return res.status(201).json(reservation)
  } catch (error) {
    return next(error)
  }
})

router.get('/waitlist', requireStaff, async (req, res, next) => {
  try {
    const query = { status: 'waiting' }
    const settings = await BookingSettings.findById('default').lean()
    const today = dateKeyAt(new Date(), settings?.timezone || 'Asia/Karachi')
    if (req.query.date) {
      if (typeof req.query.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
        return res.status(400).json({ message: 'Invalid service date.' })
      }
      const date = new Date(`${req.query.date}T00:00:00.000Z`)
      if (Number.isNaN(date.getTime())) return res.status(400).json({ message: 'Invalid service date.' })
      query.date = date
    } else {
      query.date = new Date(`${today}T00:00:00.000Z`)
    }
    return res.json(await WaitlistEntry.find(query).sort({ createdAt: 1 }).lean())
  } catch (error) {
    return next(error)
  }
})

router.post('/waitlist', requireStaff, validate(waitlistInput), async (req, res, next) => {
  try {
    const settings = await BookingSettings.findById('default').lean()
    const timezone = settings?.timezone || 'Asia/Karachi'
    if (dateKey(req.body.date) !== dateKeyAt(new Date(), timezone)) {
      return res.status(400).json({ message: 'Waitlist entries must be for today’s service date.' })
    }
    const entry = await WaitlistEntry.create({
      ...req.body,
      date: new Date(`${dateKeyAt(new Date(), timezone)}T00:00:00.000Z`),
      createdBy: req.admin.id || null,
    })
    await recordActivity(req.admin, 'waitlist.added', 'waitlist', entry._id, { guests: entry.guests })
    return res.status(201).json(entry)
  } catch (error) {
    return next(error)
  }
})

router.patch('/waitlist/:id', requireStaff, validate(z.object({
  status: z.enum(['seated', 'cancelled']),
})), async (req, res, next) => {
  try {
    const entry = await withBookingLock(async (assertLock) => {
      const current = await WaitlistEntry.findById(req.params.id)
      if (!current || current.status !== 'waiting') return null
      if (req.body.status === 'seated') {
        const existingReservation = await Reservation.findOne({ waitlistEntryId: current._id })
        if (existingReservation) {
          current.status = 'seated'
          assertLock()
          return current.save()
        }
        const settings = await BookingSettings.findById('default').lean()
        const time = timeKeyAt(new Date(), settings?.timezone || 'Asia/Karachi')
        if (dateKey(current.date) !== dateKeyAt(new Date(), settings?.timezone || 'Asia/Karachi')) {
          const error = new Error('Only parties on today’s waitlist can be seated.')
          error.status = 409
          throw error
        }
        const tableIds = await findAvailableTables({
          date: current.date,
          time,
          guests: current.guests,
        })
        if (!tableIds?.length) {
          const error = new Error('No compatible table is currently available.')
          error.status = 409
          throw error
        }
        assertLock()
        await Reservation.create({
          name: current.name,
          phone: current.phone,
          date: current.date,
          time,
          guests: current.guests,
          notes: current.notes,
          tableIds,
          status: 'checked_in',
          source: 'walk_in',
          waitlistEntryId: current._id,
          createdBy: req.admin.id || null,
        })
      }
      current.status = req.body.status
      assertLock()
      return current.save()
    })
    if (!entry) return res.status(404).json({ message: 'Waiting party not found.' })
    await recordActivity(req.admin, `waitlist.${entry.status}`, 'waitlist', entry._id)
    return res.json(entry)
  } catch (error) {
    return next(error)
  }
})

module.exports = router
