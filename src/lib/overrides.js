import { supabase } from './supabase'
const must = ({ data, error }) => { if (error) throw error; return data }

export async function listOverrides(budgetId) {
  return must(await supabase.from('budget_override_requests').select('*').eq('budget_id', budgetId).order('created_at', { ascending: false }))
}
export async function requestOverride(budgetId, { category_name, amount, reason }) {
  return must(await supabase.from('budget_override_requests').insert({ budget_id: budgetId, category_name, amount, reason: reason || null }).select().single())
}
// status: 'approved' | 'rejected' | 'cancelled'. The database refuses changes to a decided request.
export async function decideOverride(id, status) {
  return must(await supabase.from('budget_override_requests').update({ status }).eq('id', id).select().single())
}
