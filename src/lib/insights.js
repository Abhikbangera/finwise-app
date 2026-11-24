import { getBudget } from './budgets'
import { listTransactions } from './transactions'
import { buildInsights, prevMonthKey } from './insightsMath'

export async function loadInsights(month) {
  const [budget, txns, prevTxns] = await Promise.all([getBudget(month), listTransactions(month), listTransactions(prevMonthKey(month))])
  return buildInsights({ txns, prevTxns, budget })
}
