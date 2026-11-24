import { supabase } from './supabase'

export const BUCKETS = [
  { value: 'needs', label: 'Needs' },
  { value: 'wants', label: 'Wants' },
  { value: 'savings', label: 'Savings' },
]
export const CATEGORIES = ['Rent & Bills', 'Food & Dining', 'Shopping', 'Transport', 'Health', 'Entertainment', 'Goals & Savings', 'Salary', 'Other']

const nextMonthStart = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
}
const must = ({ data, error }) => { if (error) throw error; return data }

// user_id is filled in by the database (auth.uid()), so it is never sent from the browser.
export async function listTransactions(month /* 'YYYY-MM' */) {
  return must(await supabase.from('transactions').select('*')
    .gte('txn_date', `${month}-01`).lt('txn_date', nextMonthStart(month))
    .order('txn_date', { ascending: false }).order('created_at', { ascending: false }))
}
export async function addTransaction(t) {
  return must(await supabase.from('transactions').insert(t).select().single())
}
export async function updateTransaction(id, patch) {
  return must(await supabase.from('transactions').update(patch).eq('id', id).select().single())
}
export async function deleteTransaction(id) {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

// Monthly income and expenses, computed from the rows already loaded for that month.
export function summarize(rows) {
  const s = { income: 0, expense: 0, net: 0, byBucket: { needs: 0, wants: 0, savings: 0 } }
  for (const r of rows) {
    const a = Number(r.amount)
    if (r.type === 'income') s.income += a
    else { s.expense += a; if (r.bucket) s.byBucket[r.bucket] += a }
  }
  s.net = s.income - s.expense
  return s
}
