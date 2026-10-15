import { describe, expect, it } from 'vitest'
import { createWhatsAppUrl, formatPrice } from './format'

describe('restaurant menu helpers', () => {
  it('formats a price as Pakistani rupees', () => {
    expect(formatPrice(1850)).toContain('1,850')
    expect(formatPrice(1850)).toContain('PKR')
  })

  it('builds an encoded WhatsApp order with quantities and total', () => {
    const url = createWhatsAppUrl('923001234567', [
      { name: 'Charcoal chicken', quantity: 2, price: 1000 },
    ])
    expect(url).toContain('https://wa.me/923001234567?text=')
    expect(decodeURIComponent(url)).toContain('2 × Charcoal chicken')
    expect(decodeURIComponent(url)).toContain('PKR')
  })
})
