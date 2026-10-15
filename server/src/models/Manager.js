const mongoose = require('mongoose')

const managerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 150 },
  passwordHash: { type: String, required: true, select: false },
  tokenVersion: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true })

managerSchema.index({ email: 1 }, { unique: true })

module.exports = mongoose.model('Manager', managerSchema)
