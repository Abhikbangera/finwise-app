import { supabase } from './supabase'
const must = ({ data, error }) => { if (error) throw error; return data }

export async function listGoals() {
  return must(await supabase.from('financial_goals').select('*').order('created_at', { ascending: false }))
}
export async function addGoal(g) {
  return must(await supabase.from('financial_goals').insert(g).select().single())
}
export async function updateGoal(id, patch) {
  return must(await supabase.from('financial_goals').update(patch).eq('id', id).select().single())
}
export async function deleteGoal(id) {
  const { error } = await supabase.from('financial_goals').delete().eq('id', id)
  if (error) throw error
}
// Add money to a goal and mark it completed when the target is reached.
export function contribute(goal, amount) {
  const saved = Math.round((Number(goal.saved_amount) + amount) * 100) / 100
  return updateGoal(goal.id, { saved_amount: saved, status: saved >= Number(goal.target_amount) ? 'completed' : 'active' })
}
