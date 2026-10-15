const { randomUUID } = require('node:crypto')
const { setTimeout: delay } = require('node:timers/promises')
const BookingLock = require('../models/BookingLock')
const BookingSettings = require('../models/BookingSettings')
const Reservation = require('../models/Reservation')
const Table = require('../models/Table')

const activeStatuses = ['requested', 'confirmed', 'checked_in']

function parseTime(value) {
  const input = String(value || '').trim()
  const twentyFourHour = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(input)
  if (twentyFourHour) return Number(twentyFourHour[1]) * 60 + Number(twentyFourHour[2])
  const twelveHour = /^(1[0-2]|0?[1-9]):([0-5]\d)\s*(AM|PM)$/i.exec(input)
  if (!twelveHour) return null
  const hour = Number(twelveHour[1]) % 12 + (/PM/i.test(twelveHour[3]) ? 12 : 0)
  return hour * 60 + Number(twelveHour[2])
}

function isWithinServiceHours(start, open, close, duration) {
  return Number.isInteger(start) && Number.isInteger(open) && Number.isInteger(close) &&
    Number.isInteger(duration) && start >= open && start + duration <= close
}

function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10)
}

function dateKeyAt(value, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function timeKeyAt(value, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.hour}:${values.minute}`
}

function bookingDateTime(date, time, timeZone = 'Asia/Karachi') {
  const minutes = parseTime(time)
  if (minutes === null) return null
  const key = dateKey(date)
  const [year, month, day] = key.split('-').map(Number)
  const targetUtc = Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const localParts = Object.fromEntries(formatter.formatToParts(new Date(targetUtc)).map((part) => [part.type, part.value]))
  const representedUtc = Date.UTC(
    Number(localParts.year),
    Number(localParts.month) - 1,
    Number(localParts.day),
    Number(localParts.hour),
    Number(localParts.minute),
  )
  return new Date(targetUtc - (representedUtc - targetUtc))
}

async function withBookingLock(operation) {
  const owner = randomUUID()
  const leaseMs = 60000
  const deadline = Date.now() + 10000
  let acquired = false

  while (!acquired && Date.now() < deadline) {
    const now = new Date()
    try {
      const lock = await BookingLock.findOneAndUpdate(
        { _id: 'allocation', expiresAt: { $lte: now } },
        { $set: { owner, expiresAt: new Date(now.getTime() + leaseMs) } },
        { new: true },
      )
      if (lock) {
        acquired = true
        break
      }
      await BookingLock.create({ _id: 'allocation', owner, expiresAt: new Date(now.getTime() + leaseMs) })
      acquired = true
    } catch (error) {
      if (error.code !== 11000) throw error
      await delay(100)
    }
  }
  if (!acquired) {
    const error = new Error('Reservation allocation is busy. Please retry shortly.')
    error.status = 503
    throw error
  }

  let lockLost = false
  const heartbeat = setInterval(async () => {
    try {
      const result = await BookingLock.updateOne(
        { _id: 'allocation', owner },
        { $set: { expiresAt: new Date(Date.now() + leaseMs) } },
      )
      if (!result.matchedCount) lockLost = true
    } catch {
      lockLost = true
    }
  }, 15000)
  heartbeat.unref()
  const assertLock = () => {
    if (lockLost) {
      const error = new Error('Reservation allocation lock was lost. Please retry.')
      error.status = 503
      throw error
    }
  }

  try {
    return await operation(assertLock)
  } finally {
    clearInterval(heartbeat)
    await BookingLock.deleteOne({ _id: 'allocation', owner })
  }
}

function candidateGroups(tables) {
  const groups = new Map()
  for (const table of tables) {
    const key = table.combinationGroup
      ? `group:${table.combinationGroup}:${table.section}`
      : `single:${table._id}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(table)
  }
  return [...groups.values()]
}

function tableCombos(tables, guests) {
  const candidates = []
  for (const group of candidateGroups(tables)) {
    const ordered = [...group].sort((left, right) => left.capacity - right.capacity)
    if (ordered.length === 1 || !ordered[0].combinationGroup) {
      for (const table of ordered) {
        if (table.capacity >= guests) candidates.push([table])
      }
      continue
    }
    for (let index = 0; index < ordered.length; index += 1) {
      const selection = []
      let capacity = 0
      for (let next = index; next < ordered.length && selection.length < 4; next += 1) {
        selection.push(ordered[next])
        capacity += ordered[next].capacity
        if (capacity >= guests) {
          candidates.push([...selection])
          break
        }
      }
    }
  }
  return candidates.sort((left, right) =>
    left.length - right.length ||
    left.reduce((sum, table) => sum + table.capacity, 0) -
      right.reduce((sum, table) => sum + table.capacity, 0),
  )
}

