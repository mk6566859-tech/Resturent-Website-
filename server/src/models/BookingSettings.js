const mongoose = require('mongoose')

const bookingSettingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'default' },
  slotIntervalMinutes: { type: Number, min: 15, max: 120, default: 30 },
  seatingDurationMinutes: { type: Number, min: 30, max: 360, default: 90 },
  advanceBookingDays: { type: Number, min: 1, max: 365, default: 60 },
  minimumPartySize: { type: Number, min: 1, max: 20, default: 1 },
  maximumPartySize: { type: Number, min: 1, max: 20, default: 20 },
  cancellationWindowHours: { type: Number, min: 0, max: 720, default: 0 },
  timezone: { type: String, trim: true, maxlength: 100, default: 'Asia/Karachi' },
  openingHours: [{
    day: { type: Number, min: 0, max: 6, required: true },
    open: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, required: true },
    close: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, required: true },
  }],
  closures: [{
    date: { type: String, match: /^\d{4}-\d{2}-\d{2}$/, required: true },
    reason: { type: String, trim: true, maxlength: 120, default: '' },
  }],
}, { timestamps: true, _id: false })

module.exports = mongoose.model('BookingSettings', bookingSettingsSchema)
