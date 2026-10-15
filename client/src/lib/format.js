export const formatPrice = (amount) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    currencyDisplay: 'code',
    maximumFractionDigits: 0,
  }).format(amount)

export function createWhatsAppUrl(number, items) {
  const lines = items.map(({ name, quantity, price }) => `${quantity} × ${name} — ${formatPrice(quantity * price)}`)
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const message = `Assalam-o-alaikum! I would like to order:\n${lines.join('\n')}\n\nTotal: ${formatPrice(total)}`
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
