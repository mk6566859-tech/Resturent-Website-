const mongoose = require('mongoose')

const restaurantSettingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'default' },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  logo: { type: String, trim: true, maxlength: 1000 },
  locationLabel: { type: String, trim: true, maxlength: 100 },
  address: { type: String, trim: true, maxlength: 250 },
  phone: { type: String, trim: true, maxlength: 30 },
  whatsapp: { type: String, trim: true, maxlength: 30 },
  email: { type: String, trim: true, maxlength: 150 },
  instagram: { type: String, trim: true, maxlength: 250 },
  hours: [{ days: { type: String, maxlength: 50 }, hours: { type: String, maxlength: 50 } }],
  palette: {
    ink: { type: String, default: '#151515' },
    panel: { type: String, default: '#20201E' },
    ivory: { type: String, default: '#F5F0E8' },
    muted: { type: String, default: '#B7B0A6' },
    copper: { type: String, default: '#C77B45' },
  },
  hero: {
    eyebrow: { type: String, maxlength: 100 },
    title: { type: String, maxlength: 180 },
    description: { type: String, maxlength: 400 },
    image: { type: String, maxlength: 1000 },
  },
  offer: {
    eyebrow: { type: String, maxlength: 100 },
    title: { type: String, maxlength: 180 },
    description: { type: String, maxlength: 300 },
  },
  sections: {
    signature: Boolean,
    menu: Boolean,
    story: Boolean,
    offer: Boolean,
    gallery: Boolean,
    reservations: Boolean,
    visit: Boolean,
  },
  images: {
    story: { type: String, maxlength: 1000 },
    gallery: [{ type: String, maxlength: 1000 }],
  },
}, { timestamps: true, _id: false })

module.exports = mongoose.model('RestaurantSettings', restaurantSettingsSchema)
