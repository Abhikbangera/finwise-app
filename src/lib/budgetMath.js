// Pure budget calculations (no database). A category is "locked" once spending reaches its
// limit. The limit is the base limit plus any APPROVED override requests for that category.
import { inr } from './format.js'
const r2 = (n) => Math.round(n * 100) / 100
export const BUCKET_KEYS = ['needs', 'wants', 'savings']

export function computeProgress(budget, categories, txns, overrides = []) {
  const expenses = txns.filter((t) => t.type === 'expense')
  const sum = (f) => r2(expenses.filter(f).reduce((s, t) => s + Number(t.amount), 0))
  const buckets = BUCKET_KEYS.map((b) => {
    const pct = budget[`${b}_pct`]
    const allocated = r2((Number(budget.income) * pct) / 100)
    const spent = sum((t) => t.bucket === b)
    return { bucket: b, pct, allocated, spent, left: r2(allocated - spent), over: spent > allocated }
  })
  const cats = categories.map((c) => {
    const extra = r2(overrides.filter((o) => o.status === 'approved' && o.category_name === c.name).reduce((s, o) => s + Number(o.amount), 0))
    const limit = r2(Number(c.limit_amount) + extra)
    const spent = sum((t) => t.category === c.name)
    return { ...c, extra, limit, spent, left: r2(limit - spent), locked: spent >= limit }
  })
  const budgeted = new Set(categories.map((c) => c.name))
  return { buckets, cats, unbudgeted: sum((t) => !budgeted.has(t.category)) }
}

// Adding this expense must not push the category over its (effective) limit.
export const canSpend = (cat, amount) => r2(cat.spent + amount) <= cat.limit

// The single most serious alert for each category with a limit.
export function alertsFor(cats) {
  const out = []
  for (const c of cats) {
    if (!(c.limit > 0)) continue
    const pct = Math.floor((c.spent / c.limit) * 100)
    if (c.spent > c.limit) out.push({ category_name: c.name, alert_type: 'over_budget', message: `${c.name} is over its limit by ${inr(c.spent - c.limit)}.` })
    else if (c.spent >= c.limit) out.push({ category_name: c.name, alert_type: 'limit_reached', message: `${c.name} reached its ${inr(c.limit)} limit and is now locked.` })
    else if (pct >= 80) out.push({ category_name: c.name, alert_type: 'warning_80', message: `${c.name} has used ${pct}% of its ${inr(c.limit)} limit.` })
  }
  return out
}
