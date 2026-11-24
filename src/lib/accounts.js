import { supabase } from './supabase'
const must = ({ data, error }) => { if (error) throw error; return data }

export const ACCOUNT_TYPES = [
  { value: 'savings', label: 'Savings account' }, { value: 'current', label: 'Current account' },
  { value: 'credit_card', label: 'Credit card' }, { value: 'wallet', label: 'Wallet' }, { value: 'cash', label: 'Cash' },
]
export async function listAccounts() {
  return must(await supabase.from('bank_accounts').select('*').order('created_at'))
}
export async function addAccount(a) {
  return must(await supabase.from('bank_accounts').insert(a).select().single())
}
export async function updateAccount(id, patch) {
  return must(await supabase.from('bank_accounts').update(patch).eq('id', id).select().single())
}
// Transactions stay; they just lose the link to this account (database rule from module 2).
export async function deleteAccount(id) {
  const { error } = await supabase.from('bank_accounts').delete().eq('id', id)
  if (error) throw error
}
