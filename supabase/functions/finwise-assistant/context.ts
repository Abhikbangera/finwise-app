// Builds the financial summary the AI sees. Pure code, no network.
// Privacy: only totals, category names, limits and goal names. Bank-statement descriptions,
// payee names, names, emails and account details are never included.
type Row = Record<string, any>
export interface Data { month: string; budget: Row | null; cats: Row[]; overrides: Row[]; txns: Row[]; prevTxns: Row[]; goals: Row[] }

const r2 = (n: number) => Math.round(n * 100) / 100
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')
const clean = (s: unknown, max = 60) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
const total = (rows: Row[], type: string) => r2(rows.filter((t) => t.type === type).reduce((s, t) => s + Number(t.amount), 0))
const byKey = (rows: Row[], key: string) => {
  const m = new Map<string, number>()
  for (const t of rows) if (t.type === 'expense') { const k = clean(t[key] ?? 'none'); m.set(k, r2((m.get(k) ?? 0) + Number(t.amount))) }
  return m
}

export function buildContext(d: Data): string {
  const income = total(d.txns, 'income'), spent = total(d.txns, 'expense')
  const lines: string[] = [`Month: ${d.month}`, `Income received: ${inr(income)}`, `Spent: ${inr(spent)}`]
  if (income > 0) lines.push(`Kept: ${Math.round(((income - spent) / income) * 100)}% of income`)
  const cur = byKey(d.txns, 'category'), prev = byKey(d.prevTxns, 'category')
  const names = [...new Set([...cur.keys(), ...prev.keys()])].sort((a, b) => (cur.get(b) ?? 0) - (cur.get(a) ?? 0))
  lines.push('', 'Spending by category (this month, last month):')
  lines.push(...(names.length ? names.map((n) => `- ${n}: ${inr(cur.get(n) ?? 0)}, ${inr(prev.get(n) ?? 0)}`) : ['- none logged']))
  if (!d.budget) lines.push('', 'Budget: none set for this month.')
  else {
    const b = d.budget, bucket = byKey(d.txns, 'bucket')
    lines.push('', `Budget income ${inr(Number(b.income))}, split Needs ${b.needs_pct} / Wants ${b.wants_pct} / Savings ${b.savings_pct}`)
    for (const k of ['needs', 'wants', 'savings']) lines.push(`- ${k}: allocated ${inr((Number(b.income) * Number(b[`${k}_pct`])) / 100)}, spent ${inr(bucket.get(k) ?? 0)}`)
    lines.push('', 'Category limits (limit includes approved exceptions):')
    lines.push(...(d.cats.length ? d.cats.map((c) => {
      const extra = r2(d.overrides.filter((o) => o.status === 'approved' && o.category_name === c.name).reduce((s, o) => s + Number(o.amount), 0))
      const limit = r2(Number(c.limit_amount) + extra), s = cur.get(clean(c.name)) ?? 0
      return `- ${clean(c.name)} (${clean(c.bucket, 10)}): limit ${inr(limit)}, spent ${inr(s)}, ${s >= limit ? 'LOCKED' : `${inr(limit - s)} left`}`
    }) : ['- none']))
  }
  const goals = d.goals.filter((g) => g.status !== 'completed')
  lines.push('', 'Savings goals:')
  lines.push(...(goals.length ? goals.map((g) => `- ${clean(g.name, 80)}: ${inr(Number(g.saved_amount))} of ${inr(Number(g.target_amount))}${g.target_date ? `, target date ${clean(g.target_date, 10)}` : ''}`) : ['- none']))
  return lines.join('\n')
}
