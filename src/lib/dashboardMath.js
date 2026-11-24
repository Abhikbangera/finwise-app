// Pure dashboard calculations. Everything comes from the user's own rows; no sample data.
import { computeProgress } from './budgetMath.js'
const r2 = (n) => Math.round(n * 100) / 100
const pad = (n) => String(n).padStart(2, '0')

export const monthKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
export const nextMonthStart = (ym) => { const [y, m] = ym.split('-').map(Number); return m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01` }
// The last n month keys, oldest first, ending at ref's month.
export function lastMonths(n, ref = new Date()) {
  return Array.from({ length: n }, (_, i) => monthKey(new Date(ref.getFullYear(), ref.getMonth() - (n - 1 - i), 1)))
}
const NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const shortName = (ym) => NAMES[Number(ym.slice(5, 7)) - 1]

// trendRows come from the monthly_totals() database function. Months with no data become zeros.
export function buildTrend(trendRows, keys) {
  const by = new Map(trendRows.map((r) => [String(r.month).slice(0, 7), r]))
  return keys.map((k) => ({ key: k, m: shortName(k), income: r2(Number(by.get(k)?.income ?? 0)), spent: r2(Number(by.get(k)?.expense ?? 0)) }))
}

export function buildDashboard({ budget, cats, txns, overrides, trendRows, goals, keys }) {
  const income = r2(txns.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0))
  const expense = r2(txns.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0))
  const progress = budget ? computeProgress(budget, cats, txns, overrides) : null
  const active = goals.filter((g) => g.status !== 'completed')
  return {
    income, expense, net: r2(income - expense),
    hasBudget: !!budget, plannedIncome: budget ? Number(budget.income) : 0,
    buckets: progress?.buckets ?? [], cats: progress?.cats ?? [], unbudgeted: progress?.unbudgeted ?? 0,
    trend: buildTrend(trendRows, keys),
    recent: txns.slice(0, 5),                       // txns arrive newest first
    goals: { activeCount: active.length, saved: r2(active.reduce((s, g) => s + Number(g.saved_amount), 0)), target: r2(active.reduce((s, g) => s + Number(g.target_amount), 0)) },
    isEmpty: txns.length === 0 && !budget,
  }
}
