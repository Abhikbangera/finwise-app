// Pure validation for the Settings page. The database enforces the same rules (module 1).
export function validateProfile(v) {
  if (v.full_name.trim().length > 80) return 'Name must be 80 characters or fewer.'
  if (!(Number(v.monthly_income) >= 0)) return 'Income cannot be negative.'
  const p = [v.needs_pct, v.wants_pct, v.savings_pct].map(Number)
  if (p.some((x) => !Number.isInteger(x) || x < 0 || x > 100)) return 'Percentages must be whole numbers from 0 to 100.'
  const sum = p[0] + p[1] + p[2]
  if (sum !== 100) return `The split adds up to ${sum}, not 100.`
  return null
}
export function validatePassword(pw, confirm) {
  if (pw.length < 6) return 'Use at least 6 characters.'
  if (pw !== confirm) return 'The two passwords do not match.'
  return null
}
export const toPayload = (v) => ({
  full_name: v.full_name.trim() || null,
  monthly_income: Number(v.monthly_income),
  needs_pct: Number(v.needs_pct), wants_pct: Number(v.wants_pct), savings_pct: Number(v.savings_pct),
})
