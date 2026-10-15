const mongoose = require('mongoose')

const bookingLockSchema = new mongoose.Schema({
  _id: { type: String, default: 'allocation', required: true },
  owner: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true, _id: false })

module.exports = mongoose.model('BookingLock', bookingLockSchema)
