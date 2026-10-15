const mongoose = require('mongoose')

const dishSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  description: { type: String, required: true, trim: true, maxlength: 300 },
  price: { type: Number, required: true, min: 1, max: 1000000 },
  image: { type: String, required: true, trim: true, maxlength: 1000 },
  available: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
}, { timestamps: true })

module.exports = mongoose.model('Dish', dishSchema)
