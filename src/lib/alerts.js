import { supabase } from './supabase'
const must = ({ data, error }) => { if (error) throw error; return data }

export async function listAlerts(budgetId) {
  return must(await supabase.from('spending_alerts').select('*').eq('budget_id', budgetId).order('created_at', { ascending: false }).limit(50))
}
// Adds alerts that do not exist yet. The database allows one per budget + category + type.
export async function syncAlerts(budgetId, needed) {
  if (!needed.length) return
  const rows = needed.map((a) => ({ budget_id: budgetId, ...a }))
  const { error } = await supabase.from('spending_alerts').upsert(rows, { onConflict: 'budget_id,category_name,alert_type', ignoreDuplicates: true })
  if (error) throw error
}
export async function markAllRead(budgetId) {
  const { error } = await supabase.from('spending_alerts').update({ is_read: true }).eq('budget_id', budgetId).eq('is_read', false)
  if (error) throw error
}
