// Amounts travel through the whole system as integer cents (see the
// backend's decisions.md — floats are never used for money). This module is
// the one place that converts between cents and what a person reads/types,
// so every screen formats money identically.

const withCents = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const wholePesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** "$ 1.660.000" — cents are shown only when the amount actually has them. */
export function formatCurrency(cents: number): string {
  return cents % 100 === 0 ? wholePesos.format(cents / 100) : withCents.format(cents / 100)
}

/** "+ $ 85.000" / "− $ 45.000" for movement lists. */
export function formatSignedCurrency(cents: number, direction: 'in' | 'out'): string {
  return `${direction === 'in' ? '+' : '−'} ${formatCurrency(cents)}`
}

const MAX_CENTS = 100_000_000_000_00 // $100.000 millones: a sanity cap, not a business rule

/**
 * Parses what someone types in Colombian format — "." for thousands, ","
 * for decimals ("150.000", "150.000,50", "1500") — into integer cents.
 * Works on the digit string directly, never through a float, so no
 * rounding can creep in. Returns null for anything that isn't a positive
 * amount with at most 2 decimals.
 */
export function parsePesosToCents(input: string): number | null {
  const clean = input.replace(/[\s$]/g, '').replace(/\./g, '')
  const match = /^(\d+)(?:,(\d{1,2}))?$/.exec(clean)
  if (!match) return null
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_CENTS) return null
  return cents
}

/** Live-formats the text of an amount field as the person types ("150000" → "150.000"). */
export function formatPesosInput(input: string): string {
  const [intPart, decPart] = input.replace(/[^\d,]/g, '').split(',', 2)
  const grouped = (intPart ?? '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decPart === undefined ? grouped : `${grouped},${decPart.slice(0, 2)}`
}
