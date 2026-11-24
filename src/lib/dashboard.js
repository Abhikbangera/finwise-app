import { supabase } from './supabase'
import { getBudget, listCategories } from './budgets'
import { listTransactions } from './transactions'
import { listOverrides } from './overrides'
import { listGoals } from './goals'
import { buildDashboard, lastMonths, monthKey, nextMonthStart } from './dashboardMath'

export async function loadDashboard() {
  const month = monthKey()
  const keys = lastMonths(6)
  const [budget, txns, goals, totals] = await Promise.all([
    getBudget(month), listTransactions(month), listGoals(),
    supabase.rpc('monthly_totals', { p_from: `${keys[0]}-01`, p_to: nextMonthStart(month) }),
  ])
  if (totals.error) throw totals.error
  const [cats, overrides] = budget ? await Promise.all([listCategories(budget.id), listOverrides(budget.id)]) : [[], []]
  return { month, ...buildDashboard({ budget, cats, txns, overrides, trendRows: totals.data ?? [], goals, keys }) }
}
