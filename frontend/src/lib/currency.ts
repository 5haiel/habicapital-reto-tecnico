// Amounts travel through the whole system as integer cents (see the
// backend's decisions.md — floats are never used for money). This is the
// one place that turns cents into a human-readable amount, so every screen
// formats money identically.
const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
})

export function formatCurrency(cents: number): string {
  return formatter.format(cents / 100)
}
