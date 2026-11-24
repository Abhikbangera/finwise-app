import { supabase } from './supabase'

// Rows already saved in the statement's date range, used to spot a statement imported twice.
export async function findExisting(minDate, maxDate) {
  const { data, error } = await supabase.from('transactions').select('txn_date,type,amount,description')
    .gte('txn_date', minDate).lte('txn_date', maxDate).limit(5000)
  if (error) throw error
  return data
}
// user_id is set by the database. Sent in batches to stay within request limits.
export async function insertTransactions(items, accountId) {
  const rows = items.map((t) => ({ txn_date: t.txn_date, type: t.type, amount: t.amount, description: t.description || null,
    category: t.category, bucket: t.type === 'expense' ? t.bucket : null, account_id: accountId || null, source: 'csv' }))
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('transactions').insert(rows.slice(i, i + 500))
    if (error) throw error
  }
  return rows.length
}