async function findFreeTables({ date, time, excludeReservationId }) {
  const settings = await BookingSettings.findById('default').lean()
  const tables = await Table.find({ active: true }).lean()
  if (!tables.length) return []
  const start = parseTime(time)
  if (start === null) return null
  const duration = settings?.seatingDurationMinutes || 90
  const dayStart = new Date(`${dateKey(date)}T00:00:00.000Z`)
  const reservations = await Reservation.find({
    date: { $gte: dayStart, $lt: new Date(dayStart.getTime() + 86400000) },
    status: { $in: activeStatuses },
    tableIds: { $in: tables.map((table) => table._id) },
    ...(excludeReservationId ? { _id: { $ne: excludeReservationId } } : {}),
  }).select('date time guests tableIds').lean()
  const requestedEnd = start + duration
  const occupiedTableIds = new Set()
  for (const reservation of reservations) {
    const existingStart = parseTime(reservation.time)
    if (existingStart === null) continue
    if (start < existingStart + duration && requestedEnd > existingStart) {
      reservation.tableIds.forEach((id) => occupiedTableIds.add(String(id)))
    }
  }
  const freeTables = tables.filter((table) => !occupiedTableIds.has(String(table._id)))
  return freeTables
}

async function findAvailableTables(options) {
  const freeTables = await findFreeTables(options)
  if (!freeTables?.length) return freeTables
  return tableCombos(freeTables, options.guests)[0]?.map((table) => table._id) || null
}

async function validateTableAssignment({ date, time, guests, tableIds, excludeReservationId }) {
  const freeTables = await findFreeTables({ date, time, excludeReservationId })
  const selected = freeTables?.filter((table) => tableIds.includes(String(table._id))) || []
  if (selected.length !== tableIds.length) return false
  if (selected.reduce((sum, table) => sum + table.capacity, 0) < guests) return false
  if (selected.length > 1) {
    const group = selected[0].combinationGroup
    if (!group || selected.some((table) => table.section !== selected[0].section || table.combinationGroup !== group)) {
      return false
    }
  }
  return true
}

async function validateBookingRules(date, time, guests) {
  const settings = await BookingSettings.findById('default').lean()
  const minimumPartySize = settings?.minimumPartySize ?? 1
  const maximumPartySize = settings?.maximumPartySize ?? 20
  if (guests < minimumPartySize || guests > maximumPartySize) {
    const error = new Error(`Party size must be between ${minimumPartySize} and ${maximumPartySize}.`)
    error.status = 400
    throw error
  }
  const selectedDate = dateKey(date)
  const timeZone = settings?.timezone || 'Asia/Karachi'
  const today = dateKeyAt(new Date(), timeZone)
  const maxDate = new Date(`${today}T00:00:00.000Z`)
  maxDate.setUTCDate(maxDate.getUTCDate() + (settings?.advanceBookingDays ?? 60))
  if (selectedDate < today || selectedDate > dateKey(maxDate)) {
    const error = new Error('The selected date is outside the advance booking window.')
    error.status = 400
    throw error
  }
  if (selectedDate === today && bookingDateTime(date, time, timeZone) <= new Date()) {
    const error = new Error('The selected reservation time has already passed.')
    error.status = 409
    throw error
  }
  if ((settings?.closures || []).some((closure) => closure.date === selectedDate)) {
    const error = new Error('The restaurant is closed on the selected date.')
    error.status = 409
    throw error
  }
  if ((settings?.openingHours || []).length) {
    const day = new Date(`${selectedDate}T00:00:00.000Z`).getUTCDay()
    const hours = settings.openingHours.find((entry) => entry.day === day)
    const minutes = parseTime(time)
    const open = hours && parseTime(hours.open)
    const close = hours && parseTime(hours.close)
    if (!hours || !isWithinServiceHours(minutes, open, close, settings?.seatingDurationMinutes ?? 90)) {
      const error = new Error('The selected time is outside the restaurant booking hours.')
      error.status = 409
      throw error
    }
  }
}

module.exports = {
  activeStatuses,
  bookingDateTime,
  dateKey,
  dateKeyAt,
  findAvailableTables,
  findFreeTables,
  isWithinServiceHours,
  parseTime,
  timeKeyAt,
  validateTableAssignment,
  validateBookingRules,
  withBookingLock,
}
