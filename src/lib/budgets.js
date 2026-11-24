import { supabase } from './supabase'
const must = ({ data, error }) => { if (error) throw error; return data }
const monthDate = (ym) => `${ym}-01`

export async function getProfile() {
  return must(await supabase.from('profiles').select('*').maybeSingle())
}
export async function getBudget(month) {
  return must(await supabase.from('budgets').select('*').eq('month', monthDate(month)).maybeSingle())
}
// values: { income, needs_pct, wants_pct, savings_pct }
export async function saveBudget(month, values, existingId) {
  const q = supabase.from('budgets')
  return must(existingId
    ? await q.update(values).eq('id', existingId).select().single()
    : await q.insert({ ...values, month: monthDate(month) }).select().single())
}
export async function listCategories(budgetId) {
  return must(await supabase.from('budget_categories').select('*').eq('budget_id', budgetId).order('created_at'))
}
export async function addCategory(budgetId, c) {
  return must(await supabase.from('budget_categories').insert({ budget_id: budgetId, ...c }).select().single())
}
export async function updateCategory(id, patch) {
  return must(await supabase.from('budget_categories').update(patch).eq('id', id).select().single())
}
export async function deleteCategory(id) {
  const { error } = await supabase.from('budget_categories').delete().eq('id', id)
  if (error) throw error
}
