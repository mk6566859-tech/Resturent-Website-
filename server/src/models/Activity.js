const mongoose = require('mongoose')

const activitySchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, default: null },
  actorEmail: { type: String, required: true, maxlength: 150 },
  actorRole: { type: String, enum: ['admin', 'manager', 'system'], required: true },
  action: { type: String, required: true, maxlength: 80 },
  targetType: { type: String, required: true, maxlength: 40 },
  targetId: { type: String, default: '', maxlength: 100 },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true })

activitySchema.index({ createdAt: -1 })

module.exports = mongoose.model('Activity', activitySchema)
