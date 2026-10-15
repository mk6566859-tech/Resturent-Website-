const mongoose = require('mongoose')

const tableSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true, maxlength: 30 },
  section: { type: String, required: true, trim: true, maxlength: 60 },
  capacity: { type: Number, required: true, min: 1, max: 30 },
  combinationGroup: { type: String, trim: true, maxlength: 60, default: '' },
  active: { type: Boolean, default: true },
}, { timestamps: true })

tableSchema.index({ label: 1 }, { unique: true })

module.exports = mongoose.model('Table', tableSchema)
