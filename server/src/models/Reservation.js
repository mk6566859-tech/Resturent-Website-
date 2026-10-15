const mongoose = require('mongoose')
const { randomBytes } = require('node:crypto')

const reservationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  phone: { type: String, required: true, trim: true, maxlength: 20 },
  date: { type: Date, required: true },
  time: { type: String, required: true, trim: true, maxlength: 20 },
  guests: { type: Number, required: true, min: 1, max: 20 },
  notes: { type: String, trim: true, maxlength: 300, default: '' },
  internalNotes: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['requested', 'confirmed', 'cancelled', 'checked_in', 'completed', 'no_show'], default: 'requested' },
  bookingReference: { type: String, default: () => randomBytes(12).toString('hex').toUpperCase() },
  tableIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Table' }],
  waitlistEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'WaitlistEntry' },
  source: { type: String, enum: ['online', 'staff', 'walk_in'], default: 'online' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Manager', default: null },
}, { timestamps: true })

reservationSchema.index({ bookingReference: 1 }, { unique: true, sparse: true })
reservationSchema.index({ date: 1, status: 1 })
reservationSchema.index({ waitlistEntryId: 1 }, { unique: true, sparse: true })

module.exports = mongoose.model('Reservation', reservationSchema)
