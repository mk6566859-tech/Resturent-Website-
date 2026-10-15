const { test } = require('node:test')
const assert = require('node:assert/strict')
const { bookingDateTime, dateKeyAt, isWithinServiceHours, parseTime, timeKeyAt } = require('../src/lib/booking')

test('reservation times accept existing AM/PM labels and 24-hour values', () => {
  assert.equal(parseTime('7:30 PM'), 1170)
  assert.equal(parseTime('19:30'), 1170)
  assert.equal(parseTime('not-a-time'), null)
})

test('reservation seating duration must fit within restaurant opening hours', () => {
  const opening = parseTime('12:00')
  const closing = parseTime('23:00')
  const duration = 90

  assert.equal(isWithinServiceHours(parseTime('21:30'), opening, closing, duration), true)
  assert.equal(isWithinServiceHours(parseTime('21:31'), opening, closing, duration), false)
  assert.equal(isWithinServiceHours(parseTime('11:59'), opening, closing, duration), false)
})

test('booking date and time convert using the restaurant timezone', () => {
  assert.equal(
    bookingDateTime('2026-10-15', '12:30 PM', 'Asia/Karachi').toISOString(),
    '2026-10-15T07:30:00.000Z',
  )
  assert.equal(dateKeyAt(new Date('2026-10-14T20:00:00.000Z'), 'Asia/Karachi'), '2026-10-15')
  assert.equal(timeKeyAt(new Date('2026-10-15T07:30:00.000Z'), 'Asia/Karachi'), '12:30')
})
