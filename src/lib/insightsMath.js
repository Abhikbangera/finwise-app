// Pure insight calculations from the user's own transactions. Plain rules, no AI.
import { inr } from './format.js'
const r2 = (n) => Math.round(n * 100) / 100
const sum = (txns, type) => r2(txns.filter((t) => t.type === type).reduce((s, t) => s + Number(t.amount), 0))

export const prevMonthKey = (ym) => { const [y, m] = ym.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}` }
const expenseBy = (txns, keyFn) => {
  const m = new Map()
  for (const t of txns) if (t.type === 'expense') { const k = keyFn(t); m.set(k, r2((m.get(k) ?? 0) + Number(t.amount))) }
  return m
}

export function buildInsights({ txns, prevTxns, budget }) {
  const income = sum(txns, 'income'), expense = sum(txns, 'expense')
  const cur = expenseBy(txns, (t) => t.category), prev = expenseBy(prevTxns, (t) => t.category)
  const rows = [...new Set([...cur.keys(), ...prev.keys()])].map((name) => {
    const amount = cur.get(name) ?? 0, p = prev.get(name) ?? 0
    return { name, amount, prev: p, delta: r2(amount - p), deltaPct: p > 0 ? Math.round(((amount - p) / p) * 100) : null, share: expense > 0 ? Math.round((amount / expense) * 100) : 0 }
  }).sort((a, b) => b.amount - a.amount || b.prev - a.prev)

  // Percentages are of income received this month; if none is logged, of the budget's income.
  const base = income > 0 ? income : budget ? Number(budget.income) : 0
  const baseLabel = base <= 0 ? null : income > 0 ? 'income received' : 'budget income'
  const targets = { needs: budget?.needs_pct ?? 50, wants: budget?.wants_pct ?? 30, savings: budget?.savings_pct ?? 20 }
  const byBucket = expenseBy(txns, (t) => t.bucket ?? 'none')
  const buckets = ['needs', 'wants', 'savings'].map((b) => { const amount = byBucket.get(b) ?? 0; return { bucket: b, amount, pct: base > 0 ? r2((amount / base) * 100) : null, target: targets[b] } })
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : null
  const top = txns.filter((t) => t.type === 'expense').sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5)

  const obs = []
  if (income > 0 && expense > income) obs.push(`You spent ${inr(expense - income)} more than you earned this month.`)
  const moves = rows.filter((r) => r.prev > 0 && Math.abs(r.delta) >= 500 && Math.abs(r.delta) / r.prev >= 0.25).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  for (const r of moves.slice(0, 3)) obs.push(`${r.name} is ${r.delta > 0 ? 'up' : 'down'} ${Math.abs(r.deltaPct)}% (${inr(Math.abs(r.delta))}) compared with last month.`)
  const wants = buckets[1]
  if (wants.pct != null && wants.pct > wants.target + 5) obs.push(`Wants are ${Math.round(wants.pct)}% of your ${baseLabel}, above your ${wants.target}% target.`)
  if (savingsRate != null && savingsRate >= 20 && expense <= income) obs.push(`You kept ${savingsRate}% of your income this month.`)
  if (income === 0 && txns.length > 0) obs.push(budget && base > 0 ? 'No income is logged this month, so percentages use your budget income.' : 'No income is logged this month, so spending cannot be compared with your split.')
  return { income, expense, savingsRate, rows, buckets, top, base, baseLabel, usingDefaultSplit: !budget, observations: obs.slice(0, 5), hasPrev: prevTxns.length > 0, isEmpty: txns.length === 0 }
}
