const mongoose = require('mongoose')

const waitlistEntrySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  phone: { type: String, required: true, trim: true, maxlength: 20 },
  date: { type: Date, required: true },
  guests: { type: Number, required: true, min: 1, max: 20 },
  notes: { type: String, trim: true, maxlength: 300, default: '' },
  status: { type: String, enum: ['waiting', 'seated', 'cancelled'], default: 'waiting' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Manager', default: null },
}, { timestamps: true })

waitlistEntrySchema.index({ date: 1, status: 1, createdAt: 1 })

module.exports = mongoose.model('WaitlistEntry', waitlistEntrySchema)
